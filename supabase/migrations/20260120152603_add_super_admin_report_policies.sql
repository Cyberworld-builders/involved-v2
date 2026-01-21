-- Migration: Add super_admin policies for reporting tables
-- Super admins should be able to view and manage all report-related data

-- ============================================================================
-- REPORT_DATA TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all report data
CREATE POLICY "Super admins can view all report data" ON report_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can insert report data
CREATE POLICY "Super admins can insert report data" ON report_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all report data
CREATE POLICY "Super admins can update all report data" ON report_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all report data
CREATE POLICY "Super admins can delete all report data" ON report_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- ASSIGNMENT_DIMENSION_SCORES TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all dimension scores
CREATE POLICY "Super admins can view all dimension scores" ON assignment_dimension_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can insert dimension scores
CREATE POLICY "Super admins can insert dimension scores" ON assignment_dimension_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all dimension scores
CREATE POLICY "Super admins can update all dimension scores" ON assignment_dimension_scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all dimension scores
CREATE POLICY "Super admins can delete all dimension scores" ON assignment_dimension_scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- REPORT_TEMPLATES TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all report templates
CREATE POLICY "Super admins can view all report templates" ON report_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can create report templates
CREATE POLICY "Super admins can create report templates" ON report_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all report templates
CREATE POLICY "Super admins can update all report templates" ON report_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all report templates
CREATE POLICY "Super admins can delete all report templates" ON report_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- FEEDBACK_LIBRARY TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all feedback
CREATE POLICY "Super admins can view all feedback" ON feedback_library
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can create feedback
CREATE POLICY "Super admins can create feedback" ON feedback_library
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all feedback
CREATE POLICY "Super admins can update all feedback" ON feedback_library
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all feedback
CREATE POLICY "Super admins can delete all feedback" ON feedback_library
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- GEONORMS TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all geonorms
CREATE POLICY "Super admins can view all geonorms" ON geonorms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can insert geonorms
CREATE POLICY "Super admins can insert geonorms" ON geonorms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all geonorms
CREATE POLICY "Super admins can update all geonorms" ON geonorms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all geonorms
CREATE POLICY "Super admins can delete all geonorms" ON geonorms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Super admins can view all report data" ON report_data IS 'Allow super_admin users to view all report data';
COMMENT ON POLICY "Super admins can view all dimension scores" ON assignment_dimension_scores IS 'Allow super_admin users to view all cached dimension scores';
COMMENT ON POLICY "Super admins can view all report templates" ON report_templates IS 'Allow super_admin users to view all report templates';
COMMENT ON POLICY "Super admins can view all feedback" ON feedback_library IS 'Allow super_admin users to view all feedback library entries';
COMMENT ON POLICY "Super admins can view all geonorms" ON geonorms IS 'Allow super_admin users to view all geonorm data';
