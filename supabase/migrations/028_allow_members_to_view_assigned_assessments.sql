-- Allow members to view assessments they have assignments for
-- This policy allows users to see assessment details (title, description) for assessments
-- they've been assigned to, even if they didn't create the assessment

CREATE POLICY "Members can view assessments they are assigned to" ON assessments
  FOR SELECT USING (
    -- Allow if user created the assessment (existing behavior)
    auth.uid() = created_by
    OR
    -- OR if user has an assignment for this assessment
    EXISTS (
      SELECT 1 FROM assignments
      INNER JOIN profiles ON profiles.id = assignments.user_id
      WHERE assignments.assessment_id = assessments.id
      AND profiles.auth_user_id = auth.uid()
    )
  );
