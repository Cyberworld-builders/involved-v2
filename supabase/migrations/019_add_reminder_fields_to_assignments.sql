-- Add reminder fields to assignments table
-- These fields enable scheduled email reminders for incomplete assignments

-- Add reminder boolean field
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS reminder BOOLEAN DEFAULT false;

-- Add reminder_frequency field (stores frequency string like "+1 week", "+2 weeks", etc.)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS reminder_frequency TEXT;

-- Add next_reminder timestamp (calculated from reminder_frequency when assignment is created)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS next_reminder TIMESTAMP WITH TIME ZONE;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_assignments_next_reminder ON assignments(next_reminder) 
  WHERE reminder = true AND completed = false AND next_reminder IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN assignments.reminder IS 'Whether email reminders are enabled for this assignment';
COMMENT ON COLUMN assignments.reminder_frequency IS 'Frequency string for reminders (e.g., "+1 week", "+2 weeks", "+3 weeks", "+1 month")';
COMMENT ON COLUMN assignments.next_reminder IS 'Timestamp for when the next reminder email should be sent. Calculated from reminder_frequency when assignment is created.';

