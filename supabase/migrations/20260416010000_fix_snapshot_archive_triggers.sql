-- Fix: archive triggers now explicitly null their respective FKs in the same
-- UPDATE that captures the denormalized fields. Previously, the trigger only
-- wrote denorm columns and relied on ON DELETE SET NULL to clear the FK afterward.
-- That ordering caused FK re-validation to race with the parent deletion, failing with
-- "Key (client_id)=(…) is not present in table clients".
--
-- By nulling the FK inside the trigger's UPDATE, Postgres doesn't need to re-validate
-- against the parent row that is in the process of being deleted.

CREATE OR REPLACE FUNCTION archive_snapshots_on_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_snapshots
  SET
    client_name_snapshot = COALESCE(client_name_snapshot, OLD.name),
    client_deleted_at = COALESCE(client_deleted_at, now()),
    client_id = NULL
  WHERE client_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION archive_snapshots_on_survey_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_snapshots
  SET
    survey_name_snapshot = COALESCE(survey_name_snapshot, OLD.name),
    survey_id = NULL
  WHERE survey_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION archive_snapshots_on_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_snapshots
  SET
    created_by_name_snapshot = COALESCE(created_by_name_snapshot, OLD.name),
    created_by_email_snapshot = COALESCE(created_by_email_snapshot, OLD.email),
    created_by = NULL
  WHERE created_by = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
