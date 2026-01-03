-- Fix RLS policies for answers table
-- The original policies incorrectly compared auth.uid() (auth user ID) with user_id (profile ID)
-- We need to check if the auth user's profile ID matches the answer's user_id

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view their own answers" ON answers;
DROP POLICY IF EXISTS "Users can manage their own answers" ON answers;
DROP POLICY IF EXISTS "Admins can view answers for their clients" ON answers;

-- Users can view answers for their own assignments
-- Check if the auth user's profile ID matches the answer's user_id
CREATE POLICY "Users can view their own answers" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.id = answers.user_id
    )
  );

-- Users can create/update answers for their own assignments
-- Check if the auth user's profile ID matches the answer's user_id
CREATE POLICY "Users can manage their own answers" ON answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.id = answers.user_id
    )
  );

-- Admins can view answers for assignments in their clients
-- Check if the assignment belongs to a user in the admin's client
CREATE POLICY "Admins can view answers for their clients" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN profiles AS assignment_user ON assignments.user_id = assignment_user.id
      JOIN profiles AS admin_user ON admin_user.auth_user_id = auth.uid()
      WHERE assignments.id = answers.assignment_id
      AND (
        -- Super admins can see all
        admin_user.access_level = 'super_admin'
        OR
        -- Client admins can see answers for users in their client
        (admin_user.access_level = 'client_admin' 
         AND assignment_user.client_id = admin_user.client_id)
      )
    )
  );

-- Admins can insert/update answers for assignments in their clients (for system operations)
-- This allows admins to create answers on behalf of users if needed
CREATE POLICY "Admins can manage answers for their clients" ON answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN profiles AS assignment_user ON assignments.user_id = assignment_user.id
      JOIN profiles AS admin_user ON admin_user.auth_user_id = auth.uid()
      WHERE assignments.id = answers.assignment_id
      AND (
        -- Super admins can manage all
        admin_user.access_level = 'super_admin'
        OR
        -- Client admins can manage answers for users in their client
        (admin_user.access_level = 'client_admin' 
         AND assignment_user.client_id = admin_user.client_id)
      )
    )
  );
