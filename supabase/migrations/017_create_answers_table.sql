-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL, -- Answer value (can be JSON for complex types, or numeric string for multiple choice/slider)
  time INTEGER, -- Response time in seconds (nullable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance (critical for report generation)
CREATE INDEX IF NOT EXISTS idx_answers_assignment_id ON answers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_answers_field_id ON answers(field_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_assignment_field ON answers(assignment_id, field_id); -- For unique constraint and fast lookups
CREATE INDEX IF NOT EXISTS idx_answers_assignment_dimension ON answers(assignment_id, field_id); -- Will be used with JOIN to fields for dimension filtering

-- Unique constraint: one answer per question per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_assignment_field_unique ON answers(assignment_id, field_id);

-- Composite index for report generation (answers + fields JOIN on dimension_id)
-- This will be used with: SELECT ... FROM answers JOIN fields ON answers.field_id = fields.id WHERE fields.dimension_id = ?
-- The index on fields.dimension_id already exists from migration 004

-- Create updated_at trigger
CREATE TRIGGER update_answers_updated_at 
  BEFORE UPDATE ON answers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Answers RLS policies
-- Users can view answers for their own assignments
CREATE POLICY "Users can view their own answers" ON answers
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create/update answers for their own assignments
CREATE POLICY "Users can manage their own answers" ON answers
  FOR ALL USING (auth.uid() = user_id);

-- Admins can view answers for assignments in their clients
CREATE POLICY "Admins can view answers for their clients" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN profiles ON assignments.user_id = profiles.id
      WHERE assignments.id = answers.assignment_id
      AND profiles.client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Note: Additional admin policies can be added based on business logic
-- For now, admins can view answers through the client relationship policy above
