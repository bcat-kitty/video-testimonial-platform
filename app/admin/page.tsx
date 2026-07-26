import type { Metadata } from 'next';
import { authConfigured, isAuthenticated, isOpenAdmin } from '@/lib/auth';
import { emailEnabled } from '@/lib/email';
import { aiEnabled } from '@/lib/ai';
import { isDemoMode, listRequests, listTestimonials } from '@/lib/store';
import { categoryLabel } from '@/vouch.config';
import type { Testimonial } from '@/lib/db/schema';
import LoginForm from './LoginForm';
import SendRequestForm from './SendRequestForm';
import {
  cancelRequestAction,
  deleteTestimonialAction,
  logoutAction,
  resendRequestAction,
  toggleApprovalAction,
  toggleFeaturedAction,
} from './actions';

export const metadata: Metadata = { title: 'Vouch admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function Banner({ tone, children }: { tone: 'warn' | 'info'; children: React.ReactNode }) {
  const styles =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-zinc-200 bg-zinc-50 text-zinc-600';
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-zinc-900">
            {t.name}
            <span className="font-normal text-zinc-500">
              {' '}
              · {t.role}
              {t.company ? `, ${t.company}` : ''}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{t.createdAt.toLocaleDateString()}</span>
            {t.category && <span>· {categoryLabel(t.category)}</span>}
            {t.verifiedCustomer && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                Verified
              </span>
            )}
            {t.videoUrl && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600">Video</span>
            )}
            {t.featured && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                Featured
              </span>
            )}
          </p>
        </div>
      </header>

      {t.videoUrl && (
        <video src={t.videoUrl} controls preload="metadata" className="mb-4 w-full rounded-xl bg-black" />
      )}

      <div className="space-y-2 text-sm leading-relaxed">
        {t.situationBefore && <p className="text-zinc-500">{t.situationBefore}</p>}
        {t.whatChanged && <p className="font-medium text-zinc-900">{t.whatChanged}</p>}
        {t.recommendation && (
          <p className="border-l-2 border-zinc-900 pl-3 text-zinc-800 italic">
            &ldquo;{t.recommendation}&rdquo;
          </p>
        )}
        {!t.situationBefore && !t.whatChanged && !t.recommendation && (
          <p className="text-zinc-400 italic">
            {t.videoUrl
              ? 'No text yet. Transcription runs in the background, refresh in a minute. If OPENAI_API_KEY is unset, it will stay empty.'
              : 'No content.'}
          </p>
        )}
      </div>

      {t.videoTranscript && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-500">Transcript</summary>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{t.videoTranscript}</p>
        </details>
      )}

      <footer className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
        <form action={toggleApprovalAction}>
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            className={
              t.approved
                ? 'rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400'
                : 'rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-contrast hover:opacity-90'
            }
          >
            {t.approved ? 'Unpublish' : 'Approve and publish'}
          </button>
        </form>
        <form action={toggleFeaturedAction}>
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
          >
            {t.featured ? 'Unfeature' : 'Feature'}
          </button>
        </form>
        <form action={deleteTestimonialAction} className="ml-auto">
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
            Delete
          </button>
        </form>
      </footer>
    </article>
  );
}

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    // No password set in production means the admin is unreachable, by design.
    if (!authConfigured()) {
      return (
        <main className="mx-auto max-w-lg px-4 py-24">
          <Banner tone="warn">
            <strong>ADMIN_PASSWORD is not set.</strong> The admin is locked in production for safety.
            Set it in your environment and redeploy.
          </Banner>
        </main>
      );
    }
    return <LoginForm />;
  }

  const [all, requests] = await Promise.all([listTestimonials(), listRequests()]);
  const received = all.filter((t) => !t.approved);
  const live = all.filter((t) => t.approved);
  const pending = requests.filter((r) => !r.respondedAt && !r.cancelledAt);

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Testimonials</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {live.length} live · {received.length} awaiting review · {pending.length} requests out
          </p>
        </div>
        {!isOpenAdmin() && (
          <form action={logoutAction}>
            <button className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Sign out</button>
          </form>
        )}
      </header>

      <div className="space-y-3">
        {isDemoMode() && (
          <Banner tone="warn">
            <strong>Demo mode.</strong> No DATABASE_URL is set, so this is in-memory sample data that
            resets when the server restarts. Everything works, nothing persists.
          </Banner>
        )}
        {isOpenAdmin() && (
          <Banner tone="warn">
            <strong>No admin password.</strong> This page is open because you are in development. Set
            ADMIN_PASSWORD before deploying.
          </Banner>
        )}
        {!aiEnabled() && (
          <Banner tone="info">
            OPENAI_API_KEY is not set, so video testimonials are stored and playable but will not be
            transcribed or written up.
          </Banner>
        )}
      </div>

      <SendRequestForm emailEnabled={emailEnabled()} />

      {pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Waiting on a reply</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{r.name || r.email}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {r.email} · sent {r.sentAt.toLocaleDateString()}
                    {r.resendCount > 0 ? ' · nudged once' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.resendCount === 0 && (
                    <form action={resendRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="email" value={r.email} />
                      <input type="hidden" name="name" value={r.name || ''} />
                      <input type="hidden" name="token" value={r.token} />
                      <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400">
                        Nudge
                      </button>
                    </form>
                  )}
                  <form action={cancelRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900">
                      Cancel
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Awaiting your review{received.length > 0 && ` (${received.length})`}
        </h2>
        {received.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 px-5 py-8 text-center text-sm text-zinc-500">
            Nothing waiting. Everything that has come in is either published or deleted.
          </p>
        ) : (
          <div className="space-y-4">
            {received.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Live on your site ({live.length})</h2>
        <div className="space-y-4">
          {live.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </section>
    </main>
  );
}
