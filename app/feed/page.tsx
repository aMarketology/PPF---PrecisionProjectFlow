import { permanentRedirect } from 'next/navigation'

// /feed → /activity permanent 301 redirect
export default function FeedPage() {
  permanentRedirect('/activity')
}