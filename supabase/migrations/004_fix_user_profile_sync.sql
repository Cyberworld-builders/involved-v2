-- Fix user profile synchronization with Supabase Auth
-- This migration ensures user profiles are created/updated when auth users are created or updated

-- Drop existing triggers and function to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create comprehensive function to handle user profile creation and updates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle both INSERT and UPDATE operations with conflict resolution
  INSERT INTO public.users (auth_user_id, username, name, email, language_id, completed_profile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', LOWER(SPLIT_PART(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NULL, -- Default to English (will be set to actual English language ID later)
    false
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();
  
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

-- Set default language_id to English for existing users without language
UPDATE public.users 
SET language_id = (
  SELECT id FROM languages WHERE code = 'en' LIMIT 1
)
WHERE language_id IS NULL;
