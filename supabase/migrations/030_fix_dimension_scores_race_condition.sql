-- Migration: 030_fix_dimension_scores_race_condition.sql
-- Fix race condition in refresh_dimension_scores trigger function
-- Use UPSERT instead of DELETE + INSERT to handle concurrent updates safely

-- ============================================================================
-- UPDATE TRIGGER FUNCTION: Use UPSERT to prevent race conditions
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dimension_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_assignment_id UUID;
  v_assessment_id UUID;
BEGIN
  -- Get assignment_id from the trigger
  v_assignment_id := COALESCE(NEW.assignment_id, OLD.assignment_id);
  
  -- Get assessment_id from the assignment
  SELECT assessment_id INTO v_assessment_id
  FROM assignments
  WHERE id = v_assignment_id;
  
  IF v_assessment_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Recalculate and cache all dimension scores for this assignment using UPSERT
  -- This prevents race conditions when multiple answers are saved concurrently
  INSERT INTO assignment_dimension_scores (assignment_id, dimension_id, avg_score, answer_count, calculated_at)
  SELECT 
    v_assignment_id,
    d.id,
    calculate_dimension_score(v_assignment_id, d.id),
    (
      SELECT COUNT(*)
      FROM answers a
      JOIN fields f ON a.field_id = f.id
      WHERE a.assignment_id = v_assignment_id
        AND f.dimension_id = d.id
        AND f.type IN ('multiple_choice', 'slider')
    ),
    NOW()
  FROM dimensions d
  WHERE d.assessment_id = v_assessment_id
  ON CONFLICT (assignment_id, dimension_id) 
  DO UPDATE SET
    avg_score = EXCLUDED.avg_score,
    answer_count = EXCLUDED.answer_count,
    calculated_at = EXCLUDED.calculated_at;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update helper function as well
CREATE OR REPLACE FUNCTION refresh_dimension_scores_for_assignment(
  p_assignment_id UUID
) RETURNS void AS $$
DECLARE
  v_assessment_id UUID;
BEGIN
  -- Get assessment_id from the assignment
  SELECT assessment_id INTO v_assessment_id
  FROM assignments
  WHERE id = p_assignment_id;
  
  IF v_assessment_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Recalculate and cache all dimension scores for this assignment using UPSERT
  INSERT INTO assignment_dimension_scores (assignment_id, dimension_id, avg_score, answer_count, calculated_at)
  SELECT 
    p_assignment_id,
    d.id,
    calculate_dimension_score(p_assignment_id, d.id),
    (
      SELECT COUNT(*)
      FROM answers a
      JOIN fields f ON a.field_id = f.id
      WHERE a.assignment_id = p_assignment_id
        AND f.dimension_id = d.id
        AND f.type IN ('multiple_choice', 'slider')
    ),
    NOW()
  FROM dimensions d
  WHERE d.assessment_id = v_assessment_id
  ON CONFLICT (assignment_id, dimension_id) 
  DO UPDATE SET
    avg_score = EXCLUDED.avg_score,
    answer_count = EXCLUDED.answer_count,
    calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;
