-- Enhance assessments table to match legacy functionality
-- Add custom_fields support for target user information
ALTER TABLE assessments 
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_custom_fields BOOLEAN DEFAULT false;

-- Enhance fields table to support all legacy question types and practice flag
-- Add practice flag and question number
ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS practice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS number INTEGER;

-- Drop the existing type constraint to allow all question types
ALTER TABLE fields DROP CONSTRAINT IF EXISTS fields_type_check;

-- Note: We're removing the strict type constraint to allow flexibility
-- The application layer will validate question types
-- This allows us to support both V2 types and legacy numeric types

-- Set number from order if number is null
DO $$
BEGIN
  UPDATE fields 
  SET number = "order" 
  WHERE number IS NULL;
END $$;

-- Create index for question numbers
CREATE INDEX IF NOT EXISTS idx_fields_assessment_number ON fields(assessment_id, number);

-- Add comments to document the type mapping
COMMENT ON COLUMN fields.type IS 'Question type: multiple_choice/1 (Multiple Choice), rich_text/2 (Description), text_input/3 (Text Input), slider/11 (Slider), or WM types (4-10)';
COMMENT ON COLUMN fields.practice IS 'Whether this is a practice question (not scored)';
COMMENT ON COLUMN fields.number IS 'Question number/sequence (legacy compatibility, matches order)';
COMMENT ON COLUMN assessments.custom_fields IS 'Custom fields for target user information (JSON: {tag: [], default: []})';
COMMENT ON COLUMN assessments.use_custom_fields IS 'Whether to use custom fields in the assessment';
