-- Allow survey_snapshots to survive parent deletion via a "soft disconnect" pattern.
--
-- On client/survey/profile delete, capture (denormalize) the parent's identifying
-- fields into the snapshot row, then set the FK to NULL instead of cascading.
-- The snapshot row remains intact as a historical record, and the bucket file
-- (referenced by storage_path) is untouched.
--
-- Rationale: test clients get deleted, but aggregated historical data retains value.
-- Future admin page will surface orphaned snapshots.

-- 1. Denormalized context columns
ALTER TABLE survey_snapshots
  ADD COLUMN IF NOT EXISTS client_name_snapshot text,
  ADD COLUMN IF NOT EXISTS survey_name_snapshot text,
  ADD COLUMN IF NOT EXISTS created_by_name_snapshot text,
  ADD COLUMN IF NOT EXISTS created_by_email_snapshot text,
  ADD COLUMN IF NOT EXISTS client_deleted_at timestamptz;

COMMENT ON COLUMN survey_snapshots.client_name_snapshot IS 'Client name stamped via trigger when the parent client is deleted.';
COMMENT ON COLUMN survey_snapshots.survey_name_snapshot IS 'Survey name stamped via trigger when the parent survey is deleted.';
COMMENT ON COLUMN survey_snapshots.created_by_name_snapshot IS 'Creator profile name stamped via trigger when the profile is deleted.';
COMMENT ON COLUMN survey_snapshots.created_by_email_snapshot IS 'Creator profile email stamped via trigger when the profile is deleted.';
COMMENT ON COLUMN survey_snapshots.client_deleted_at IS 'Timestamp of parent client deletion; NULL while client still exists.';

-- 2. Drop NOT NULL so FKs can SET NULL on parent delete
ALTER TABLE survey_snapshots
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN created_by DROP NOT NULL;

-- 3. Replace FKs with ON DELETE SET NULL
--    survey_id previously CASCADE (created by migration 20260401000000).
--    client_id and created_by previously had no action (blocking).
ALTER TABLE survey_snapshots
  DROP CONSTRAINT IF EXISTS survey_snapshots_client_id_fkey;
ALTER TABLE survey_snapshots
  ADD CONSTRAINT survey_snapshots_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE survey_snapshots
  DROP CONSTRAINT IF EXISTS survey_snapshots_created_by_fkey;
ALTER TABLE survey_snapshots
  ADD CONSTRAINT survey_snapshots_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE survey_snapshots
  DROP CONSTRAINT IF EXISTS survey_snapshots_survey_id_fkey;
ALTER TABLE survey_snapshots
  ADD CONSTRAINT survey_snapshots_survey_id_fkey
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE SET NULL;

-- 4. Triggers: stamp parent metadata onto the snapshot BEFORE the FK is nulled.
--    COALESCE guards against overwriting a value that was somehow captured earlier.

CREATE OR REPLACE FUNCTION archive_snapshots_on_client_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_snapshots
  SET
    client_name_snapshot = COALESCE(client_name_snapshot, OLD.name),
    client_deleted_at = COALESCE(client_deleted_at, now())
  WHERE client_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archive_snapshots_on_client_delete ON clients;
CREATE TRIGGER trg_archive_snapshots_on_client_delete
  BEFORE DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION archive_snapshots_on_client_delete();

CREATE OR REPLACE FUNCTION archive_snapshots_on_survey_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_snapshots
  SET
    survey_name_snapshot = COALESCE(survey_name_snapshot, OLD.name)
  WHERE survey_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archive_snapshots_on_survey_delete ON surveys;
CREATE TRIGGER trg_archive_snapshots_on_survey_delete
  BEFORE DELETE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION archive_snapshots_on_survey_delete();

CREATE OR REPLACE FUNCTION archive_snapshots_on_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE survey_snapshots
  SET
    created_by_name_snapshot = COALESCE(created_by_name_snapshot, OLD.name),
    created_by_email_snapshot = COALESCE(created_by_email_snapshot, OLD.email)
  WHERE created_by = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archive_snapshots_on_profile_delete ON profiles;
CREATE TRIGGER trg_archive_snapshots_on_profile_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION archive_snapshots_on_profile_delete();

-- 5. Update RLS SELECT policy to let super admins see orphaned snapshots
--    (rows where client_id is NULL fall outside the client-scoped policy).
DROP POLICY IF EXISTS "Admins can view snapshots for their client" ON survey_snapshots;
CREATE POLICY "Admins can view snapshots for their client"
  ON survey_snapshots FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles
      WHERE auth_user_id = auth.uid()
        AND access_level IN ('client_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND access_level = 'super_admin'
    )
  );
