-- Add required field to fields table
-- Controls whether each individual question is required

ALTER TABLE fields 
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN fields.required IS 'Whether this question is required (default: true)';
