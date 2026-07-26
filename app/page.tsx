import Link from 'next/link';
import { listTestimonials } from '@/lib/store';
import { toPublic } from '@/lib/public-shape';
import { debriefConfig } from '@/debrief.config';
import TestimonialStrip from '@/components/debrief/TestimonialStrip';

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
 * The instance's own front page. It exists so that after `npm run dev` you can
 * see the whole system working immediately, and so the components can be shown
 * rendering real data from this very instance.
 *
 * Delete this file if you would rather the instance have no public homepage.
 */
export default async function HomePage() {
  const [items, repo] = await Promise.all([
    listTestimonials({ approvedOnly: true }).then((rows) => rows.slice(0, 3).map(toPublic)),
    getRepoStats(),
  ]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <span className="text-sm font-bold tracking-widest text-accent uppercase">Debrief</span>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <Link href="/submit" className="hover:text-zinc-900">
              Recording page
            </Link>
            <Link href="/admin" className="hover:text-zinc-900">
              Admin
            </Link>
            <a
              href={`https://github.com/${REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 hover:border-zinc-300 hover:text-zinc-900"
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              <span>GitHub</span>
              {repo && (
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  <span title={`${repo.stars} stars`}>★ {repo.stars}</span>
                  <span title={`${repo.forks} forks`}>⑂ {repo.forks}</span>
                </span>
              )}
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pt-20 pb-8 text-center">
          <p className="mb-4 text-xs font-semibold tracking-widest text-accent uppercase">
            Automated testimonial system
          </p>
          <h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Testimonials that fill themselves.
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Debrief emails your customer a personal recording link, captures their video in the browser,
            transcribes it, writes it up in their own words, and waits for your approval before any of
            it becomes public.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/admin" className="d-btn">
              Open the admin
            </Link>
            <Link href="/submit" className="d-btn-secondary">
              See the recording page
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Ask',
                body: 'Send a request from the admin, a script, or your CRM. Everyone gets their own link, and one automatic nudge a week later.',
              },
              {
                step: '02',
                title: 'Record',
                body: 'They answer three questions on camera, straight from a phone or laptop. No app, no account, no login.',
              },
              {
                step: '03',
                title: 'Publish',
                body: 'The video is transcribed and written up. You approve it, and it appears wherever you put the component.',
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
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-500">
          <span>
            Debrief, configured for {debriefConfig.brandName}. Edit{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">debrief.config.ts</code> to
            make it yours.
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
