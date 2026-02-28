-- Add sort_order column to dimensions table for explicit ordering
-- Previously dimensions were sorted alphabetically by name, which didn't match
-- the order configured in the assessment editor's drag-and-drop UI.

ALTER TABLE dimensions ADD COLUMN sort_order INTEGER DEFAULT 0;

CREATE INDEX idx_dimensions_sort_order ON dimensions(assessment_id, sort_order);

-- Backfill: set sort_order based on current alphabetical ordering
-- so existing reports don't change order unexpectedly
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY assessment_id ORDER BY name ASC) as rn
  FROM dimensions
)
UPDATE dimensions SET sort_order = ordered.rn FROM ordered WHERE dimensions.id = ordered.id;
