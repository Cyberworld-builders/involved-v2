-- Add number_of_questions column to assessments table
-- This specifies how many questions to randomly select for non-360 assessments
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS number_of_questions INTEGER DEFAULT NULL;

COMMENT ON COLUMN assessments.number_of_questions IS 'For non-360 assessments: number of questions to randomly select from the pool for each assignment. If NULL, all questions are included.';

-- Create assignment_fields table to store which questions are selected for each assignment
-- This allows each assignment to have a unique set of randomly selected questions
CREATE TABLE IF NOT EXISTS assignment_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL, -- Order of the question in this specific assignment
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure each field appears only once per assignment
  UNIQUE(assignment_id, field_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assignment_fields_assignment_id ON assignment_fields(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_fields_field_id ON assignment_fields(field_id);
CREATE INDEX IF NOT EXISTS idx_assignment_fields_order ON assignment_fields(assignment_id, "order");

-- Enable Row Level Security
ALTER TABLE assignment_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment_fields
-- Users can view assignment_fields for assignments they own
CREATE POLICY "Users can view their own assignment fields" ON assignment_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = assignment_fields.assignment_id
      AND assignments.user_id = auth.uid()
    )
  );

-- Admins can view assignment_fields for assignments in their client
CREATE POLICY "Admins can view assignment fields for their client" ON assignment_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      INNER JOIN profiles ON profiles.id = assignments.user_id
      WHERE assignments.id = assignment_fields.assignment_id
      AND profiles.client_id = (
        SELECT client_id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Only system can create assignment_fields (via API with admin client)
CREATE POLICY "Only system can create assignment fields" ON assignment_fields
  FOR INSERT WITH CHECK (false);

-- Only system can update assignment_fields (via API with admin client)
CREATE POLICY "Only system can update assignment fields" ON assignment_fields
  FOR UPDATE USING (false);

-- Only system can delete assignment_fields (via API with admin client)
CREATE POLICY "Only system can delete assignment fields" ON assignment_fields
  FOR DELETE USING (false);

