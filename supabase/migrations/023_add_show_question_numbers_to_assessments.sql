-- Add show_question_numbers field to assessments table
-- Controls whether question numbers are displayed on the assessment

ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS show_question_numbers BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN assessments.show_question_numbers IS 'Whether to display question numbers on the assessment (default: true)';
