import { fetchTestimonials, type DebriefTestimonial } from './debrief-client';

/**
 * A compact row of quotes. Drop it on a homepage or under a pricing table.
 *
 *   <TestimonialStrip limit={4} />
 *
 * Renders nothing at all when there are no approved testimonials, so it is
 * safe to place before you have collected any.
 */
interface TestimonialStripProps {
  category?: string;
  limit?: number;
  featured?: boolean;
  heading?: string;
  /** Pass testimonials directly to skip the fetch (useful if you already have them). */
  testimonials?: DebriefTestimonial[];
}

export default async function TestimonialStrip({
  category,
  limit = 3,
  featured,
  heading,
  testimonials,
}: TestimonialStripProps) {
  const items = testimonials ?? (await fetchTestimonials({ category, limit, featured }));
  if (items.length === 0) return null;

  return (
    <section className="w-full py-16">
      <div className="mx-auto max-w-6xl px-4">
        {heading && (
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight text-zinc-900">
            {heading}
          </h2>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.id}
              className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <blockquote className="text-[15px] leading-relaxed text-zinc-700">
                &ldquo;{t.recommendation || t.whatChanged || t.situationBefore}&rdquo;
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4">
                {t.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.headshotUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500">
                    {t.name.charAt(0)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-900">{t.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {t.role}
                    {t.company ? `, ${t.company}` : ''}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
