import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/feed/auto-post
// Called internally after a transaction completes to auto-publish a feed post.
// Body: { type: 'service_purchased' | 'service_listed', serviceId, vendorId, buyerId? }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { type, serviceId, vendorId, buyerId } = body;

    if (type === 'service_listed') {
      // Vendor listed a new service — post to feed as a project_showcase
      const { data: service } = await supabase
        .from('services')
        .select('id, title, description, price, category')
        .eq('id', serviceId)
        .single();

      const { data: vendor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', vendorId)
        .single();

      if (service && vendor) {
        await supabase.from('feed_posts').insert({
          author_id:   vendorId,
          content:     `🚀 New service available: **${service.title}**\n\n${service.description.slice(0, 200)}${service.description.length > 200 ? '...' : ''}\n\n💰 Starting at $${Number(service.price).toLocaleString()} · ${service.category}`,
          post_type:   'project_showcase',
          media_urls:  [],
          linked_type: 'service',
          linked_id:   service.id,
          is_published: true,
        });
      }
    }

    if (type === 'service_purchased' && buyerId) {
      // A service was purchased — post milestone to feed (no price revealed, just the activity)
      const { data: service } = await supabase
        .from('services')
        .select('id, title, category, provider_id')
        .eq('id', serviceId)
        .single();

      const { data: buyer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', buyerId)
        .single();

      const { data: vendor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', vendorId)
        .single();

      if (service && buyer && vendor) {
        // Post from the vendor's perspective
        await supabase.from('feed_posts').insert({
          author_id:   vendorId,
          content:     `🎉 New order received for **${service.title}**! Thanks to ${buyer.full_name} for choosing our ${service.category} services. Ready to deliver excellence! 💪`,
          post_type:   'milestone',
          media_urls:  [],
          linked_type: 'service',
          linked_id:   service.id,
          is_published: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Auto-post error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
