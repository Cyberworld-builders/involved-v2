-- Add PDF storage and status tracking columns to report_data table
-- This enables pre-generated PDFs stored in Supabase Storage with explicit status tracking

-- Create enum type for PDF status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pdf_status_enum') THEN
    CREATE TYPE pdf_status_enum AS ENUM (
      'not_requested',
      'queued',
      'generating',
      'ready',
      'failed'
    );
  END IF;
END $$;

-- Add PDF-related columns to report_data
ALTER TABLE report_data
ADD COLUMN IF NOT EXISTS pdf_status pdf_status_enum DEFAULT 'not_requested',
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pdf_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS pdf_last_error TEXT,
ADD COLUMN IF NOT EXISTS pdf_job_id UUID;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_report_data_pdf_status 
ON report_data(pdf_status) 
WHERE pdf_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_data_pdf_path 
ON report_data(pdf_storage_path) 
WHERE pdf_storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_data_pdf_job_id 
ON report_data(pdf_job_id) 
WHERE pdf_job_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN report_data.pdf_status IS 'Current status of PDF generation: not_requested, queued, generating, ready, or failed';
COMMENT ON COLUMN report_data.pdf_storage_path IS 'Storage path in reports-pdf bucket (format: {assignment_id}/v{version}.pdf)';
COMMENT ON COLUMN report_data.pdf_generated_at IS 'Timestamp when PDF was successfully generated';
COMMENT ON COLUMN report_data.pdf_version IS 'Version number for PDF (incremented on regeneration)';
COMMENT ON COLUMN report_data.pdf_last_error IS 'Error message if PDF generation failed';
COMMENT ON COLUMN report_data.pdf_job_id IS 'UUID for tracking PDF generation job (useful for debugging and idempotency)';
