-- Create storage bucket for client assets (logos and backgrounds)
-- This bucket will store client branding images

-- Insert bucket into storage.buckets table
-- Note: Bucket limit (50MB) is higher than application limits (2MB logo, 5MB background)
-- to allow flexibility and future requirements
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-assets',
  'client-assets',
  true, -- Public bucket so images can be accessed via URLs
  52428800, -- 50MB file size limit (allows flexibility beyond app-level limits)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for client-assets bucket

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload client assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-assets');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update client assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-assets');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete client assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-assets');

-- Allow public read access to all files in client-assets bucket
CREATE POLICY "Public can read client assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-assets');
