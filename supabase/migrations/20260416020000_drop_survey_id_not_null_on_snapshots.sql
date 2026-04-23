-- The soft-disconnect pattern needs survey_snapshots.survey_id to be nullable
-- so the survey delete trigger can null it while stamping survey_name_snapshot.
-- Earlier migration dropped NOT NULL on client_id and created_by but missed survey_id.

ALTER TABLE survey_snapshots
  ALTER COLUMN survey_id DROP NOT NULL;
