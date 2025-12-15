-- Add access_level column to profiles for permission boundaries (separate from group member roles)
-- access_level values:
-- - member: can manage only self
-- - client_admin: can manage anything within their client scope
-- - super_admin: can manage anything system-wide

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS access_level TEXT;

-- Add (or replace) check constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_access_level_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_access_level_check
CHECK (access_level IN ('member', 'client_admin', 'super_admin'));

-- Backfill from legacy role column if access_level is null
UPDATE profiles
SET access_level = CASE
  WHEN role = 'admin' THEN 'super_admin'
  WHEN role IN ('manager', 'client') THEN 'client_admin'
  ELSE 'member'
END
WHERE access_level IS NULL;

-- Default to member going forward
ALTER TABLE profiles
ALTER COLUMN access_level SET DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON profiles(access_level);


