-- Add group_id to assignments so multiple groups can rate the same 360 target.
-- Each assignment is tied to one group; report generation scopes by group_id.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON assignments(group_id);
