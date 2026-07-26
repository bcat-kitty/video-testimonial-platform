/**
 * The only thing that talks to your Debrief instance.
 *
 * Copy this file (and its sibling components) into your own site. Point
 * NEXT_PUBLIC_DEBRIEF_URL at your deployed Debrief instance and you are done.
 */

export interface DebriefTestimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  companyUrl: string | null;
  linkedinUrl: string | null;
  headshotUrl: string | null;
  videoUrl: string | null;
  situationBefore: string | null;
  whatChanged: string | null;
  recommendation: string | null;
  category: string | null;
  featured: boolean;
  verifiedCustomer: boolean;
  createdAt: string;
}

export interface FetchOptions {
  /** Only testimonials in this category. Omit for all of them. */
  category?: string;
  /** Max number to return. */
  limit?: number;
  /** Only testimonials you marked as featured. */
  featured?: boolean;
  /** Seconds to cache. Defaults to 5 minutes. Use 0 to always hit the network. */
  revalidate?: number;
  /** Override the instance URL instead of using NEXT_PUBLIC_DEBRIEF_URL. */
  baseUrl?: string;
}

export function debriefBaseUrl(override?: string): string {
  const url = override || process.env.NEXT_PUBLIC_DEBRIEF_URL || '';
  if (!url) {
    throw new Error('Set NEXT_PUBLIC_DEBRIEF_URL to your Debrief instance, e.g. https://testimonials.acme.com');
  }
  return url.replace(/\/$/, '');
}

/**
 * Approved testimonials only. This endpoint is public and read-only, so it is
 * safe to call from a browser as well as from the server.
 */
export async function fetchTestimonials(opts: FetchOptions = {}): Promise<DebriefTestimonial[]> {
  const url = new URL(`${debriefBaseUrl(opts.baseUrl)}/api/public/testimonials`);
  if (opts.category) url.searchParams.set('category', opts.category);
  if (opts.limit) url.searchParams.set('limit', String(opts.limit));
  if (opts.featured) url.searchParams.set('featured', 'true');

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: opts.revalidate ?? 300 },
    });
    if (!res.ok) {
      console.error('[debrief] fetch failed', res.status);
      return [];
    }
    const data = (await res.json()) as { testimonials?: DebriefTestimonial[] };
    return data.testimonials ?? [];
  } catch (err) {
    // Never take the page down because the testimonial service is having a day.
    console.error('[debrief] fetch error', err);
    return [];
  }
}
