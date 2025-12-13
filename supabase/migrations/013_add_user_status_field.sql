-- Add status field to profiles table
-- Status values: 'active', 'inactive', 'suspended'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT;

-- Keep the default consistent
ALTER TABLE profiles
ALTER COLUMN status SET DEFAULT 'active';

-- Ensure a stable constraint name
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_status_check
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Update existing profiles to have 'active' status
UPDATE profiles SET status = 'active' WHERE status IS NULL;
