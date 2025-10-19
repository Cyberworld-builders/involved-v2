-- Debug existing users to see what's actually in the database
-- This will help us understand the current state

-- 1. Check what users exist in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Check what users exist in public.users
SELECT 
  id,
  auth_user_id,
  username,
  name,
  email,
  created_at
FROM public.users 
ORDER BY created_at DESC;

-- 3. Check the current schema of public.users
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing,
  event_object_table,
  event_object_schema
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'
ORDER BY trigger_name;
