-- Change client_id foreign key constraint on profiles table to CASCADE delete
-- When a client is deleted, all associated profiles (users) will be automatically deleted

-- Drop the existing foreign key constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_client_id_fkey;

-- Recreate the foreign key constraint with CASCADE delete
ALTER TABLE profiles
  ADD CONSTRAINT profiles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON CONSTRAINT profiles_client_id_fkey ON profiles IS 'Cascade delete: when a client is deleted, all associated profiles are automatically deleted';
