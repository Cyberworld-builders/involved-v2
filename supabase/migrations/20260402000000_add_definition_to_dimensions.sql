-- Add definition column to dimensions table (single source of truth)
-- Previously, definitions were stored as rich_text fields in the fields table

ALTER TABLE dimensions ADD COLUMN IF NOT EXISTS definition TEXT;

-- Add definition_display setting to assessments
-- Controls how dimension definitions render on the assessment-taking flow
-- 'none' = don't show (default — preserves existing behavior)
-- 'above' = show definition above each dimension's questions
-- 'below' = show definition below each dimension's questions
-- 'page' = show all definitions on a dedicated page before questions
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS definition_display TEXT DEFAULT 'none';

-- Backfill: copy definitions from rich_text fields into dimensions.definition
-- Only update where dimensions.definition is currently NULL
UPDATE dimensions d
SET definition = f.content
FROM fields f
WHERE f.dimension_id = d.id
  AND f.type = 'rich_text'
  AND f.content IS NOT NULL
  AND f.content != ''
  AND d.definition IS NULL;
