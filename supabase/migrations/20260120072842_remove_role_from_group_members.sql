-- Remove role column from group_members table
-- This column has been replaced by the position field which is used for rater relationships in 360 reports
-- The role field was originally intended for organizational purposes but is no longer needed

-- Drop the role column if it exists
ALTER TABLE group_members DROP COLUMN IF EXISTS role;
