-- Migration: Add super_admin policies for assessments and related tables
-- Super admins should be able to view, create, update, and delete all assessments regardless of created_by

-- ============================================================================
-- ASSESSMENTS TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all assessments
CREATE POLICY "Super admins can view all assessments" ON assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can create assessments (with any created_by value)
CREATE POLICY "Super admins can create any assessment" ON assessments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all assessments
CREATE POLICY "Super admins can update all assessments" ON assessments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all assessments
CREATE POLICY "Super admins can delete all assessments" ON assessments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- DIMENSIONS TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all dimensions
CREATE POLICY "Super admins can view all dimensions" ON dimensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can create dimensions for any assessment
CREATE POLICY "Super admins can create any dimension" ON dimensions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all dimensions
CREATE POLICY "Super admins can update all dimensions" ON dimensions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all dimensions
CREATE POLICY "Super admins can delete all dimensions" ON dimensions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- ============================================================================
-- FIELDS TABLE - Super Admin Policies
-- ============================================================================

-- Super admins can view all fields
CREATE POLICY "Super admins can view all fields" ON fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can create fields for any assessment
CREATE POLICY "Super admins can create any field" ON fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can update all fields
CREATE POLICY "Super admins can update all fields" ON fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

-- Super admins can delete all fields
CREATE POLICY "Super admins can delete all fields" ON fields
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

COMMENT ON POLICY "Super admins can view all assessments" ON assessments IS 'Allow super_admin users to view all assessments regardless of created_by';
COMMENT ON POLICY "Super admins can update all assessments" ON assessments IS 'Allow super_admin users to update all assessments regardless of created_by';
COMMENT ON POLICY "Super admins can delete all assessments" ON assessments IS 'Allow super_admin users to delete all assessments regardless of created_by';
