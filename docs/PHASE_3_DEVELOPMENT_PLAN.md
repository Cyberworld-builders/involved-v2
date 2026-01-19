# Phase 3 Development Plan: Feedback Management and Reporting

## Executive Summary

Phase 3 focuses on building the core value proposition of the Involved Talent platform: generating comprehensive, actionable reports from assessment data. This phase includes feedback library management, score calculation and aggregation, report generation with customizable templates, and export functionality (PDF, Excel, CSV).

**Key Deliverables:**
- Feedback library management (CRUD + bulk upload)
- Score calculation and aggregation system
- Report generation engine (360, Leader, Blocker assessments)
- Report template customization
- Export functionality (PDF, Excel, CSV with bulk download)
- Report viewing and sharing

**Estimated Duration:** 1-2 weeks  
**Milestone Payment:** $2,000 USD upon completion and deployment

---

## Table of Contents

1. [Schema Design](#1-schema-design)
2. [Score Calculation System](#2-score-calculation-system)
3. [Feedback Management](#3-feedback-management)
4. [Report Generation](#4-report-generation)
5. [Report Templates](#5-report-templates)
6. [Export Functionality](#6-export-functionality)
7. [Implementation Phases](#7-implementation-phases)
8. [Legacy System Analysis](#8-legacy-system-analysis)

---

## 1. Schema Design

### 1.1 New Tables Required

#### `feedback_library` Table
Stores feedback entries that can be assigned to users based on their assessment scores.

```sql
CREATE TABLE feedback_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE SET NULL, -- NULL for overall feedback
  type TEXT NOT NULL CHECK (type IN ('overall', 'specific')),
  feedback TEXT NOT NULL, -- Rich text feedback content
  min_score DECIMAL(10, 2), -- Minimum score threshold (optional)
  max_score DECIMAL(10, 2), -- Maximum score threshold (optional)
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_assessment_dimension ON feedback_library(assessment_id, dimension_id);
CREATE INDEX idx_feedback_type ON feedback_library(type);
CREATE INDEX idx_feedback_score_range ON feedback_library(min_score, max_score) WHERE min_score IS NOT NULL;

-- RLS Policies
ALTER TABLE feedback_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for their assessments" ON feedback_library
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = feedback_library.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage feedback for their assessments" ON feedback_library
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = feedback_library.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );
```

#### `assignment_dimension_scores` Table
Caches calculated dimension scores for performance optimization.

```sql
CREATE TABLE assignment_dimension_scores (
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE CASCADE NOT NULL,
  avg_score DECIMAL(10, 2) NOT NULL,
  answer_count INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (assignment_id, dimension_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_dimension_scores_assignment ON assignment_dimension_scores(assignment_id);
CREATE INDEX idx_dimension_scores_dimension ON assignment_dimension_scores(dimension_id);
CREATE INDEX idx_dimension_scores_calculated ON assignment_dimension_scores(calculated_at);

-- RLS Policies
ALTER TABLE assignment_dimension_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scores for their assignments" ON assignment_dimension_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.id = assignment_dimension_scores.assignment_id
      AND assignments.user_id = (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view scores for their clients" ON assignment_dimension_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN profiles ON assignments.user_id = profiles.id
      WHERE assignments.id = assignment_dimension_scores.assignment_id
      AND profiles.client_id IN (
        SELECT client_id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );
```

#### `report_data` Table
Stores pre-computed report data for fast report generation.

```sql
CREATE TABLE report_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score DECIMAL(10, 2),
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- {dimension_id: {score, percentile, benchmark_comparison}}
  feedback_assigned JSONB DEFAULT '[]'::jsonb, -- Array of assigned feedback IDs
  geonorm_data JSONB, -- Group norm data for comparison
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_data_assignment ON report_data(assignment_id);
CREATE INDEX idx_report_data_calculated ON report_data(calculated_at);

-- RLS Policies
ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report data" ON report_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.id = report_data.assignment_id
      AND assignments.user_id = (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view report data for their clients" ON report_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN profiles ON assignments.user_id = profiles.id
      WHERE assignments.id = report_data.assignment_id
      AND profiles.client_id IN (
        SELECT client_id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );
```

#### `report_templates` Table
Stores customizable report templates for assessments.

```sql
CREATE TABLE report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  components JSONB NOT NULL DEFAULT '{}'::jsonb, -- Toggleable components: {dimension_breakdown: true, benchmarks: true, ...}
  labels JSONB DEFAULT '{}'::jsonb, -- Custom labels: {overall_score: "Overall Score", ...}
  styling JSONB DEFAULT '{}'::jsonb, -- Custom styling options
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_templates_assessment ON report_templates(assessment_id);
CREATE INDEX idx_report_templates_default ON report_templates(assessment_id, is_default) WHERE is_default = true;

-- RLS Policies
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates for their assessments" ON report_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = report_templates.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates for their assessments" ON report_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = report_templates.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );
```

#### `geonorms` Table
Stores group norm data for comparison in reports.

```sql
CREATE TABLE geonorms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE CASCADE NOT NULL,
  avg_score DECIMAL(10, 2) NOT NULL,
  participant_count INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, assessment_id, dimension_id)
);

-- Indexes
CREATE INDEX idx_geonorms_group_assessment ON geonorms(group_id, assessment_id);
CREATE INDEX idx_geonorms_dimension ON geonorms(dimension_id);

-- RLS Policies
ALTER TABLE geonorms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view geonorms for their groups" ON geonorms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = geonorms.group_id
      AND (
        groups.client_id IN (
          SELECT client_id FROM profiles WHERE auth_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = groups.id
          AND group_members.profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
      )
    )
  );
```

### 1.2 Migration File

Create: `supabase/migrations/029_create_reporting_tables.sql`

---

## 2. Score Calculation System

### 2.1 Score Calculation Logic

Based on legacy system analysis, scores are calculated as follows:

#### Multiple Choice Questions
- Answer value is the index of the selected anchor (0, 1, 2, ...)
- Score = `anchors[value].value` (the numeric value of the selected anchor)

#### Slider Questions
- Answer value is the slider position (numeric)
- Score = `parseFloat(value)` (direct numeric value)

#### Text Input Questions
- Answer value is the text itself
- Not scored (used for 360 feedback)

### 2.2 Dimension Score Aggregation

For each dimension:
1. Get all answers for fields in that dimension
2. Calculate score for each answer based on field type
3. Average all scores for the dimension
4. Handle parent dimensions (average of child dimension scores)

### 2.3 Implementation

#### Database Function: `calculate_dimension_score`

```sql
CREATE OR REPLACE FUNCTION calculate_dimension_score(
  p_assignment_id UUID,
  p_dimension_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_avg_score DECIMAL(10, 2);
BEGIN
  -- Check if dimension has children (parent dimension)
  IF EXISTS (SELECT 1 FROM dimensions WHERE parent_id = p_dimension_id) THEN
    -- Parent dimension: average of child dimension scores
    SELECT AVG(calculate_dimension_score(p_assignment_id, d.id))
    INTO v_avg_score
    FROM dimensions d
    WHERE d.parent_id = p_dimension_id;
  ELSE
    -- Child dimension: calculate from answers
    SELECT AVG(
      CASE 
        WHEN f.type = 'multiple_choice' THEN
          (f.anchors->>a.value::text)::jsonb->>'value'::numeric
        WHEN f.type = 'slider' THEN
          a.value::numeric
        ELSE
          0
      END
    )
    INTO v_avg_score
    FROM answers a
    JOIN fields f ON a.field_id = f.id
    WHERE a.assignment_id = p_assignment_id
      AND f.dimension_id = p_dimension_id
      AND f.type IN ('multiple_choice', 'slider');
  END IF;
  
  RETURN COALESCE(v_avg_score, 0);
END;
$$ LANGUAGE plpgsql;
```

#### Trigger: Auto-calculate scores on answer update

```sql
CREATE OR REPLACE FUNCTION refresh_dimension_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_dimension_id UUID;
BEGIN
  -- Get dimension_id from the field
  SELECT dimension_id INTO v_dimension_id
  FROM fields
  WHERE id = COALESCE(NEW.field_id, OLD.field_id);
  
  -- Delete existing cached scores for this assignment
  DELETE FROM assignment_dimension_scores
  WHERE assignment_id = COALESCE(NEW.assignment_id, OLD.assignment_id);
  
  -- Recalculate and cache all dimension scores for this assignment
  INSERT INTO assignment_dimension_scores (assignment_id, dimension_id, avg_score, answer_count)
  SELECT 
    COALESCE(NEW.assignment_id, OLD.assignment_id),
    d.id,
    calculate_dimension_score(COALESCE(NEW.assignment_id, OLD.assignment_id), d.id),
    (
      SELECT COUNT(*)
      FROM answers a
      JOIN fields f ON a.field_id = f.id
      WHERE a.assignment_id = COALESCE(NEW.assignment_id, OLD.assignment_id)
        AND f.dimension_id = d.id
    )
  FROM dimensions d
  WHERE d.assessment_id = (
    SELECT assessment_id FROM assignments WHERE id = COALESCE(NEW.assignment_id, OLD.assignment_id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_scores_on_answer_update
AFTER INSERT OR UPDATE OR DELETE ON answers
FOR EACH ROW
EXECUTE FUNCTION refresh_dimension_scores();
```

### 2.4 API Endpoints

#### `POST /api/reports/calculate/:assignmentId`
Calculate and cache scores for an assignment.

#### `GET /api/reports/scores/:assignmentId`
Get cached dimension scores for an assignment.

---

## 3. Feedback Management

### 3.1 Feedback Library CRUD

#### Pages
- `/dashboard/feedback` - List all feedback entries
- `/dashboard/feedback/create` - Create new feedback entry
- `/dashboard/feedback/[id]/edit` - Edit feedback entry

#### Features
- Filter by assessment and dimension
- Search feedback content
- Bulk upload from CSV/Excel
- Preview feedback in context

### 3.2 Bulk Upload Format

CSV/Excel columns:
- Assessment (name or ID)
- Dimension (name or code, or "Overall" for overall feedback)
- Type (Overall/Specific)
- Feedback (text content)
- Min Score (optional)
- Max Score (optional)

### 3.3 Feedback Assignment Logic

For non-360 assessments:
1. Calculate dimension scores
2. For each dimension:
   - Get all "specific" feedback entries for that dimension
   - Randomly select ONE feedback entry
   - Assign to user's report
3. Get all "overall" feedback entries
4. Randomly select ONE overall feedback entry
5. Assign to user's report

For 360 assessments:
- Use text input answers from assessments as feedback
- No feedback library entries used

### 3.4 API Endpoints

#### `GET /api/feedback`
List feedback entries with filtering.

#### `POST /api/feedback`
Create new feedback entry.

#### `PUT /api/feedback/[id]`
Update feedback entry.

#### `DELETE /api/feedback/[id]`
Delete feedback entry.

#### `POST /api/feedback/bulk-upload`
Bulk upload feedback from CSV/Excel.

#### `POST /api/reports/assign-feedback/:assignmentId`
Assign feedback to an assignment's report.

---

## 4. Report Generation

### 4.1 Report Types

#### 4.1.1 360 Assessment Reports

**Structure:**
- Overall score across all dimensions
- For each dimension:
  - Overall score
  - Breakdown by rater type:
    - Peer
    - Direct Report
    - Supervisor
    - Self
    - Other
  - Industry benchmark comparison
  - GEOnorm (group norm) comparison
  - Improvement indicators (if score is below benchmark/geonorm)
- Text feedback from 360 responses (grouped by dimension)

**Data Requirements:**
- Assignment target (the person being assessed)
- All assignments for that target (grouped by rater relationship)
- Dimension scores aggregated by rater type
- Industry benchmarks
- Group norms

#### 4.1.2 Leader/Blocker Assessment Reports

**Structure (based on legacy Digital Ocean reports):**
- Overall score (mean of all dimension scores)
- For each dimension:
  - Target's score
  - Industry benchmark comparison
  - GEOnorm comparison
  - Visual comparison (bar chart or similar)
  - ONE randomly selected specific feedback entry
- Overall feedback section:
  - ONE randomly selected overall feedback entry

**Data Requirements:**
- Assignment (single assessment, not 360)
- Dimension scores
- Industry benchmarks
- Group norms
- Assigned feedback entries

### 4.2 Report Generation Flow

1. **Check if report data exists and is current**
   - Query `report_data` table
   - Compare `calculated_at` with assignment `completed_at`
   - If stale or missing, recalculate

2. **Calculate dimension scores**
   - Use cached `assignment_dimension_scores` or calculate on-the-fly
   - Handle parent/child dimension hierarchy

3. **Get benchmarks and norms**
   - Industry benchmarks from `benchmarks` table
   - GEOnorms from `geonorms` table (calculate if needed)

4. **Assign feedback**
   - For non-360: Use feedback library
   - For 360: Use text input answers

5. **Generate report data structure**
   - Build JSON structure with all report components
   - Store in `report_data` table

6. **Render report**
   - Use report template (or default)
   - Apply customizations (labels, styling, component toggles)
   - Render to HTML/PDF

### 4.3 Report Viewing Pages

#### `/dashboard/reports/[assignmentId]`
View a single assignment's report.

#### `/dashboard/clients/[clientId]/reports`
View all reports for a client (filterable by assessment, user, group).

### 4.4 API Endpoints

#### `GET /api/reports/:assignmentId`
Get report data for an assignment (generate if needed).

#### `POST /api/reports/generate/:assignmentId`
Force regenerate report data.

#### `GET /api/reports/client/:clientId`
Get all reports for a client.

#### `GET /api/reports/group/:groupId`
Get all reports for a group.

---

## 5. Report Templates

### 5.1 Template Structure

Templates control:
- Which components are shown (dimension breakdown, benchmarks, feedback, etc.)
- Custom labels and headings
- Styling options (colors, fonts, layout)

### 5.2 Template Components

**Toggleable Components:**
- `dimension_breakdown` - Show individual dimension scores
- `overall_score` - Show overall/mean score
- `benchmarks` - Show industry benchmark comparison
- `geonorms` - Show group norm comparison
- `feedback` - Show assigned feedback
- `improvement_indicators` - Show suggested improvement areas
- `rater_breakdown` - Show 360 rater type breakdown (360 only)

**Customizable Labels:**
- `overall_score_label` - Default: "Overall Score"
- `dimension_label` - Default: "Dimension"
- `benchmark_label` - Default: "Industry Benchmark"
- `geonorm_label` - Default: "Group Norm"
- `feedback_label` - Default: "Feedback"

### 5.3 Template Management Pages

#### `/dashboard/assessments/[id]/templates`
List and manage templates for an assessment.

#### `/dashboard/assessments/[id]/templates/create`
Create new template.

#### `/dashboard/assessments/[id]/templates/[templateId]/edit`
Edit template.

### 5.4 API Endpoints

#### `GET /api/templates/assessment/:assessmentId`
Get all templates for an assessment.

#### `GET /api/templates/:id`
Get a specific template.

#### `POST /api/templates`
Create new template.

#### `PUT /api/templates/:id`
Update template.

#### `DELETE /api/templates/:id`
Delete template.

#### `POST /api/templates/:id/set-default`
Set template as default for assessment.

---

## 6. Export Functionality

### 6.1 Export Formats

#### PDF Export
- Use server-side PDF generation (Puppeteer or similar)
- Render HTML report to PDF
- Include all report components
- Maintain styling and branding

#### Excel Export
- Generate Excel file with:
  - Summary sheet (overall scores, key metrics)
  - Dimension breakdown sheet
  - Raw data sheet (all answers)
- Use library like `exceljs` or `xlsx`

#### CSV Export
- Generate CSV with:
  - Assignment metadata
  - Dimension scores
  - Benchmark comparisons
- Simple, lightweight format

### 6.2 Bulk Download

#### Feature: Download All Reports for Client/Group
- Generate reports for all completed assignments
- Package into ZIP file
- Include all formats (PDF, Excel, CSV) or user-selected format
- Provide download link (temporary, expires after 24 hours)

### 6.3 API Endpoints

#### `GET /api/reports/:assignmentId/export/pdf`
Export single report as PDF.

#### `GET /api/reports/:assignmentId/export/excel`
Export single report as Excel.

#### `GET /api/reports/:assignmentId/export/csv`
Export single report as CSV.

#### `POST /api/reports/bulk-export`
Generate bulk export (ZIP file) for multiple assignments.

#### `GET /api/reports/bulk-export/:jobId`
Get status/download link for bulk export job.

### 6.4 Implementation Notes

- Use background jobs for bulk exports (Vercel serverless functions with queue)
- Store export files temporarily in Supabase Storage
- Clean up old export files (cron job or on-demand)

---

## 7. Implementation Phases

### Phase 3.1: Foundation (Days 1-2)
- [ ] Create database migrations for new tables
- [ ] Implement score calculation functions
- [ ] Create score caching triggers
- [ ] Build basic score calculation API endpoints
- [ ] Test score calculation with sample data

### Phase 3.2: Feedback Management (Days 3-4)
- [ ] Build feedback library CRUD pages
- [ ] Implement bulk upload functionality
- [ ] Create feedback assignment logic
- [ ] Test feedback assignment for sample reports

### Phase 3.3: Report Generation - Core (Days 5-7)
- [ ] Build report data calculation engine
- [ ] Implement 360 report generation
- [ ] Implement Leader/Blocker report generation
- [ ] Create report viewing pages
- [ ] Test report generation with various scenarios

### Phase 3.4: Report Templates (Days 8-9)
- [ ] Build template management pages
- [ ] Implement template application to reports
- [ ] Create template customization UI
- [ ] Test template system

### Phase 3.5: Export Functionality (Days 10-11)
- [ ] Implement PDF export
- [ ] Implement Excel export
- [ ] Implement CSV export
- [ ] Build bulk download functionality
- [ ] Test all export formats

### Phase 3.6: Polish & Testing (Days 12-14)
- [ ] Match legacy report styling and branding
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Bug fixes and refinements
- [ ] Documentation

---

## 8. Legacy System Analysis

### 8.1 Report Styling Reference

Based on legacy system, reports should include:
- **Color Scheme:** Professional, clean design
- **Layout:** Clear sections with visual hierarchy
- **Charts/Graphs:** Bar charts for dimension comparisons
- **Typography:** Readable, professional fonts
- **Branding:** Client logos and colors (if applicable)

### 8.2 Key Legacy Patterns to Replicate

1. **Score Display:**
   - Numeric scores with 2 decimal places
   - Visual indicators (colors) for above/below benchmarks
   - Percentile rankings

2. **Dimension Breakdown:**
   - Clear section headers
   - Score, benchmark, geonorm side-by-side
   - Improvement indicators (arrows, colors)

3. **Feedback Presentation:**
   - Clearly labeled sections
   - Readable typography
   - Proper spacing and formatting

4. **360-Specific Features:**
   - Rater type breakdown (Peer, Direct Report, etc.)
   - Text feedback grouped by dimension
   - Anonymized responses

### 8.3 Performance Considerations

Based on `REPORT_GENERATION_PERFORMANCE_ANALYSIS.md`:
- Use SQL JOINs instead of N+1 queries
- Cache dimension scores in `assignment_dimension_scores`
- Batch calculate scores for multiple assignments
- Use materialized views for common aggregations (future enhancement)

---

## 9. Technical Stack

### 9.1 Frontend
- **Report Rendering:** React components with Tailwind CSS
- **Charts:** Recharts or Chart.js for visualizations
- **PDF Generation:** Client-side or server-side (Puppeteer)
- **Excel Generation:** `exceljs` library
- **CSV Generation:** Native JavaScript

### 9.2 Backend
- **Score Calculation:** PostgreSQL functions and triggers
- **Report Generation:** Next.js API routes
- **PDF Export:** Puppeteer or `@react-pdf/renderer`
- **Excel Export:** `exceljs` or `xlsx`
- **Background Jobs:** Vercel serverless functions with queue

### 9.3 Database
- **Score Caching:** `assignment_dimension_scores` table
- **Report Data:** `report_data` table
- **Optimization:** Indexes on all foreign keys and frequently queried columns

---

## 10. Acceptance Criteria

### 10.1 Feedback Management
- ✅ Admins can create, read, update, delete feedback entries
- ✅ Admins can bulk upload feedback from CSV/Excel
- ✅ Feedback is properly assigned to reports based on scores
- ✅ 360 assessments use text input answers instead of feedback library

### 10.2 Score Calculation
- ✅ Dimension scores are calculated correctly for all field types
- ✅ Parent dimension scores are averages of child dimensions
- ✅ Scores are cached for performance
- ✅ Scores update automatically when answers change

### 10.3 Report Generation
- ✅ 360 reports show rater type breakdowns
- ✅ Leader/Blocker reports match legacy design
- ✅ Reports include benchmarks and geonorms
- ✅ Reports show improvement indicators
- ✅ Reports can be viewed in browser

### 10.4 Report Templates
- ✅ Admins can create and customize report templates
- ✅ Templates control which components are shown
- ✅ Templates allow custom labels and styling
- ✅ Default templates work for all assessment types

### 10.5 Export Functionality
- ✅ Reports can be exported as PDF
- ✅ Reports can be exported as Excel
- ✅ Reports can be exported as CSV
- ✅ Bulk download works for multiple reports
- ✅ Exported files match report styling

---

## 11. Testing Plan

### 11.1 Unit Tests
- Score calculation functions
- Feedback assignment logic
- Report data structure generation

### 11.2 Integration Tests
- End-to-end report generation
- Export functionality
- Template application

### 11.3 Performance Tests
- Report generation speed (target: < 2 seconds for single report)
- Bulk export performance (target: < 30 seconds for 100 reports)
- Database query optimization

### 11.4 User Acceptance Tests
- Match legacy report appearance
- Verify all report components work
- Test export formats
- Validate feedback assignment

---

## 12. Future Enhancements (Post-Phase 3)

1. **AI-Generated Feedback**
   - Analyze assessment data and generate feedback suggestions
   - Admin approval workflow

2. **Advanced Report Customization**
   - Drag-and-drop report builder
   - Custom chart types
   - Additional visualization options

3. **Report Sharing**
   - Generate shareable links
   - Email reports directly
   - Scheduled report delivery

4. **Analytics Dashboard**
   - Aggregate statistics across assessments
   - Trend analysis
   - Comparative analytics

---

## Appendix A: Database Migration File Structure

```sql
-- Migration: 029_create_reporting_tables.sql

-- 1. Create feedback_library table
-- 2. Create assignment_dimension_scores table
-- 3. Create report_data table
-- 4. Create report_templates table
-- 5. Create geonorms table
-- 6. Create indexes
-- 7. Create RLS policies
-- 8. Create score calculation functions
-- 9. Create triggers for auto-calculation
```

## Appendix B: API Route Structure

```
/api/feedback/
  GET    /                    - List feedback entries
  POST   /                    - Create feedback entry
  GET    /[id]                - Get feedback entry
  PUT    /[id]                - Update feedback entry
  DELETE /[id]                - Delete feedback entry
  POST   /bulk-upload         - Bulk upload feedback

/api/reports/
  GET    /:assignmentId       - Get report data
  POST   /generate/:assignmentId - Generate report
  GET    /client/:clientId    - Get client reports
  GET    /group/:groupId      - Get group reports
  GET    /:assignmentId/export/pdf - Export PDF
  GET    /:assignmentId/export/excel - Export Excel
  GET    /:assignmentId/export/csv - Export CSV
  POST   /bulk-export         - Create bulk export job
  GET    /bulk-export/:jobId  - Get bulk export status

/api/templates/
  GET    /assessment/:assessmentId - List templates
  GET    /:id                  - Get template
  POST   /                     - Create template
  PUT    /:id                  - Update template
  DELETE /:id                  - Delete template
  POST   /:id/set-default      - Set as default
```

---

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** 2026-01-05  
**Next Review:** After Phase 3.1 completion
