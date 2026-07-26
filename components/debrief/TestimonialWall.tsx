import { fetchTestimonials, type DebriefTestimonial } from './debrief-client';

/**
 * The full story version: video if there is one, the before / after / recommend
 * arc if there is not. Use it on a dedicated /testimonials page.
 *
 *   <TestimonialWall />
 */
interface TestimonialWallProps {
  category?: string;
  limit?: number;
  featured?: boolean;
  testimonials?: DebriefTestimonial[];
}

function Attribution({ t }: { t: DebriefTestimonial }) {
  const link = t.companyUrl || t.linkedinUrl;
  const label = `${t.role}${t.company ? `, ${t.company}` : ''}`;

  return (
    <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
      {t.headshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.headshotUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500">
          {t.name.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
          {t.name}
          {t.verifiedCustomer && (
            <span
              title="Verified customer"
              className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase"
            >
              Verified
            </span>
          )}
        </p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 underline-offset-2 hover:underline"
          >
            {label}
          </a>
        ) : (
          <p className="text-xs text-zinc-500">{label}</p>
        )}
      </div>
    </div>
  );
}

export default async function TestimonialWall({
  category,
  limit = 24,
  featured,
  testimonials,
}: TestimonialWallProps) {
  const items = testimonials ?? (await fetchTestimonials({ category, limit, featured }));
  if (items.length === 0) return null;

  return (
    <section className="w-full py-12">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 md:grid-cols-2">
        {items.map((t) => (
          <article
            key={t.id}
            id={t.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            {t.videoUrl && (
              <video
                src={t.videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={t.headshotUrl || undefined}
                className="mb-6 w-full rounded-xl bg-black"
              />
            )}

            <div className="flex-1 space-y-4">
              {t.situationBefore && (
                <p className="text-sm leading-relaxed text-zinc-500">{t.situationBefore}</p>
              )}
              {t.whatChanged && (
                <p className="text-[15px] leading-relaxed font-medium text-zinc-900">{t.whatChanged}</p>
              )}
              {t.recommendation && (
                <blockquote className="border-l-2 border-zinc-900 pl-4 text-[15px] leading-relaxed text-zinc-800 italic">
                  &ldquo;{t.recommendation}&rdquo;
                </blockquote>
              )}
            </div>

            <Attribution t={t} />
          </article>
        ))}
      </div>
    </section>
  );
}
