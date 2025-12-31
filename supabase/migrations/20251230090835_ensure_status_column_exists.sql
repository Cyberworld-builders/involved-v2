-- Ensure status column exists in profiles table
-- This migration is idempotent and safe to run multiple times
-- Migration 013 was marked as applied but the column may not exist

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN status TEXT;
    END IF;
END $$;

-- Set default value
ALTER TABLE profiles
ALTER COLUMN status SET DEFAULT 'active';

-- Drop constraint if exists (in case it was partially applied)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_status_check
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Update existing profiles to have 'active' status
UPDATE profiles SET status = 'active' WHERE status IS NULL;
