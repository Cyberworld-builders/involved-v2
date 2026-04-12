-- Add pdf_status_changed_at to track when pdf_status was last updated.
-- Used for staleness detection: if a job stays "queued" or "generating" too long,
-- the system can auto-recover it to "failed" so the user can retry.

ALTER TABLE report_data
ADD COLUMN IF NOT EXISTS pdf_status_changed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN report_data.pdf_status_changed_at IS 'Timestamp when pdf_status was last changed (for staleness detection)';

-- Backfill: set pdf_status_changed_at to updated_at for existing rows that have a status
UPDATE report_data
SET pdf_status_changed_at = updated_at
WHERE pdf_status IS NOT NULL AND pdf_status != 'not_requested';
