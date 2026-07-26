import { NextResponse } from 'next/server';
import { listTestimonials } from '@/lib/store';
import { toPublic } from '@/lib/public-shape';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/testimonials
 *
 * The endpoint your website reads. Approved testimonials only, no email
 * addresses, CORS open so it works from a browser on any domain.
 *
 * Query: ?category=consulting&limit=6&featured=true
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const featured = searchParams.get('featured') === 'true';
  const rawLimit = Number(searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 100;

  try {
    let rows = await listTestimonials({ approvedOnly: true, category });
    if (featured) rows = rows.filter((t) => t.featured);

    return NextResponse.json(
      { testimonials: rows.slice(0, limit).map(toPublic) },
      { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' } },
    );
  } catch (err) {
    console.error('[debrief] public list failed', err);
    return NextResponse.json({ testimonials: [] }, { status: 500 });
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
