-- Force immediate profile creation on signup, regardless of email confirmation
-- This migration ensures profiles are created immediately when users sign up

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create a new function that handles immediate profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
  name_value TEXT;
  language_id_value UUID;
BEGIN
  -- Extract username with fallback
  username_value := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''), 
    LOWER(SPLIT_PART(NEW.email, '@', 1))
  );
  
  -- Extract name with fallback
  name_value := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Get English language ID
  SELECT id INTO language_id_value 
  FROM languages 
  WHERE code = 'en' 
  LIMIT 1;
  
  -- Insert user profile immediately (regardless of email confirmation)
  INSERT INTO public.profiles (
    auth_user_id, 
    username, 
    name, 
    email, 
    language_id, 
    completed_profile
  )
  VALUES (
    NEW.id,
    username_value,
    name_value,
    NEW.email,
    language_id_value,
    false
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- Log successful creation
  RAISE LOG 'User profile created immediately for auth user: % (email_confirmed: %)', NEW.id, NEW.email_confirmed_at;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth operation
    RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT operations (fires immediately on signup)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for UPDATE operations (email confirmation, profile updates)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for any existing auth users who don't have profiles
-- This backfills existing users
DO $$
DECLARE
  auth_user_record RECORD;
  profile_count INTEGER;
BEGIN
  RAISE NOTICE 'Creating profiles for existing auth users...';
  
  -- Loop through all auth users who don't have profiles
  FOR auth_user_record IN 
    SELECT id, email, raw_user_meta_data, email_confirmed_at
    FROM auth.users 
    WHERE id NOT IN (
      SELECT auth_user_id 
      FROM public.profiles 
      WHERE auth_user_id IS NOT NULL
    )
  LOOP
    -- Check if profile already exists
    SELECT COUNT(*) INTO profile_count 
    FROM public.profiles 
    WHERE auth_user_id = auth_user_record.id;
    
    IF profile_count = 0 THEN
      -- Create the missing profile
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
        (SELECT id FROM languages WHERE code = 'en' LIMIT 1),
        false
      );
      
      RAISE NOTICE 'Created profile for existing user: % (%)', auth_user_record.email, auth_user_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Finished creating profiles for existing users';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profiles for existing users: %', SQLERRM;
END $$;
