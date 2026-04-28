-- =====================================================
-- FEED_AND_STORAGE.sql
--
-- 1. Supabase Storage bucket:  "post-media"
--    - Images and videos users attach to feed posts
--    - Max 50MB per file
--    - Public read, authenticated write (own files only)
--
-- 2. feed_posts table
--    - Text + optional media (image/video URLs)
--    - Likes, comments count (denormalized for speed)
--    - post_type: 'update' | 'project_showcase' | 'job_post' | 'milestone'
--
-- 3. feed_likes table
--
-- 4. feed_comments table
--
-- Run this in the Supabase SQL editor.
-- =====================================================


-- ─────────────────────────────────────────────────────
-- 1.  STORAGE BUCKET
--     Created via Supabase's storage API (SQL version)
-- ─────────────────────────────────────────────────────

-- Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,                          -- public bucket so images load without auth
  52428800,                      -- 50 MB per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read (public bucket)
DROP POLICY IF EXISTS "Public read post-media"       ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload post-media" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own post-media"  ON storage.objects;

CREATE POLICY "Public read post-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Auth users upload post-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
    -- Enforce path structure: {user_id}/{filename}
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own post-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────────────
-- 2.  FEED POSTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 3000),
  post_type       TEXT        NOT NULL DEFAULT 'update'
                              CHECK (post_type IN ('update', 'project_showcase', 'job_post', 'milestone')),

  -- Media (array of public URLs from the post-media bucket)
  media_urls      TEXT[]      DEFAULT '{}',

  -- Linked entity (optional — e.g. link to a product or company)
  linked_type     TEXT        CHECK (linked_type IN ('product', 'company', 'project', NULL)),
  linked_id       UUID,

  -- Engagement (denormalized counters updated by triggers)
  likes_count     INT         NOT NULL DEFAULT 0,
  comments_count  INT         NOT NULL DEFAULT 0,

  -- Visibility
  is_published    BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_author    ON public.feed_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_feed      ON public.feed_posts(created_at DESC) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_feed_posts_type      ON public.feed_posts(post_type, created_at DESC);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published posts are publicly readable" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create own posts"            ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update own posts"            ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete own posts"            ON public.feed_posts;

CREATE POLICY "Published posts are publicly readable"
  ON public.feed_posts FOR SELECT
  USING (is_published = TRUE OR auth.uid() = author_id);

CREATE POLICY "Users can create own posts"
  ON public.feed_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON public.feed_posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
  ON public.feed_posts FOR DELETE
  USING (auth.uid() = author_id);


-- ─────────────────────────────────────────────────────
-- 3.  FEED LIKES
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_likes (
  post_id     UUID  NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id     UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read likes"      ON public.feed_likes;
DROP POLICY IF EXISTS "Users can like posts"       ON public.feed_likes;
DROP POLICY IF EXISTS "Users can unlike posts"     ON public.feed_likes;

CREATE POLICY "Anyone can read likes"  ON public.feed_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts"   ON public.feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.feed_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger: keep likes_count in sync
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.feed_likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.feed_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();


-- ─────────────────────────────────────────────────────
-- 4.  FEED COMMENTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID  NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id   UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT  NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON public.feed_comments(post_id, created_at ASC);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are publicly readable" ON public.feed_comments;
DROP POLICY IF EXISTS "Users can comment"              ON public.feed_comments;
DROP POLICY IF EXISTS "Users can delete own comments"  ON public.feed_comments;

CREATE POLICY "Comments are publicly readable" ON public.feed_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment"              ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments"  ON public.feed_comments FOR DELETE USING (auth.uid() = author_id);

-- Trigger: keep comments_count in sync
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_change ON public.feed_comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comments_count();
