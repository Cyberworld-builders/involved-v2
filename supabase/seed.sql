-- Seed file for initial database data
-- This file is automatically run after migrations during `supabase db reset`

-- Create admin user for seed.sql (admin@involved.com)
-- Note: The 360-demo seeder creates its own admin user (admin@demo.com)
-- This admin user is for general use and will be created if it doesn't exist

DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'admin@involved.com';
  has_role_column BOOLEAN;
  has_access_level_column BOOLEAN;
BEGIN
  -- Check if role and access_level columns exist (migrations 010 and 012)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) INTO has_role_column;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'access_level'
  ) INTO has_access_level_column;
  
  -- Find the auth user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  -- If admin user doesn't exist, we'll skip the profile update
  -- The 360-demo seeder will create its own admin user (admin@demo.com)
  -- This seed file focuses on admin@involved.com for general use
  IF admin_user_id IS NOT NULL THEN
    -- Update the profile to be admin (only if columns exist)
    IF has_role_column AND has_access_level_column THEN
      UPDATE profiles
      SET 
        role = 'admin',
        access_level = 'super_admin',
        name = COALESCE(name, 'System Administrator'),
        username = COALESCE(username, 'admin')
      WHERE auth_user_id = admin_user_id;
      
      -- If profile doesn't exist yet (shouldn't happen due to trigger, but just in case)
      IF NOT FOUND THEN
        INSERT INTO profiles (
          auth_user_id,
          email,
          name,
          username,
          role,
          access_level,
          created_at,
          updated_at
        ) VALUES (
          admin_user_id,
          admin_email,
          'System Administrator',
          'admin',
          'admin',
          'super_admin',
          NOW(),
          NOW()
        )
        ON CONFLICT (auth_user_id) DO UPDATE SET
          role = 'admin',
          access_level = 'super_admin';
      END IF;
      
      RAISE NOTICE 'Admin profile updated for user: %', admin_email;
    ELSIF has_role_column THEN
      -- Only role column exists, update it
      UPDATE profiles
      SET 
        role = 'admin',
        name = COALESCE(name, 'System Administrator'),
        username = COALESCE(username, 'admin')
      WHERE auth_user_id = admin_user_id;
      
      RAISE NOTICE 'Admin profile updated (role only) for user: %. Note: access_level column not found - migration 012 may need to be applied.', admin_email;
    ELSE
      -- Neither column exists - migrations haven't been applied
      UPDATE profiles
      SET 
        name = COALESCE(name, 'System Administrator'),
        username = COALESCE(username, 'admin')
      WHERE auth_user_id = admin_user_id;
      
      RAISE NOTICE 'Profile updated for user: %, but role/access_level columns not found.', admin_email;
      RAISE NOTICE 'Please ensure migrations 010, 011, and 012 have been applied, then re-run this seed.';
    END IF;
  ELSE
    RAISE NOTICE 'Auth user with email % not found. Please create the user first via Dashboard or CLI.', admin_email;
    RAISE NOTICE 'Then re-run this seed file or manually execute the UPDATE statement.';
  END IF;
END $$;

-- Create a sample client for testing
INSERT INTO clients (id, name, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Sample Client',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

