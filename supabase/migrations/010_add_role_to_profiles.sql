-- Add role column to profiles table for user role management
ALTER TABLE profiles 
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'client', 'user'));

-- Create index for faster role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- Update existing profiles to have 'user' role if not set
UPDATE profiles SET role = 'user' WHERE role IS NULL;
