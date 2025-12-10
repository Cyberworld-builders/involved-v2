-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  custom_fields JSONB, -- For storing target name, email, role for 360 assessments
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  whitelabel BOOLEAN DEFAULT false,
  job_id UUID, -- Can reference jobs table if it exists
  url TEXT, -- Encrypted assignment URL (generated after creation)
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assessment_id ON assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_target_id ON assignments(target_id);
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON assignments(completed);
CREATE INDEX IF NOT EXISTS idx_assignments_expires ON assignments(expires);

-- Create updated_at trigger
CREATE TRIGGER update_assignments_updated_at 
  BEFORE UPDATE ON assignments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Assignments RLS policies
-- Users can view assignments for users in their clients
CREATE POLICY "Users can view assignments for their clients" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = assignments.user_id
      AND profiles.client_id IN (
        SELECT id FROM clients WHERE id = profiles.client_id
      )
    )
  );

-- Users can create assignments for users in their clients
CREATE POLICY "Users can create assignments for their clients" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = assignments.user_id
      AND profiles.client_id IN (
        SELECT id FROM clients WHERE id = profiles.client_id
      )
    )
  );

-- Users can update assignments for users in their clients
CREATE POLICY "Users can update assignments for their clients" ON assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = assignments.user_id
      AND profiles.client_id IN (
        SELECT id FROM clients WHERE id = profiles.client_id
      )
    )
  );

-- Users can delete assignments for users in their clients
CREATE POLICY "Users can delete assignments for their clients" ON assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = assignments.user_id
      AND profiles.client_id IN (
        SELECT id FROM clients WHERE id = profiles.client_id
      )
    )
  );

