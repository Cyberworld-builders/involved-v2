-- Add status field to profiles table
-- Status values: 'active', 'inactive', 'suspended'
ALTER TABLE profiles 
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Update existing profiles to have 'active' status
UPDATE profiles SET status = 'active' WHERE status IS NULL;
