-- Create private Storage bucket for dashboard resources videos
-- Videos are streamed via signed URLs (generated server-side).

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources-videos', 'resources-videos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects require the table owner (managed by Supabase).
-- When applying migrations via CLI, you may not have ownership privileges.
-- We attempt to create policies, but do NOT fail the migration if privileges are insufficient.
DO $$
BEGIN
  -- Drop existing policies if present (idempotent)
  DROP POLICY IF EXISTS resources_videos_read_authenticated ON storage.objects;
  DROP POLICY IF EXISTS resources_videos_write_super_admin ON storage.objects;
  DROP POLICY IF EXISTS resources_videos_update_super_admin ON storage.objects;
  DROP POLICY IF EXISTS resources_videos_delete_super_admin ON storage.objects;

  -- Allow any authenticated user to read videos in this bucket
  CREATE POLICY resources_videos_read_authenticated
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'resources-videos');

  -- Super admins can upload new videos
  CREATE POLICY resources_videos_write_super_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resources-videos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

  -- Super admins can update videos in this bucket
  CREATE POLICY resources_videos_update_super_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resources-videos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  )
  WITH CHECK (
    bucket_id = 'resources-videos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );

  -- Super admins can delete videos in this bucket
  CREATE POLICY resources_videos_delete_super_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resources-videos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
    )
  );
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Bucket still gets created; policies can be created in Supabase SQL editor if needed.
    NULL;
END $$;

