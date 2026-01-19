-- Add dimension_question_counts column to assessments table
-- This stores a JSON object mapping dimension_id to the number of questions to select from that dimension
-- Format: { "dimension_id_1": 5, "dimension_id_2": 3, ... }
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS dimension_question_counts JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN assessments.dimension_question_counts IS 'For non-360 assessments: JSON object mapping dimension_id to number of questions to select from that dimension. Example: {"dim-123": 5, "dim-456": 3}. If empty or NULL, falls back to number_of_questions for random selection.';

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_assessments_dimension_question_counts ON assessments USING GIN (dimension_question_counts);
