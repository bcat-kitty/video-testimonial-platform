import Link from 'next/link';
import { isDemoMode, listTestimonials } from '@/lib/store';
import { toPublic } from '@/lib/public-shape';
import { debriefConfig } from '@/debrief.config';
import TestimonialStrip from '@/components/debrief/TestimonialStrip';
import VoiceField from './VoiceField';

export const dynamic = 'force-dynamic';

const REPO = 'anurieli/debrief';

/**
 * Live star and fork counts for the project. Cached for an hour, and the page
 * renders a plain GitHub link when the API is unreachable or rate-limited.
 */
async function getRepoStats(): Promise<{ stars: number; forks: number } | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number; forks_count?: number };
    if (typeof data.stargazers_count !== 'number') return null;
    return { stars: data.stargazers_count, forks: data.forks_count ?? 0 };
  } catch {
    return null;
  }
}

/**
 * The instance's own front page.
 *
 * It has two jobs depending on who deployed it. On the public demo (no database,
 * so `isDemoMode()` is true) it is a shop window: it says plainly that this is a
 * demo and sends you to the two sides of the product. On a real instance it is
 * just a front page for that company.
 *
 * Delete this file if you would rather the instance have no public homepage.
 */
export default async function HomePage() {
  const [items, repo, demo] = await Promise.all([
    listTestimonials({ approvedOnly: true }).then((rows) => rows.slice(0, 3).map(toPublic)),
    getRepoStats(),
    Promise.resolve(isDemoMode()),
  ]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold tracking-widest text-accent uppercase">Debrief</span>
            {demo && (
              <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                Demo
              </span>
            )}
          </div>
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            <span>Star on GitHub</span>
            {repo && (
              <span className="flex items-center gap-2 text-xs text-zinc-500">
                <span title={`${repo.stars} stars`}>★ {repo.stars}</span>
                <span title={`${repo.forks} forks`}>⑂ {repo.forks}</span>
              </span>
            )}
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <VoiceField />

          <div className="relative mx-auto max-w-3xl px-4 pt-20 pb-40 text-center sm:pb-52">
            <p className="mb-4 text-xs font-semibold tracking-widest text-accent uppercase">
              {demo ? 'Live demo, nothing here is real' : 'Automated testimonial system'}
            </p>
            <h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Testimonials that fill themselves.
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Debrief emails your customer a link. They talk to their phone for ninety seconds. It
              transcribes what they said, writes it up in their own words, and waits for your
              approval before any of it goes public.
            </p>

            {demo ? (
              <>
                <p className="mx-auto mb-5 max-w-xl text-sm text-zinc-500">
                  There are two sides to it. Try them in either order.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/submit" className="d-btn">
                    Give a testimonial
                  </Link>
                  <Link href="/admin" className="d-btn-secondary">
                    See the owner&apos;s side
                  </Link>
                </div>
                <p className="mt-4 text-xs text-zinc-400">
                  Admin password is{' '}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">debrief-demo</code>.
                  Approve or delete anything you like, it resets itself.
                </p>
              </>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/submit" className="d-btn">
                  Share your experience
                </Link>
                <Link href="/admin" className="d-btn-secondary">
                  Admin
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'You send a link',
                body: 'From the admin, a script, or your CRM. Everyone gets their own link, and one automatic nudge a week later so you never chase anyone.',
              },
              {
                step: '02',
                title: 'They talk',
                body: 'Three questions, one at a time, straight from a phone or laptop. No app, no account, no login. Ninety seconds and they are done.',
              },
              {
                step: '03',
                title: 'You approve',
                body: 'It comes back transcribed and written up. Nothing is public until you say so, and then it appears wherever you put the component.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="mb-3 font-mono text-xs font-semibold text-accent">{s.step}</p>
                <h3 className="mb-2 font-semibold text-zinc-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {items.length > 0 && (
          <section className="border-t border-zinc-200 bg-zinc-50/60">
            <div className="mx-auto max-w-6xl px-4 pt-14 text-center">
              <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
                This is the component, rendering live from this instance
              </p>
            </div>
            <TestimonialStrip testimonials={items} heading="What people say" />
            <div className="mx-auto max-w-2xl px-4 pb-16 text-center">
              <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-left font-mono text-xs text-zinc-700">
                {`import TestimonialStrip from '@/components/debrief/TestimonialStrip'\n\n<TestimonialStrip limit={3} heading="What people say" />`}
              </pre>
              <p className="mt-4 text-sm text-zinc-500">
                Three files and one env var in your own codebase. That is the whole integration.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-500">
          <span>
            {demo ? (
              <>
                A live demo of Debrief. Everything resets, so poke at it.
              </>
            ) : (
              <>
                Debrief, configured for {debriefConfig.brandName}. Edit{' '}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                  debrief.config.ts
                </code>{' '}
                to make it yours.
              </>
            )}
          </span>
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700"
          >
            Open source, MIT{repo ? ` · ★ ${repo.stars} · ⑂ ${repo.forks}` : ''}
          </a>
        </div>
      </footer>
    </div>
  );
}
