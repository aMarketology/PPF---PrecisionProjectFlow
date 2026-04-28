/**
 * PPF Feed SDK
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in TypeScript/JavaScript SDK for integrating the Precision Project Flow
 * community feed into any client — React Native (Expo), web, or Node.js.
 *
 * Media bucket:  "post-media"  (Supabase Storage, public)
 * Base URL:       your Next.js deployment, e.g. https://app.precisionprojectflow.com
 *
 * Usage (React Native / Expo):
 *   import { PPFFeedSDK } from './ppf-feed-sdk';
 *   const feed = new PPFFeedSDK('https://app.precisionprojectflow.com', supabaseSession.access_token);
 *
 * All methods return { data, error } — mirror of the Supabase client pattern.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostType =
  | 'update'
  | 'project_showcase'
  | 'job_post'
  | 'milestone'
  | 'parts_request';

export interface FeedAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: string;
  company_name: string | null;
}

export interface FeedPost {
  id: string;
  content: string;
  post_type: PostType;
  /** Array of public URLs stored in the "post-media" Supabase bucket */
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  /** Only populated on parts_request posts */
  bids_count: number;
  /** USD budget set by the poster (parts_request only) */
  budget: number | null;
  /** ISO date string for when part is needed (parts_request only) */
  deadline: string | null;
  created_at: string;
  author: FeedAuthor;
  /** True when the authenticated user has liked this post */
  liked_by_me: boolean;
}

export interface FeedBid {
  id: string;
  amount: number;
  note: string | null;
  /** 'pending' | 'accepted' | 'rejected' */
  status: string;
  created_at: string;
  bidder: FeedAuthor;
}

export interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  author: FeedAuthor;
}

export interface FeedPage {
  posts: FeedPost[];
  page: number;
  /** True when there are more posts to load */
  hasMore: boolean;
}

export interface SDKResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Upload helpers (React Native / Expo) ────────────────────────────────────

/**
 * Represents a file to upload. On React Native, pass the result of
 * expo-image-picker's ImagePickerAsset or expo-document-picker's DocumentPickerAsset.
 */
export interface MediaFile {
  /** Local file URI, e.g. "file:///var/mobile/.../image.jpg" */
  uri: string;
  /** MIME type, e.g. "image/jpeg" or "video/mp4" */
  type: string;
  /** File name including extension */
  name: string;
}

// ─── SDK class ────────────────────────────────────────────────────────────────

export class PPFFeedSDK {
  private baseUrl: string;
  private token: string | null;

  /**
   * @param baseUrl  Root URL of the deployed Next.js app, no trailing slash.
   *                 e.g. "https://app.precisionprojectflow.com"
   * @param token    Supabase JWT access_token for the signed-in user.
   *                 Pass null for read-only / unauthenticated access.
   */
  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /** Update auth token (call after token refresh) */
  setToken(token: string | null) {
    this.token = token;
  }

  // ── Internal fetch helper ──────────────────────────────────────────────────

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<SDKResult<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { data: null, error: (json as any).error ?? `HTTP ${res.status}` };
      }
      return { data: json as T, error: null };
    } catch (err: any) {
      return { data: null, error: err.message ?? 'Network error' };
    }
  }

  // ─── Feed ─────────────────────────────────────────────────────────────────

  /**
   * Get paginated feed posts.
   *
   * @param page       Zero-indexed page number (default 0)
   * @param type       Filter by post type, or 'all' for everything (default 'all')
   *
   * @example
   * const { data } = await feed.getPosts(0, 'parts_request');
   * // data.posts → FeedPost[]
   * // data.hasMore → boolean
   */
  async getPosts(page = 0, type: PostType | 'all' = 'all'): Promise<SDKResult<FeedPage>> {
    return this.request<FeedPage>(`/api/feed?page=${page}&type=${type}`);
  }

  /**
   * Create a new post.
   * For parts_request posts, include budget and deadline.
   *
   * @example
   * // Standard update post
   * await feed.createPost({ content: 'Just shipped v2!', post_type: 'update' });
   *
   * // Parts request with photo
   * await feed.createPost({
   *   content: 'Need this bracket rewelded, 316 stainless, 2" OD',
   *   post_type: 'parts_request',
   *   media_urls: ['https://...public-url...'],
   *   budget: 250,
   *   deadline: '2026-04-10',
   * });
   */
  async createPost(params: {
    content: string;
    post_type?: PostType;
    /** Pass public URLs already uploaded via uploadMedia() */
    media_urls?: string[];
    budget?: number;
    deadline?: string;
    linked_type?: string;
    linked_id?: string;
  }): Promise<SDKResult<{ post: FeedPost }>> {
    return this.request<{ post: FeedPost }>('/api/feed', {
      method: 'POST',
      body: JSON.stringify({
        content:     params.content,
        post_type:   params.post_type ?? 'update',
        media_urls:  params.media_urls ?? [],
        budget:      params.budget ?? null,
        deadline:    params.deadline ?? null,
        linked_type: params.linked_type ?? null,
        linked_id:   params.linked_id ?? null,
      }),
    });
  }

  // ─── Likes ────────────────────────────────────────────────────────────────

  /**
   * Toggle like on a post (like if not liked, unlike if already liked).
   * Requires authentication.
   *
   * @example
   * await feed.toggleLike('post-uuid');
   */
  async toggleLike(postId: string): Promise<SDKResult<{ liked: boolean; likes_count: number }>> {
    return this.request(`/api/feed/${postId}/like`, { method: 'POST' });
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  /**
   * Fetch all comments for a post, ordered oldest-first.
   * This queries Supabase directly — install @supabase/supabase-js in your mobile app.
   *
   * @example
   * const { data } = await feed.getComments('post-uuid');
   * // data → FeedComment[]
   *
   * NOTE: You can also call this via Supabase client directly (see below).
   */
  async getComments(postId: string): Promise<SDKResult<FeedComment[]>> {
    // Comments are fetched directly from Supabase (no REST proxy needed).
    // See fetchCommentsViaSupabase() below for the Supabase client pattern.
    return this.request<FeedComment[]>(`/api/feed/${postId}/comments`);
  }

  // ─── Bids (parts_request only) ───────────────────────────────────────────

  /**
   * Fetch all bids for a parts_request post, sorted by amount ascending.
   * First item = lowest bid.
   *
   * @example
   * const { data } = await feed.getBids('post-uuid');
   * // data.bids[0] → lowest bid
   */
  async getBids(postId: string): Promise<SDKResult<{ bids: FeedBid[] }>> {
    return this.request<{ bids: FeedBid[] }>(`/api/feed/${postId}/bid`);
  }

  /**
   * Place or update a bid on a parts_request post.
   * One bid per user per post — calling again updates the existing bid.
   * Requires authentication.
   *
   * @example
   * await feed.placeBid('post-uuid', { amount: 350, note: 'Can deliver in TX within 48hrs' });
   */
  async placeBid(
    postId: string,
    params: { amount: number; note?: string }
  ): Promise<SDKResult<{ bid: FeedBid }>> {
    return this.request<{ bid: FeedBid }>(`/api/feed/${postId}/bid`, {
      method: 'POST',
      body: JSON.stringify({ amount: params.amount, note: params.note ?? null }),
    });
  }

  // ─── Media Upload ─────────────────────────────────────────────────────────

  /**
   * Upload one or more media files to the "post-media" Supabase storage bucket.
   * Returns an array of public CDN URLs to pass into createPost().
   *
   * ── React Native / Expo usage ──────────────────────────────────────────────
   * 1. Pick files with expo-image-picker:
   *    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'All', allowsMultipleSelection: true });
   *
   * 2. Map to MediaFile[]:
   *    const files: MediaFile[] = result.assets.map(a => ({ uri: a.uri, type: a.mimeType ?? 'image/jpeg', name: a.fileName ?? 'photo.jpg' }));
   *
   * 3. Upload and get URLs:
   *    const { data: urls } = await feed.uploadMedia(supabase, userId, files);
   *
   * ── Supabase bucket details ────────────────────────────────────────────────
   *   Bucket name : post-media
   *   Access      : public (no signed URLs needed)
   *   Path format : {userId}/{timestamp}-{random}.{ext}
   *   Allowed types: image/jpeg, image/png, image/webp, image/gif, video/mp4, video/quicktime, video/webm
   *   Max file size: set in Supabase dashboard (recommend 50 MB)
   *
   * @param supabaseClient  An authenticated @supabase/supabase-js client instance
   * @param userId          The authenticated user's UUID
   * @param files           Array of MediaFile objects
   */
  async uploadMedia(
    supabaseClient: any,
    userId: string,
    files: MediaFile[]
  ): Promise<SDKResult<string[]>> {
    const urls: string[] = [];
    try {
      for (const file of files) {
        const ext  = file.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // React Native requires fetch → blob → ArrayBuffer approach
        const response  = await fetch(file.uri);
        const blob      = await response.blob();
        const arrayBuf  = await blobToArrayBuffer(blob);

        const { error: uploadError } = await supabaseClient.storage
          .from('post-media')              // ← bucket name
          .upload(path, arrayBuf, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabaseClient.storage
          .from('post-media')
          .getPublicUrl(path);

        urls.push(publicUrl);
      }
      return { data: urls, error: null };
    } catch (err: any) {
      return { data: null, error: err.message ?? 'Upload failed' };
    }
  }

  // ─── Realtime ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to live feed updates.
   * New posts appear automatically; likes/bids/comments counts update in real-time.
   *
   * ── React Native usage ────────────────────────────────────────────────────
   *   const unsub = feed.subscribeToFeed(supabase, {
   *     onNewPost:     (post) => setPosts(prev => [post, ...prev]),
   *     onPostUpdated: (updated) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)),
   *   });
   *   // On component unmount:
   *   return () => unsub();
   *
   * @param supabaseClient  Authenticated @supabase/supabase-js client
   * @param callbacks       Event handlers
   * @returns               Unsubscribe function — call on component unmount
   */
  subscribeToFeed(
    supabaseClient: any,
    callbacks: {
      onNewPost?: (post: Partial<FeedPost>) => void;
      onPostUpdated?: (updated: Partial<FeedPost>) => void;
      onNewBid?: (bid: { post_id: string; amount: number }) => void;
    }
  ): () => void {
    const channel = supabaseClient
      .channel('ppf_feed_mobile')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts', filter: 'is_published=eq.true' },
        (payload: any) => callbacks.onNewPost?.(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
        (payload: any) => callbacks.onPostUpdated?.(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_bids' },
        (payload: any) => callbacks.onNewBid?.(payload.new)
      )
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Convert Blob to ArrayBuffer — needed for Supabase storage upload in React Native */
function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// ─── Supabase-direct helpers (bypass REST API for comments) ──────────────────

/**
 * Fetch comments directly via Supabase client.
 * Faster than going through the Next.js API — use this in your mobile app.
 *
 * @example
 * const comments = await fetchCommentsViaSupabase(supabase, 'post-uuid');
 */
export async function fetchCommentsViaSupabase(
  supabaseClient: any,
  postId: string
): Promise<FeedComment[]> {
  const { data } = await supabaseClient
    .from('feed_comments')
    .select('id, content, created_at, author:profiles!author_id(id, full_name, avatar_url, user_type, company_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

/**
 * Post a comment directly via Supabase client.
 *
 * @example
 * await postCommentViaSupabase(supabase, { postId: 'post-uuid', authorId: user.id, content: 'Great work!' });
 */
export async function postCommentViaSupabase(
  supabaseClient: any,
  params: { postId: string; authorId: string; content: string }
): Promise<{ data: FeedComment | null; error: any }> {
  const { data, error } = await supabaseClient
    .from('feed_comments')
    .insert({ post_id: params.postId, author_id: params.authorId, content: params.content.trim() })
    .select('id, content, created_at, author:profiles!author_id(id, full_name, avatar_url, user_type, company_name)')
    .single();
  return { data, error };
}

// ─── Quick-start example (React Native / Expo) ────────────────────────────────
//
// // 1. Install deps in your mobile app:
// //    npx expo install @supabase/supabase-js expo-image-picker
//
// // 2. Initialize:
// import { createClient } from '@supabase/supabase-js';
// import { PPFFeedSDK } from './ppf-feed-sdk';
//
// const SUPABASE_URL  = 'https://ifrxzmemiihxfdimwvcw.supabase.co';
// const SUPABASE_ANON = 'YOUR_ANON_KEY';
// const PPF_BASE_URL  = 'https://app.precisionprojectflow.com';
//
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
//
// // After login:
// const { data: { session } } = await supabase.auth.signInWithPassword({ email, password });
// const feed = new PPFFeedSDK(PPF_BASE_URL, session.access_token);
//
// // 3. Load feed:
// const { data } = await feed.getPosts(0, 'all');
// console.log(data.posts);
//
// // 4. Post a parts request with photo:
// const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'All' });
// const files  = picked.assets.map(a => ({ uri: a.uri, type: a.mimeType ?? 'image/jpeg', name: a.fileName ?? 'photo.jpg' }));
// const { data: urls } = await feed.uploadMedia(supabase, session.user.id, files);
// await feed.createPost({ content: 'Need this bracket rewelded', post_type: 'parts_request', media_urls: urls, budget: 300, deadline: '2026-04-10' });
//
// // 5. Bid on a parts request:
// await feed.placeBid('post-uuid', { amount: 250, note: 'Based in TX, 48hr turnaround' });
//
// // 6. Real-time updates:
// const unsub = feed.subscribeToFeed(supabase, {
//   onNewPost:     (post) => console.log('New post:', post),
//   onPostUpdated: (p)    => console.log('Post updated:', p.id),
//   onNewBid:      (bid)  => console.log('New bid on:', bid.post_id, '$' + bid.amount),
// });
// // Cleanup: unsub() on screen unmount
