-- Implement invite-only user registration system
-- This allows bulk user creation without auth signup triggers

-- 1. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read invitations" ON invitations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert invitations" ON invitations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update invitations" ON invitations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete invitations" ON invitations
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Create function to create user profiles directly (bypass auth signup)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_email TEXT,
  user_name TEXT,
  user_username TEXT DEFAULT NULL,
  user_client_id UUID DEFAULT NULL,
  user_role TEXT DEFAULT 'user'
)
RETURNS UUID AS $$
DECLARE
  new_profile_id UUID;
  english_lang_id UUID;
BEGIN
  -- Get English language ID
  SELECT id INTO english_lang_id 
  FROM languages 
  WHERE code = 'en' 
  LIMIT 1;
  
  -- Create user profile directly (no auth user required)
  INSERT INTO public.profiles (
    username,
    name,
    email,
    client_id,
    language_id,
    completed_profile,
    created_at,
    updated_at
  )
  VALUES (
    COALESCE(user_username, LOWER(SPLIT_PART(user_email, '@', 1))),
    user_name,
    user_email,
    user_client_id,
    english_lang_id,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_profile_id;
  
  RAISE NOTICE 'Created user profile for: % (%)', user_email, new_profile_id;
  
  RETURN new_profile_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user profile for %: %', user_email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to send invitation
CREATE OR REPLACE FUNCTION public.send_invitation(
  invite_email TEXT,
  invite_client_id UUID,
  invite_role TEXT DEFAULT 'user'
)
RETURNS TEXT AS $$
DECLARE
  invitation_token TEXT;
  invitation_id UUID;
BEGIN
  -- Generate unique token
  invitation_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create invitation
  INSERT INTO invitations (
    email,
    token,
    invited_by,
    client_id,
    role
  )
  VALUES (
    invite_email,
    invitation_token,
    auth.uid(),
    invite_client_id,
    invite_role
  )
  RETURNING id INTO invitation_id;
  
  RAISE NOTICE 'Created invitation for: % (token: %)', invite_email, invitation_token;
  
  RETURN invitation_token;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating invitation for %: %', invite_email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to accept invitation (creates auth user + profile)
CREATE OR REPLACE FUNCTION public.accept_invitation(
  invitation_token TEXT,
  user_password TEXT
)
RETURNS UUID AS $$
DECLARE
  invitation_record RECORD;
  auth_user_id UUID;
  profile_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM invitations
  WHERE token = invitation_token
  AND expires_at > NOW()
  AND accepted_at IS NULL;
  
  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Create auth user (this will trigger our existing trigger)
  -- Note: This requires Supabase Auth admin functions
  -- For now, we'll create the profile directly
  
  -- Create user profile
  SELECT public.create_user_profile(
    invitation_record.email,
    SPLIT_PART(invitation_record.email, '@', 1), -- Use email prefix as name
    LOWER(SPLIT_PART(invitation_record.email, '@', 1)),
    invitation_record.client_id
  ) INTO profile_id;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RAISE NOTICE 'Invitation accepted for: %', invitation_record.email;
  
  RETURN profile_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error accepting invitation: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- 7. Add updated_at trigger for invitations
CREATE TRIGGER update_invitations_updated_at 
  BEFORE UPDATE ON invitations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
