-- Fix the profiles table schema to match our expected structure
-- Remove any unwanted columns and ensure proper structure

-- First, let's see what columns currently exist
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Remove the password column if it exists (we don't need it since we use Supabase Auth)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password;

-- Ensure we have the correct columns
-- Add any missing columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES languages(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS completed_profile BOOLEAN DEFAULT false;

-- Add constraints (drop first if exists)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_user_id_unique;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_auth_user_id_unique UNIQUE (auth_user_id);

-- Create the missing user profile for jay@cyberworldbuilder.com
-- This will test if the schema is correct
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
  
  -- Get English language ID
  SELECT id INTO english_lang_id 
  FROM languages 
  WHERE code = 'en' 
  LIMIT 1;
  
  -- Create the profile
  INSERT INTO public.profiles (
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
