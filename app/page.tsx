import Link from 'next/link';
import { listTestimonials } from '@/lib/store';
import { toPublic } from '@/lib/public-shape';
import { vouchConfig } from '@/vouch.config';
import TestimonialStrip from '@/components/vouch/TestimonialStrip';

export const dynamic = 'force-dynamic';

/**
 * The instance's own front page. It exists so that after `npm run dev` you can
 * see the whole system working immediately, and so the components can be shown
 * rendering real data from this very instance.
 *
 * Delete this file if you would rather the instance have no public homepage.
 */
export default async function HomePage() {
  const items = (await listTestimonials({ approvedOnly: true })).slice(0, 3).map(toPublic);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <span className="text-sm font-bold tracking-widest text-accent uppercase">Vouch</span>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <Link href="/submit" className="hover:text-zinc-900">
              Recording page
            </Link>
            <Link href="/admin" className="hover:text-zinc-900">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pt-20 pb-8 text-center">
          <p className="mb-4 text-xs font-semibold tracking-widest text-accent uppercase">
            Self-hosted testimonial engine
          </p>
          <h1 className="mb-6 text-4xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Send a link. They record a video. You get a written testimonial.
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Vouch emails your customer a personal recording link, captures their video in the browser,
            transcribes it, writes it up in their own words, and waits for your approval before any of
            it becomes public.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/admin" className="v-btn">
              Open the admin
            </Link>
            <Link href="/submit" className="v-btn-secondary">
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
                {`import TestimonialStrip from '@/components/vouch/TestimonialStrip'\n\n<TestimonialStrip limit={3} heading="What people say" />`}
              </pre>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-500">
          Vouch, configured for {vouchConfig.brandName}. Edit{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">vouch.config.ts</code> to
          make it yours.
        </div>
      </footer>
    </div>
  );
}
