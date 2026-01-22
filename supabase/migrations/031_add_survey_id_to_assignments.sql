-- Add survey_id column to assignments table
-- This field groups assignments created together in the same batch/survey
-- Allows groups to be added to existing surveys later

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS survey_id UUID;

-- Create index for efficient querying by survey_id
CREATE INDEX IF NOT EXISTS idx_assignments_survey_id ON assignments(survey_id);

-- Add comment explaining the field
COMMENT ON COLUMN assignments.survey_id IS 'Groups assignments created together in the same survey batch. All assignments with the same survey_id and assessment_id belong to the same survey.';
