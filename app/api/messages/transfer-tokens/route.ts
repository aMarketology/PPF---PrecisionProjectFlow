import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/transfer-tokens
// Transfer tokens to a team member in the same company.
export async function POST(request: NextRequest) {
  try {
    const { receiverId, amount, note } = await request.json();
    if (!receiverId || !amount) {
      return NextResponse.json({ error: 'receiverId and amount required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'amount must be a positive integer' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.rpc('transfer_tokens', {
      p_sender_id: user.id,
      p_receiver_id: receiverId,
      p_amount: amount,
      p_note: note || null,
    });

    if (error) {
      console.error('[transfer-tokens] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check for error strings
    if (typeof data === 'string' && data.startsWith('error:')) {
      const msg = data.replace('error:', '');
      const statusMap: Record<string, number> = {
        'amount must be positive': 400,
        'cannot send to yourself': 400,
        'sender has no company': 400,
        'receiver has no company': 400,
        'not same company': 403,
        'sender not active member': 403,
        'receiver not active member': 403,
        'insufficient_tokens': 402,
      };
      return NextResponse.json({ error: msg }, { status: statusMap[msg] || 400 });
    }

    // data is the new balance
    const newBalance = parseInt(data as string, 10);
    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error('[transfer-tokens] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}