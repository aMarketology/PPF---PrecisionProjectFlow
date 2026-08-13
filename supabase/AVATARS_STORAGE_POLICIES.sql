-- ════════════════════════════════════════════════════════════════════
-- AVATARS_STORAGE_POLICIES.sql
-- Run in: Supabase Dashboard → SQL Editor
-- Adds RLS policies to the `avatars` storage bucket so users can
-- upload/update/delete their own profile picture.
-- Safe to run multiple times (DROP IF EXISTS + CREATE).
-- ════════════════════════════════════════════════════════════════════

-- 1. Allow authenticated users to upload their own avatar
--    Path pattern: avatars/{userId}.{ext}
DROP POLICY IF EXISTS "Avatar owner upload" ON storage.objects;
CREATE POLICY "Avatar owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. Allow users to update/replace their own avatar
DROP POLICY IF EXISTS "Avatar owner update" ON storage.objects;
CREATE POLICY "Avatar owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Allow users to delete their own avatar
DROP POLICY IF EXISTS "Avatar owner delete" ON storage.objects;
CREATE POLICY "Avatar owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Allow anyone (authenticated or not) to read avatars (public bucket)
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');