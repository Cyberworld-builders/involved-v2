-- Update groups table to match legacy structure
-- Add target_id to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS target_id UUID;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'groups_target_id_fkey'
  ) THEN
    ALTER TABLE groups ADD CONSTRAINT groups_target_id_fkey 
    FOREIGN KEY (target_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update group_members to match legacy structure
-- Add position (text field for role/position in group)
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS position TEXT;

-- Add leader (boolean for leadership position)
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS leader BOOLEAN DEFAULT false;

-- Create index for target_id
CREATE INDEX IF NOT EXISTS idx_groups_target_id ON groups(target_id);

