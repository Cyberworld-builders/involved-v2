# Report Generation Performance Analysis

## Executive Summary

This document analyzes how report generation works in the legacy system and ensures that our V2 schema changes (using `fields` instead of `questions`, `field_id` instead of `question_id`) will not create performance bottlenecks when computing reports. The analysis confirms that the schema changes are compatible, but identifies opportunities for performance improvements.

---

## 1. Legacy Report Generation Patterns

### 1.1 Core Data Flow

**Legacy System:**
```
answers.question_id → questions.id → questions.dimension_id → dimensions.id
```

**Key Operations:**
1. Get all answers for an assignment
2. Filter answers by dimension (via question lookup)
3. Calculate scores from answer values using question anchors
4. Aggregate scores by dimension
5. Calculate weighted averages across dimensions

### 1.2 Critical Code Patterns

#### Pattern 1: Filtering Answers by Dimension

**Legacy Code (ScoringController.php:171-174):**
```php
$answers = $assignment->answers()->get()->filter(function($answer) use ($dimension_id) {
    $question = Question::find($answer->question_id);
    return $question->dimension_id == $dimension_id;
});
```

**Performance Issue:** This creates an N+1 query problem:
- 1 query to get all answers
- N queries to look up each question (where N = number of answers)
- This is inefficient for assignments with many answers

#### Pattern 2: Score Calculation

**Legacy Code (Answer.php:66-74):**
```php
public function score()
{
    $anchors = $this->question->anchors;
    
    if (array_key_exists($this->value, $anchors))
        return $anchors[$this->value]['value'];
    
    return false;
}
```

**Key Dependency:** Answer scoring requires access to question anchors. The anchors are stored as serialized PHP arrays in the legacy system.

#### Pattern 3: Dimension Score Aggregation

**Legacy Code (ScoringController.php:147-189):**
```php
public function getScoreForDimension($assignment_id, $dimension_id)
{
    $assignment = Assignment::find($assignment_id);
    $dimension = Dimension::find($dimension_id);
    
    // Get child dimensions if parent
    $dimension_ids = [$dimension->id];
    if ($dimension->isParent()) {
        $dimension_ids = [];
        foreach ($dimension->getChildren() as $dimension) {
            array_push($dimension_ids, $dimension->id);
        }
    }
    
    // Filter answers by dimension (N+1 query problem)
    foreach ($dimension_ids as $i => $dimension_id) {
        $answers = $assignment->answers()->get()->filter(function($answer) use ($dimension_id) {
            $question = Question::find($answer->question_id);
            return $question->dimension_id == $dimension_id;
        });
        // ... aggregate scores
    }
}
```

---

## 2. V2 Schema Compatibility Analysis

### 2.1 Schema Mapping

| Legacy | V2 | Compatibility |
|--------|----|--------------|
| `answers.question_id` | `answers.field_id` | ✅ Direct mapping |
| `questions.id` | `fields.id` | ✅ Direct mapping |
| `questions.dimension_id` | `fields.dimension_id` | ✅ **Same relationship** |
| `questions.anchors` (serialized) | `fields.anchors` (JSONB) | ✅ **Better format** |
| `questions.type` | `fields.type` | ✅ Direct mapping |
| `questions.content` | `fields.content` | ✅ Direct mapping |

### 2.2 Relationship Structure

**Legacy:**
```
answers → questions → dimensions
```

**V2:**
```
answers → fields → dimensions
```

**Conclusion:** The relationship structure is **identical**. The only change is the table name (`questions` → `fields`).

### 2.3 Data Access Patterns

**Legacy Answer Scoring:**
- Accesses `$answer->question->anchors` (via Eloquent relationship)
- Anchors stored as serialized PHP array

**V2 Answer Scoring (Proposed):**
- Access `$answer->field->anchors` (via Supabase relationship)
- Anchors stored as JSONB (more efficient, queryable)

**Compatibility:** ✅ **Fully compatible** - same access pattern, better storage format

---

## 3. Performance Bottleneck Analysis

### 3.1 Current Legacy Bottlenecks

#### Bottleneck 1: N+1 Query Problem

**Problem:**
```php
// Gets all answers (1 query)
$answers = $assignment->answers()->get();

// Then for each answer, looks up the question (N queries)
->filter(function($answer) use ($dimension_id) {
    $question = Question::find($answer->question_id); // N+1 query!
    return $question->dimension_id == $dimension_id;
});
```

**Impact:**
- For an assignment with 50 answers, this creates 51 queries
- For a report generating scores for 100 users × 3 assessments = 15,300+ queries
- This is a significant performance bottleneck

#### Bottleneck 2: In-Memory Filtering

**Problem:**
- All answers are loaded into memory
- Filtering happens in PHP, not in the database
- Large datasets consume significant memory

#### Bottleneck 3: Repeated Dimension Lookups

**Problem:**
- Each `getScoreForDimension()` call repeats the same dimension lookups
- No caching of dimension hierarchies
- Parent/child relationships queried multiple times

### 3.2 V2 Optimization Opportunities

#### Optimization 1: SQL JOINs Instead of N+1 Queries

**V2 Approach (Recommended):**
```sql
-- Single query to get answers filtered by dimension
SELECT 
    answers.*,
    fields.anchors,
    fields.type
FROM answers
JOIN fields ON answers.field_id = fields.id
WHERE answers.assignment_id = $1
  AND fields.dimension_id = $2;
```

**Performance Gain:**
- 1 query instead of N+1 queries
- Database handles filtering (faster)
- Reduces network round trips

#### Optimization 2: Batch Dimension Queries

**V2 Approach (Recommended):**
```sql
-- Get all dimension scores in one query
SELECT 
    fields.dimension_id,
    AVG(
        CASE 
            WHEN fields.type = 'multiple_choice' 
            THEN (fields.anchors->answers.value->>'value')::numeric
            ELSE answers.value::numeric
        END
    ) as avg_score,
    COUNT(*) as answer_count
FROM answers
JOIN fields ON answers.field_id = fields.id
WHERE answers.assignment_id = $1
  AND fields.dimension_id IN ($2, $3, $4, ...) -- All dimensions at once
GROUP BY fields.dimension_id;
```

**Performance Gain:**
- Single query for all dimensions
- Database aggregation (faster than PHP)
- Reduces query count from O(n) to O(1)

#### Optimization 3: Materialized Views for Report Data

**V2 Approach (Future Enhancement):**
```sql
-- Pre-compute dimension scores
CREATE MATERIALIZED VIEW assignment_dimension_scores AS
SELECT 
    answers.assignment_id,
    fields.dimension_id,
    AVG(/* score calculation */) as avg_score,
    COUNT(*) as answer_count,
    MAX(answers.updated_at) as last_updated
FROM answers
JOIN fields ON answers.field_id = fields.id
WHERE fields.dimension_id IS NOT NULL
GROUP BY answers.assignment_id, fields.dimension_id;

-- Refresh periodically or on answer updates
CREATE INDEX ON assignment_dimension_scores(assignment_id, dimension_id);
```

**Performance Gain:**
- Pre-computed scores (instant retrieval)
- Only refresh when answers change
- Dramatically faster for reports

---

## 4. Answer Score Calculation Compatibility

### 4.1 Legacy Score Calculation

**Multiple Choice:**
```php
// Answer value is the index of the selected anchor
$value = $answer->value; // e.g., 2
$anchors = $this->question->anchors; // [{id: 0, value: 1}, {id: 1, value: 2}, ...]
return $anchors[$value]['value']; // Returns the numeric score
```

**Text Input:**
```php
// Answer value is the text itself (not scored)
return $this->value;
```

**Slider:**
```php
// Answer value is the slider value (already numeric)
return $this->value;
```

### 4.2 V2 Score Calculation (Proposed)

**Multiple Choice:**
```typescript
// Answer value is the index of the selected anchor
const value = answer.value; // e.g., "2"
const anchors = field.anchors; // JSONB: [{id: "0", value: 1}, {id: "1", value: 2}, ...]
const selectedAnchor = anchors[parseInt(value)];
return selectedAnchor?.value || 0;
```

**Text Input:**
```typescript
// Answer value is the text itself (not scored)
return answer.value; // Return as-is or parse if needed
```

**Slider:**
```typescript
// Answer value is the slider value (already numeric)
return parseFloat(answer.value);
```

**Compatibility:** ✅ **Fully compatible** - same logic, different syntax

### 4.3 SQL-Based Score Calculation (Optimized)

**V2 Approach (Recommended for Reports):**
```sql
-- Calculate scores directly in SQL
SELECT 
    answers.assignment_id,
    fields.dimension_id,
    CASE 
        WHEN fields.type = 'multiple_choice' THEN
            (fields.anchors->answers.value::text->>'value')::numeric
        WHEN fields.type = 'slider' THEN
            answers.value::numeric
        ELSE
            0 -- Text inputs not scored
    END as score
FROM answers
JOIN fields ON answers.field_id = fields.id
WHERE answers.assignment_id = $1;
```

**Performance Gain:**
- Database calculates scores (faster than application code)
- Single query for all scores
- Can aggregate directly in SQL

---

## 5. Dimension Hierarchy Compatibility

### 5.1 Legacy Dimension Structure

**Parent Dimensions:**
- Have `parent = 0` or `parent_id = NULL`
- Contain child dimensions

**Child Dimensions:**
- Have `parent_id` pointing to parent
- Questions belong to child dimensions
- Parent score = average of child dimension scores

### 5.2 V2 Dimension Structure

**Schema (from migration 004):**
```sql
CREATE TABLE dimensions (
  id UUID PRIMARY KEY,
  assessment_id UUID REFERENCES assessments(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id UUID REFERENCES dimensions(id), -- Same structure!
  ...
);
```

**Compatibility:** ✅ **Identical structure** - `parent_id` relationship preserved

### 5.3 Dimension Score Aggregation

**Legacy Pattern:**
```php
// Get child dimensions
$dimension_ids = [];
foreach ($dimension->getChildren() as $childDimension) {
    array_push($dimension_ids, $childDimension->id);
}

// Calculate average for each child, then average the averages
foreach ($dimension_ids as $dimension_id) {
    $scores += $this->getScoreAverageForDimension($assignment, $dimension_id);
}
return $scores / count($dimension_ids);
```

**V2 Pattern (Optimized):**
```sql
-- Get all child dimension scores in one query
WITH child_dimensions AS (
    SELECT id FROM dimensions WHERE parent_id = $dimension_id
),
dimension_scores AS (
    SELECT 
        fields.dimension_id,
        AVG(/* score calculation */) as avg_score
    FROM answers
    JOIN fields ON answers.field_id = fields.id
    WHERE answers.assignment_id = $assignment_id
      AND fields.dimension_id IN (SELECT id FROM child_dimensions)
    GROUP BY fields.dimension_id
)
SELECT AVG(avg_score) as parent_score
FROM dimension_scores;
```

**Performance Gain:**
- Single query instead of multiple queries
- Database handles aggregation
- More efficient for large datasets

---

## 6. Report Data Caching

### 6.1 Legacy Caching Strategy

**Legacy Code (ScoringController.php:39-48):**
```php
// Check if score is cached
$savedScore = DB::table('report_data')->where('assignment_id', $assignment->id)->first();

if ($savedScore && $savedScore->updated_at == $assignment->completed_at) {
    $score = json_decode($savedScore->score);
    return $score; // Use cached score
}

// Otherwise, calculate and cache
DB::table('report_data')->insert([
    'assignment_id' => $assignment->id,
    'score' => json_encode($score),
    'updated_at' => $assignment->completed_at
]);
```

**Limitations:**
- Only caches final score, not dimension scores
- Cache invalidation based on completion time
- Doesn't handle partial updates

### 6.2 V2 Caching Strategy (Recommended)

**Option 1: Cache Dimension Scores**
```sql
CREATE TABLE assignment_dimension_scores (
    assignment_id UUID REFERENCES assignments(id),
    dimension_id UUID REFERENCES dimensions(id),
    avg_score NUMERIC,
    answer_count INTEGER,
    last_calculated_at TIMESTAMP,
    PRIMARY KEY (assignment_id, dimension_id)
);

-- Refresh on answer update
CREATE OR REPLACE FUNCTION refresh_dimension_scores()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM assignment_dimension_scores 
    WHERE assignment_id = NEW.assignment_id;
    
    INSERT INTO assignment_dimension_scores
    SELECT 
        answers.assignment_id,
        fields.dimension_id,
        AVG(/* score calculation */),
        COUNT(*),
        NOW()
    FROM answers
    JOIN fields ON answers.field_id = fields.id
    WHERE answers.assignment_id = NEW.assignment_id
      AND fields.dimension_id IS NOT NULL
    GROUP BY answers.assignment_id, fields.dimension_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_scores_on_answer_update
AFTER INSERT OR UPDATE ON answers
FOR EACH ROW
EXECUTE FUNCTION refresh_dimension_scores();
```

**Benefits:**
- Automatic cache refresh on answer updates
- Granular caching (per dimension)
- Fast report generation (pre-computed scores)

**Option 2: Materialized View (PostgreSQL)**
```sql
CREATE MATERIALIZED VIEW assignment_scores AS
SELECT 
    answers.assignment_id,
    fields.dimension_id,
    AVG(/* score calculation */) as avg_score,
    COUNT(*) as answer_count
FROM answers
JOIN fields ON answers.field_id = fields.id
WHERE fields.dimension_id IS NOT NULL
GROUP BY answers.assignment_id, fields.dimension_id;

-- Refresh on demand or schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY assignment_scores;
```

**Benefits:**
- Automatic query optimization by PostgreSQL
- Can refresh concurrently (no locks)
- Very fast reads

---

## 7. Query Performance Comparison

### 7.1 Legacy Query Pattern (Inefficient)

**For a report with 100 users, 3 assessments, 30 questions each:**

```
1. Get all assignments: 1 query
2. For each assignment (300 total):
   - Get answers: 300 queries
   - For each answer, get question: 9,000 queries (30 × 300)
   - Filter by dimension: In-memory filtering
   - Calculate scores: PHP calculation
   
Total: ~9,301 queries + PHP processing
```

### 7.2 V2 Query Pattern (Optimized)

**Same report scenario:**

```sql
-- Single query to get all dimension scores
SELECT 
    a.assignment_id,
    f.dimension_id,
    AVG(/* score calculation */) as avg_score,
    COUNT(*) as answer_count
FROM answers a
JOIN fields f ON a.field_id = f.id
JOIN assignments ass ON a.assignment_id = ass.id
WHERE ass.user_id IN (/* 100 user IDs */)
  AND ass.assessment_id IN (/* 3 assessment IDs */)
  AND f.dimension_id IS NOT NULL
GROUP BY a.assignment_id, f.dimension_id;
```

**Total: 1 query + database aggregation**

**Performance Improvement:**
- **9,301 queries → 1 query** (99.99% reduction)
- Database aggregation (faster than PHP)
- Single network round trip

---

## 8. Recommendations

### 8.1 Immediate (Phase 1)

1. **Use SQL JOINs for Answer Filtering**
   - Replace N+1 queries with JOINs
   - Filter by dimension in SQL, not PHP

2. **Batch Dimension Queries**
   - Get all dimension scores in one query
   - Use SQL aggregation instead of PHP loops

3. **Index Optimization**
   ```sql
   -- Ensure these indexes exist
   CREATE INDEX idx_answers_assignment_field ON answers(assignment_id, field_id);
   CREATE INDEX idx_fields_dimension ON fields(dimension_id) WHERE dimension_id IS NOT NULL;
   CREATE INDEX idx_fields_assessment_dimension ON fields(assessment_id, dimension_id);
   ```

### 8.2 Short-term (Phase 2)

1. **Implement Dimension Score Caching**
   - Cache dimension scores per assignment
   - Auto-refresh on answer updates
   - Use triggers for automatic updates

2. **Optimize Score Calculation**
   - Calculate scores in SQL when possible
   - Use JSONB operators for anchor lookups
   - Batch process multiple assignments

### 8.3 Long-term (Phase 3)

1. **Materialized Views**
   - Pre-compute common report aggregations
   - Refresh on schedule or on-demand
   - Use for dashboard/report generation

2. **Report Data Table**
   - Store pre-computed report data
   - Include dimension scores, totals, percentiles
   - Refresh incrementally

---

## 9. Migration Considerations

### 9.1 Answer Score Calculation Migration

**Legacy:**
- `answer->score()` method accesses `$this->question->anchors`
- Anchors are serialized PHP arrays

**V2:**
- Need equivalent `answer->score()` method
- Access `answer.field.anchors` (JSONB)
- Parse JSONB to get anchor values

**Migration Path:**
1. Create helper function to calculate score from JSONB anchors
2. Test with legacy data (if migrating)
3. Ensure same numeric results

### 9.2 Query Migration

**Legacy PHP:**
```php
$answers = $assignment->answers()->get()->filter(function($answer) {
    return $answer->question->dimension_id == $dimension_id;
});
```

**V2 TypeScript/SQL:**
```typescript
const { data } = await supabase
  .from('answers')
  .select(`
    *,
    fields!inner(dimension_id, anchors, type)
  `)
  .eq('assignment_id', assignmentId)
  .eq('fields.dimension_id', dimensionId);
```

**Compatibility:** ✅ **Fully compatible** - same logic, better performance

---

## 10. Conclusion

### 10.1 Schema Compatibility

✅ **V2 schema changes are fully compatible with report generation:**
- `fields.dimension_id` relationship preserved
- `fields.anchors` (JSONB) is better than serialized PHP arrays
- Same data access patterns work in V2

### 10.2 Performance Impact

✅ **V2 schema enables significant performance improvements:**
- Can use SQL JOINs instead of N+1 queries
- Can batch dimension queries
- Can use database aggregation
- Can implement caching strategies

### 10.3 No Bottlenecks Introduced

✅ **No new bottlenecks created:**
- All legacy patterns can be replicated
- Better storage format (JSONB vs serialized)
- Better query capabilities (SQL vs PHP filtering)

### 10.4 Recommended Approach

1. **Start with optimized SQL queries** (Phase 1)
2. **Add dimension score caching** (Phase 2)
3. **Consider materialized views** (Phase 3)

**Expected Performance:**
- **10-100x faster** report generation
- **99% reduction** in database queries
- **Better scalability** for large datasets

---

## Appendix A: Example V2 Report Query

```sql
-- Get all dimension scores for a user's assignments
WITH user_assignments AS (
    SELECT id FROM assignments 
    WHERE user_id = $user_id AND completed = true
),
dimension_scores AS (
    SELECT 
        a.assignment_id,
        f.dimension_id,
        d.name as dimension_name,
        d.code as dimension_code,
        CASE 
            WHEN f.type = 'multiple_choice' THEN
                (f.anchors->a.value::text->>'value')::numeric
            WHEN f.type = 'slider' THEN
                a.value::numeric
            ELSE 0
        END as score
    FROM answers a
    JOIN fields f ON a.field_id = f.id
    JOIN dimensions d ON f.dimension_id = d.id
    WHERE a.assignment_id IN (SELECT id FROM user_assignments)
      AND f.dimension_id IS NOT NULL
)
SELECT 
    assignment_id,
    dimension_id,
    dimension_name,
    dimension_code,
    AVG(score) as avg_score,
    COUNT(*) as answer_count
FROM dimension_scores
GROUP BY assignment_id, dimension_id, dimension_name, dimension_code
ORDER BY dimension_code;
```

---

## Appendix B: Performance Benchmarks (Estimated)

| Operation | Legacy | V2 (Optimized) | Improvement |
|-----------|--------|----------------|-------------|
| Get dimension scores (1 assignment) | 31 queries | 1 query | 97% reduction |
| Generate report (100 users) | 9,301 queries | 1 query | 99.99% reduction |
| Calculate dimension average | PHP loop | SQL AVG() | 10-50x faster |
| Filter by dimension | In-memory | SQL WHERE | 5-10x faster |

---

**Document Status:** ✅ Ready for Implementation
**Last Updated:** 2025-01-XX
**Next Review:** After Phase 1 implementation

