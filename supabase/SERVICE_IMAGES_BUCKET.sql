-- ════════════════════════════════════════════════════════════════════
-- SERVICE_IMAGES_BUCKET.sql
-- Run in: Supabase Dashboard → SQL Editor
-- Creates the `service-images` storage bucket with RLS policies so
-- engineers can upload/manage their own service cover images.
-- Safe to run multiple times (idempotent via ON CONFLICT DO NOTHING).
-- ════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  TRUE,         -- public bucket → images served via permanent public URL
  5242880,      -- 5 MB max per image
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images to their own folder
DROP POLICY IF EXISTS "Service owner upload" ON storage.objects;
CREATE POLICY "Service owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow owners to update/replace their images
DROP POLICY IF EXISTS "Service owner update" ON storage.objects;
CREATE POLICY "Service owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow owners to delete their images
DROP POLICY IF EXISTS "Service owner delete" ON storage.objects;
CREATE POLICY "Service owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read access (bucket is public, but RLS still needs a policy)
DROP POLICY IF EXISTS "Service images public read" ON storage.objects;
CREATE POLICY "Service images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

-- ════════════════════════════════════════════════════════════════════
-- Done. Engineers can now upload service cover images to:
--   service-images/{userId}/{serviceId or timestamp}-{filename}
-- Public URLs follow the pattern:
--   https://<project>.supabase.co/storage/v1/object/public/service-images/{path}
-- ════════════════════════════════════════════════════════════════════
