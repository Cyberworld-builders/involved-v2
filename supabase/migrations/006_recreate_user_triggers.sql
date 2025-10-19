-- Recreate user profile triggers with comprehensive error handling
-- This migration ensures the triggers are properly created and working

-- Drop all existing triggers and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a robust function with comprehensive error handling
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
  
  -- Insert or update user profile
  INSERT INTO public.users (
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
  RAISE LOG 'User profile created/updated for auth user: %', NEW.id;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth operation
    RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT operations (new user signup)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for UPDATE operations (email confirmation, profile updates)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create the missing user profile for jay@cyberworldbuilder.com
-- This will backfill the existing user
DO $$
DECLARE
  auth_user_record RECORD;
BEGIN
  -- Get the existing auth user
  SELECT id, email, raw_user_meta_data
  INTO auth_user_record
  FROM auth.users 
  WHERE email = 'jay@cyberworldbuilder.com';
  
  IF auth_user_record.id IS NOT NULL THEN
    -- Create the missing user profile
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
      (SELECT id FROM languages WHERE code = 'en' LIMIT 1),
      false
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    
    RAISE NOTICE 'Created user profile for jay@cyberworldbuilder.com';
  END IF;
END $$;
