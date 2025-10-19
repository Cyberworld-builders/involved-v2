-- Rename users table to profiles to avoid conflict with auth.users
-- This should resolve the naming conflict that's preventing triggers from working

-- 1. First, let's see what tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name LIKE '%user%' 
ORDER BY table_schema, table_name;

-- 2. Rename the users table to profiles
ALTER TABLE public.users RENAME TO profiles;

-- 3. Update the auth_user_id column reference
-- (This should already be correct, but let's verify)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Add unique constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_auth_user_id_unique UNIQUE (auth_user_id);

-- 5. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- 6. Update RLS policies to use the new table name
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON public.profiles;

-- Create new RLS policies for profiles table
CREATE POLICY "Allow authenticated users to read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update profiles" ON profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete profiles" ON profiles
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Update the trigger function to use the new table name
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
  
  -- Insert or update user profile in the profiles table
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
  RAISE LOG 'User profile created/updated for auth user: %', NEW.id;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth operation
    RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recreate triggers with the correct table references
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
