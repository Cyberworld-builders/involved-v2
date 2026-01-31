-- Create private Storage bucket for report PDFs
-- PDFs are served via signed URLs (generated server-side).

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports-pdf', 'reports-pdf', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects require the table owner (managed by Supabase).
-- When applying migrations via CLI, you may not have ownership privileges.
-- We attempt to create policies, but do NOT fail the migration if privileges are insufficient.
DO $$
BEGIN
  -- Drop existing policies if present (idempotent)
  DROP POLICY IF EXISTS reports_pdf_read_assignment_access ON storage.objects;
  DROP POLICY IF EXISTS reports_pdf_write_service_role ON storage.objects;
  DROP POLICY IF EXISTS reports_pdf_delete_service_role ON storage.objects;

  -- Allow authenticated users to read PDFs for assignments they have access to
  -- Storage path format: {assignment_id}/v{version}.pdf
  CREATE POLICY reports_pdf_read_assignment_access
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reports-pdf'
    AND (
      -- Users can read PDFs for their own assignments
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.id::text = split_part(storage.objects.name, '/', 1)
        AND p.auth_user_id = auth.uid()
      )
      OR
      -- Admins can read PDFs for assignments in their clients
      EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.profiles AS assignment_user ON assignment_user.id = a.user_id
        JOIN public.profiles AS admin_user ON admin_user.auth_user_id = auth.uid()
        WHERE a.id::text = split_part(storage.objects.name, '/', 1)
        AND (
          -- Super admins can see all
          admin_user.access_level = 'super_admin'
          OR
          -- Client admins can see assignments for users in their client
          (admin_user.access_level = 'client_admin' 
           AND assignment_user.client_id = admin_user.client_id)
        )
      )
      OR
      -- Super admins can read all PDFs
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.access_level = 'super_admin'
      )
    )
  );

  -- Service role can write PDFs (used by Edge Function)
  CREATE POLICY reports_pdf_write_service_role
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'reports-pdf');

  -- Service role can update PDFs (for regeneration)
  CREATE POLICY reports_pdf_update_service_role
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'reports-pdf')
  WITH CHECK (bucket_id = 'reports-pdf');

  -- Service role can delete PDFs (for cleanup)
  CREATE POLICY reports_pdf_delete_service_role
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'reports-pdf');
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Bucket still gets created; policies can be created in Supabase SQL editor if needed.
    NULL;
END $$;
