-- Implement dual registration flow: direct signup + invited users
-- This eliminates the need for triggers entirely

-- 1. Remove the triggers (we don't need them anymore)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create function to link existing profile to auth user
CREATE OR REPLACE FUNCTION public.link_profile_to_auth_user(
  profile_email TEXT,
  auth_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Find the profile by email
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE email = profile_email
  AND auth_user_id IS NULL; -- Only unlinked profiles
  
  IF profile_record.id IS NULL THEN
    RAISE NOTICE 'No unlinked profile found for email: %', profile_email;
    RETURN FALSE;
  END IF;
  
  -- Link the profile to the auth user
  UPDATE public.profiles
  SET auth_user_id = link_profile_to_auth_user.auth_user_id,
      updated_at = NOW()
  WHERE id = profile_record.id;
  
  RAISE NOTICE 'Linked profile % to auth user %', profile_record.id, auth_user_id;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error linking profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to create profile for invited user
CREATE OR REPLACE FUNCTION public.create_invited_user_profile(
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
  
  -- Create user profile (no auth_user_id yet)
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
  
  RAISE NOTICE 'Created invited user profile for: % (%)', user_email, new_profile_id;
  
  RETURN new_profile_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating invited user profile for %: %', user_email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to send invitation for existing profile
CREATE OR REPLACE FUNCTION public.send_profile_invitation(
  profile_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  invitation_token TEXT;
  invitation_id UUID;
  profile_record RECORD;
BEGIN
  -- Check if profile exists
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE email = profile_email
  AND auth_user_id IS NULL;
  
  IF profile_record.id IS NULL THEN
    RAISE EXCEPTION 'No unlinked profile found for email: %', profile_email;
  END IF;
  
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
    profile_email,
    invitation_token,
    auth.uid(),
    profile_record.client_id,
    'user'
  )
  RETURNING id INTO invitation_id;
  
  RAISE NOTICE 'Created invitation for existing profile: % (token: %)', profile_email, invitation_token;
  
  RETURN invitation_token;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating invitation: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to accept invitation and link profile
CREATE OR REPLACE FUNCTION public.accept_profile_invitation(
  invitation_token TEXT
)
RETURNS UUID AS $$
DECLARE
  invitation_record RECORD;
  profile_record RECORD;
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
  
  -- Get the profile
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE email = invitation_record.email
  AND auth_user_id IS NULL;
  
  IF profile_record.id IS NULL THEN
    RAISE EXCEPTION 'No unlinked profile found for email: %', invitation_record.email;
  END IF;
  
  -- Link profile to current auth user
  UPDATE public.profiles
  SET auth_user_id = auth.uid(),
      updated_at = NOW()
  WHERE id = profile_record.id;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RAISE NOTICE 'Profile linked for: %', invitation_record.email;
  
  RETURN profile_record.id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error accepting profile invitation: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function for direct signup users to create their profile
CREATE OR REPLACE FUNCTION public.create_user_profile_for_auth_user(
  user_name TEXT,
  user_username TEXT DEFAULT NULL,
  user_client_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_profile_id UUID;
  english_lang_id UUID;
  user_email TEXT;
BEGIN
  -- Get current auth user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Get English language ID
  SELECT id INTO english_lang_id 
  FROM languages 
  WHERE code = 'en' 
  LIMIT 1;
  
  -- Create user profile linked to auth user
  INSERT INTO public.profiles (
    auth_user_id,
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
    auth.uid(),
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
  
  RAISE NOTICE 'Created profile for direct signup user: % (%)', user_email, new_profile_id;
  
  RETURN new_profile_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile for auth user: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
