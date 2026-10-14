import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { sendColdOutreachEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/outreach — super-admin cold outreach.
 * Body: { companyId, toEmail, subject, message, templateKey, contactName }
 *
 * Writes to outreach_email_log (unique on company_id + template_key) so the
 * same template is never sent to the same company twice.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const service = createServiceClient();
      const { data: { user }, error } = await service.auth.getUser(authHeader.slice(7).trim());
      if (!error && user) userId = user.id;
    }
    if (!userId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const service = createServiceClient();
    const { data: profile } = await service.from('profiles').select('is_admin').eq('id', userId).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { companyId, toEmail, subject, message, templateKey, contactName } = body ?? {};
    if (!companyId || !toEmail || !subject || !message) {
      return NextResponse.json({ error: 'companyId, toEmail, subject, and message are required' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }

    // Resolve the company (for the email + logging).
    const { data: company } = await service
      .from('company_profiles')
      .select('id, company_name, contact_name')
      .eq('id', companyId)
      .maybeSingle();
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const key = templateKey || 'cold_outreach';

    // ── Testing mode: all cold emails go to our internal inboxes, never ──
    // the real company contact. Remove/disable before going live.
    const TEST_RECIPIENTS = ['precisionprojectflow@gmail.com', 'info@precisionprojectflow.com'];

    // ── Dedupe: has this template already been sent to this company? ──
    const { data: existing } = await service
      .from('outreach_email_log')
      .select('id, sent_at')
      .eq('company_id', companyId)
      .eq('template_key', key)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `Already sent "${key}" to this company on ${new Date(existing.sent_at).toLocaleDateString()}` },
        { status: 409 }
      );
    }

    // Send the email (plain-text for deliverability). During testing the
    // recipient is overridden to our internal inboxes.
    await sendColdOutreachEmail({
      to: TEST_RECIPIENTS,
      companyName: company.company_name,
      contactName: contactName || company.contact_name,
      subject,
      message,
    });

    // Record the send (log the real intended recipient for later review).
    const { error: logErr } = await service.from('outreach_email_log').insert({
      company_id: companyId,
      to_email: toEmail,
      subject,
      template_key: key,
      sent_by: userId,
    });
    if (logErr) throw logErr;

    return NextResponse.json({ success: true, message: `Email sent to ${toEmail}` });
  } catch (error: any) {
    console.error('[admin outreach]', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}

/**
 * GET /api/admin/outreach?companyId=... → list of emails already sent.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const service = createServiceClient();
      const { data: { user }, error } = await service.auth.getUser(authHeader.slice(7).trim());
      if (!error && user) userId = user.id;
    }
    if (!userId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const service = createServiceClient();
    const { data: profile } = await service.from('profiles').select('is_admin').eq('id', userId).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const companyId = new URL(request.url).searchParams.get('companyId');
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 });

    const { data: rows } = await service
      .from('outreach_email_log')
      .select('id, to_email, subject, template_key, sent_at')
      .eq('company_id', companyId)
      .order('sent_at', { ascending: false });

    return NextResponse.json({ sent: rows ?? [] });
  } catch (error: any) {
    console.error('[admin outreach GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to load' }, { status: 500 });
  }
}