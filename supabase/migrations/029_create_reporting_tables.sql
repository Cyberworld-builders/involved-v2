-- Migration: 029_create_reporting_tables.sql
-- Phase 3: Feedback Management and Reporting System
-- Creates tables for feedback library, score caching, report data, templates, and geonorms

-- ============================================================================
-- 1. FEEDBACK LIBRARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_library (
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

-- Indexes for feedback_library
CREATE INDEX IF NOT EXISTS idx_feedback_assessment_dimension ON feedback_library(assessment_id, dimension_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_library(type);
CREATE INDEX IF NOT EXISTS idx_feedback_score_range ON feedback_library(min_score, max_score) WHERE min_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_assessment ON feedback_library(assessment_id);

-- Updated_at trigger for feedback_library
CREATE TRIGGER update_feedback_library_updated_at 
  BEFORE UPDATE ON feedback_library 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ASSIGNMENT DIMENSION SCORES TABLE (Score Cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assignment_dimension_scores (
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE CASCADE NOT NULL,
  avg_score DECIMAL(10, 2) NOT NULL,
  answer_count INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (assignment_id, dimension_id)
);

-- Indexes for assignment_dimension_scores
CREATE INDEX IF NOT EXISTS idx_dimension_scores_assignment ON assignment_dimension_scores(assignment_id);
CREATE INDEX IF NOT EXISTS idx_dimension_scores_dimension ON assignment_dimension_scores(dimension_id);
CREATE INDEX IF NOT EXISTS idx_dimension_scores_calculated ON assignment_dimension_scores(calculated_at);
CREATE INDEX IF NOT EXISTS idx_dimension_scores_assignment_dimension ON assignment_dimension_scores(assignment_id, dimension_id);

-- ============================================================================
-- 3. REPORT DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score DECIMAL(10, 2),
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- {dimension_id: {score, percentile, benchmark_comparison}}
  feedback_assigned JSONB DEFAULT '[]'::jsonb, -- Array of assigned feedback IDs
  geonorm_data JSONB, -- Group norm data for comparison (calculated on-demand)
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for report_data
CREATE INDEX IF NOT EXISTS idx_report_data_assignment ON report_data(assignment_id);
CREATE INDEX IF NOT EXISTS idx_report_data_calculated ON report_data(calculated_at);

-- Updated_at trigger for report_data
CREATE TRIGGER update_report_data_updated_at 
  BEFORE UPDATE ON report_data 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. REPORT TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_templates (
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

-- Indexes for report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_assessment ON report_templates(assessment_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_default ON report_templates(assessment_id, is_default) WHERE is_default = true;

-- Updated_at trigger for report_templates
CREATE TRIGGER update_report_templates_updated_at 
  BEFORE UPDATE ON report_templates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. GEONORMS TABLE (For on-demand calculation snapshots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS geonorms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE CASCADE NOT NULL,
  avg_score DECIMAL(10, 2) NOT NULL,
  participant_count INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, assessment_id, dimension_id)
);

-- Indexes for geonorms
CREATE INDEX IF NOT EXISTS idx_geonorms_group_assessment ON geonorms(group_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_geonorms_dimension ON geonorms(dimension_id);
CREATE INDEX IF NOT EXISTS idx_geonorms_group_assessment_dimension ON geonorms(group_id, assessment_id, dimension_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Feedback Library RLS
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

-- Assignment Dimension Scores RLS
ALTER TABLE assignment_dimension_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scores for their assignments" ON assignment_dimension_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments 
      JOIN profiles ON assignments.user_id = profiles.id
      WHERE assignments.id = assignment_dimension_scores.assignment_id
      AND profiles.auth_user_id = auth.uid()
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

-- Report Data RLS
ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report data" ON report_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments 
      JOIN profiles ON assignments.user_id = profiles.id
      WHERE assignments.id = report_data.assignment_id
      AND profiles.auth_user_id = auth.uid()
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

-- Report Templates RLS
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

-- GEOnorms RLS
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

-- ============================================================================
-- 7. SCORE CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate score for a single answer based on field type
CREATE OR REPLACE FUNCTION calculate_answer_score(
  p_field_type TEXT,
  p_answer_value TEXT,
  p_field_anchors JSONB
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_score DECIMAL(10, 2);
BEGIN
  IF p_field_type = 'multiple_choice' THEN
    -- Answer value is the index of the selected anchor (0, 1, 2, ...)
    -- Extract the numeric value from the anchor at that index
    BEGIN
      v_score := (p_field_anchors->(p_answer_value::integer)->>'value')::numeric;
    EXCEPTION WHEN OTHERS THEN
      -- If anchor doesn't exist or parsing fails, return 0
      v_score := 0;
    END;
  ELSIF p_field_type = 'slider' THEN
    -- Answer value is the slider position (numeric)
    v_score := p_answer_value::numeric;
  ELSE
    -- Text input or other types are not scored
    v_score := 0;
  END IF;
  
  RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Recursive function to calculate dimension score
CREATE OR REPLACE FUNCTION calculate_dimension_score(
  p_assignment_id UUID,
  p_dimension_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_avg_score DECIMAL(10, 2);
  v_child_count INTEGER;
BEGIN
  -- Check if dimension has children (parent dimension)
  SELECT COUNT(*) INTO v_child_count
  FROM dimensions
  WHERE parent_id = p_dimension_id;
  
  IF v_child_count > 0 THEN
    -- Parent dimension: average of child dimension scores
    SELECT AVG(calculate_dimension_score(p_assignment_id, d.id))
    INTO v_avg_score
    FROM dimensions d
    WHERE d.parent_id = p_dimension_id;
  ELSE
    -- Child dimension: calculate from answers
    SELECT AVG(
      calculate_answer_score(
        f.type,
        a.value,
        f.anchors
      )
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

-- ============================================================================
-- 8. TRIGGER FUNCTION: Auto-refresh dimension scores on answer changes
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
  
  -- Delete existing cached scores for this assignment
  DELETE FROM assignment_dimension_scores
  WHERE assignment_id = v_assignment_id;
  
  -- Recalculate and cache all dimension scores for this assignment
  INSERT INTO assignment_dimension_scores (assignment_id, dimension_id, avg_score, answer_count)
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
    )
  FROM dimensions d
  WHERE d.assessment_id = v_assessment_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on answers table
DROP TRIGGER IF EXISTS refresh_scores_on_answer_update ON answers;
CREATE TRIGGER refresh_scores_on_answer_update
AFTER INSERT OR UPDATE OR DELETE ON answers
FOR EACH ROW
EXECUTE FUNCTION refresh_dimension_scores();

-- Helper function to manually refresh scores for a specific assignment (for API use)
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
  
  -- Delete existing cached scores for this assignment
  DELETE FROM assignment_dimension_scores
  WHERE assignment_id = p_assignment_id;
  
  -- Recalculate and cache all dimension scores for this assignment
  INSERT INTO assignment_dimension_scores (assignment_id, dimension_id, avg_score, answer_count)
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
    )
  FROM dimensions d
  WHERE d.assessment_id = v_assessment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================

COMMENT ON TABLE feedback_library IS 'Stores feedback entries that can be assigned to users based on their assessment scores';
COMMENT ON TABLE assignment_dimension_scores IS 'Caches calculated dimension scores for performance optimization';
COMMENT ON TABLE report_data IS 'Stores pre-computed report data for fast report generation';
COMMENT ON TABLE report_templates IS 'Stores customizable report templates for assessments';
COMMENT ON TABLE geonorms IS 'Stores group norm data snapshots (calculated on-demand when generating reports)';

COMMENT ON FUNCTION calculate_answer_score IS 'Calculates score for a single answer based on field type and anchors';
COMMENT ON FUNCTION calculate_dimension_score IS 'Recursively calculates dimension score, handling parent/child dimension hierarchies';
COMMENT ON FUNCTION refresh_dimension_scores IS 'Trigger function that automatically refreshes cached dimension scores when answers change';
