-- Update RLS policies for answers table to properly handle INSERT operations
-- Split the "Users can manage their own answers" policy into separate policies
-- for better control over INSERT vs UPDATE/DELETE operations

-- Drop the existing policy that handles all operations
DROP POLICY IF EXISTS "Users can manage their own answers" ON answers;

-- Users can view/update/delete answers for their own assignments
-- Check if the auth user's profile ID matches the answer's user_id
-- AND verify the assignment belongs to the user
CREATE POLICY "Users can view and update their own answers" ON answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN assignments ON assignments.user_id = profiles.id
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.id = answers.user_id
      AND assignments.id = answers.assignment_id
    )
  );

-- Users can insert answers for their own assignments
-- Check if the auth user's profile ID matches the answer's user_id
-- AND verify the assignment belongs to the user
CREATE POLICY "Users can insert answers for their own assignments" ON answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN assignments ON assignments.user_id = profiles.id
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.id = answers.user_id
      AND assignments.id = answers.assignment_id
    )
  );
