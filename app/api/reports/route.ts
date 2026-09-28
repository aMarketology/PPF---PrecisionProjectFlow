import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TARGET_TYPES = ['user', 'service', 'product', 'rfq', 'company', 'message'];
const REASONS = ['spam', 'fraud', 'quality', 'abuse', 'other'];

// POST /api/reports  { targetType, targetId, reason, description }
// Files a content report from the signed-in user. Feeds /admin/reports.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to report content' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { targetType, targetId, reason, description } = body ?? {};

    if (!TARGET_TYPES.includes(targetType)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }
    if (!REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }
    if (targetId && targetId === user.id) {
      return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 });
    }

    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId || null,
      reason,
      description: description?.trim() || null,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reports POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
