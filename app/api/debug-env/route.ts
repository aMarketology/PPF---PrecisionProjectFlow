import { NextResponse } from 'next/server'

// TEMPORARY debug endpoint — remove after confirming Railway env vars
export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 40) + '...'
      : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? 'SET (length ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')'
      : 'MISSING',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  })
}
