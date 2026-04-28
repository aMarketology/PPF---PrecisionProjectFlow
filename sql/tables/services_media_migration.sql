-- ============================================================
-- MIGRATION: Add media + niche fields to services table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add new columns to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS service_area TEXT DEFAULT 'remote';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS certifications TEXT[];

-- 2. Create storage bucket for service images (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880,  -- 5MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "service_images_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Storage RLS: anyone can read service images (public bucket)
CREATE POLICY "service_images_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

-- 5. Storage RLS: owners can delete their own images
CREATE POLICY "service_images_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- VERIFY: Run this after to confirm columns were added
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'services' ORDER BY ordinal_position;
