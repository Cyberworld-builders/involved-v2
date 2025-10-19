-- Handle users who signed up but haven't confirmed their email yet
-- This migration creates profiles for existing unconfirmed users

-- First, let's check what columns actually exist in the users table
-- This will help us understand the current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Create profile for jay@cyberworldbuilder.com specifically
-- This is a targeted fix for the known missing user
DO $$
DECLARE
  auth_user_record RECORD;
  english_lang_id UUID;
BEGIN
  -- Get the auth user
  SELECT id, email, raw_user_meta_data, email_confirmed_at
  INTO auth_user_record
  FROM auth.users 
  WHERE email = 'jay@cyberworldbuilder.com';
  
  IF auth_user_record.id IS NULL THEN
    RAISE NOTICE 'User jay@cyberworldbuilder.com not found in auth.users';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user: %', auth_user_record.id;
  RAISE NOTICE 'Email confirmed: %', auth_user_record.email_confirmed_at;
  
  -- Get English language ID
  SELECT id INTO english_lang_id 
  FROM languages 
  WHERE code = 'en' 
  LIMIT 1;
  
  -- Create the profile
  INSERT INTO public.users (
    auth_user_id, 
    username, 
    name, 
    email, 
    language_id, 
    completed_profile
  )
  VALUES (
    auth_user_record.id,
    COALESCE(
      NULLIF(auth_user_record.raw_user_meta_data->>'username', ''), 
      LOWER(SPLIT_PART(auth_user_record.email, '@', 1))
    ),
    COALESCE(
      NULLIF(auth_user_record.raw_user_meta_data->>'full_name', ''), 
      SPLIT_PART(auth_user_record.email, '@', 1)
    ),
    auth_user_record.email,
    english_lang_id,
    false
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RAISE NOTICE 'Created profile for jay@cyberworldbuilder.com';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile: %', SQLERRM;
END $$;
