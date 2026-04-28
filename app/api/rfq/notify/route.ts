import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendRFQAlertEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * POST /api/rfq/notify
 * Called by the RFQ create page after a successful insert.
 * Finds up to 20 active engineers whose category matches the RFQ
 * and fires a non-blocking alert email to each.
 * Body: { rfqId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { rfqId } = await req.json()
    if (!rfqId) return NextResponse.json({ error: 'rfqId required' }, { status: 400 })

    const supabase = await createClient()

    // Auth check — must be logged in (the client who just submitted)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the RFQ
    const { data: rfq } = await supabase
      .from('rfqs')
      .select('title, category, budget, client_id')
      .eq('id', rfqId)
      .single()

    if (!rfq) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })

    // Fetch the client name
    const { data: client } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', rfq.client_id)
      .single()

    // Find up to 20 active engineers — ideally matching category
    // We match on any service they have in the same category
    const { data: matchingProviders } = await supabase
      .from('services')
      .select('provider_id')
      .eq('category', rfq.category)
      .eq('active', true)
      .limit(20)

    const providerIds = Array.from(new Set((matchingProviders || []).map((r: any) => r.provider_id)))

    if (providerIds.length === 0) {
      return NextResponse.json({ notified: 0 })
    }

    // Fetch their profile emails
    const { data: engineers } = await supabase
      .from('profiles')
      .select('full_name, email')
      .in('id', providerIds)
      .eq('user_type', 'engineer')

    if (!engineers || engineers.length === 0) {
      return NextResponse.json({ notified: 0 })
    }

    // Fire emails in parallel — never block on failure
    await Promise.allSettled(
      engineers.map((eng: any) =>
        sendRFQAlertEmail({
          to:           eng.email,
          engineerName: eng.full_name,
          rfqTitle:     rfq.title,
          rfqCategory:  rfq.category,
          budget:       rfq.budget || null,
          clientName:   client?.full_name || 'A client',
        })
      )
    )

    return NextResponse.json({ notified: engineers.length })

  } catch (err: any) {
    console.error('[rfq/notify]', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
