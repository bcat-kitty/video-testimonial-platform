import type { Metadata } from 'next';
import Link from 'next/link';
import { authConfigured, isAuthenticated, isOpenAdmin } from '@/lib/auth';
import { emailEnabled } from '@/lib/email';
import { aiEnabled } from '@/lib/ai';
import { isDemoMode, listRequests, listTestimonials } from '@/lib/store';
import { categoryLabel } from '@/debrief.config';
import type { Testimonial, TestimonialRequest } from '@/lib/db/types';
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

export const metadata: Metadata = { title: 'Debrief admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Three views, one at a time. The whole point is that the owner's side is a
 * dashboard you can take in at a glance, not a page you scroll through. Which
 * view you are on lives in the URL, so it survives a server action, a refresh,
 * and a bookmark, and the page stays a server component with no client state.
 */
type View = 'review' | 'live' | 'requests';

const VIEWS: View[] = ['review', 'live', 'requests'];

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
      {initials(name)}
    </span>
  );
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'star' }) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-600',
    good: 'bg-emerald-50 text-emerald-700',
    star: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
  );
}

function Tab({
  view,
  active,
  count,
  label,
  short,
}: {
  view: View;
  active: boolean;
  count: number;
  label: string;
  short: string;
}) {
  return (
    <Link
      href={`/admin?view=${view}`}
      aria-current={active ? 'page' : undefined}
      className={`relative flex-1 border-l border-zinc-100 px-4 py-4 transition-colors first:border-l-0 sm:px-5 ${
        active ? 'bg-accent/5' : 'hover:bg-zinc-50'
      }`}
    >
      <span className={`block text-2xl font-bold ${active ? 'text-accent' : 'text-zinc-900'}`}>{count}</span>
      <span className="block text-[11px] font-medium text-zinc-500 sm:text-xs">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
    </Link>
  );
}

function Reveal({ label }: { label: string }) {
  return (
    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-accent [&::-webkit-details-marker]:hidden">
      <svg
        viewBox="0 0 12 12"
        className="size-3 transition-transform group-open:rotate-90"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m4 2 4 4-4 4" />
      </svg>
      {label}
    </summary>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm">
      {children}
    </p>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const quote = t.recommendation || t.whatChanged || t.situationBefore;
  const hasText = Boolean(t.situationBefore || t.whatChanged || t.recommendation);

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <header className="flex items-start gap-3">
        <Avatar name={t.name} url={t.headshotUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{t.name}</p>
          <p className="truncate text-xs text-zinc-500">
            {t.role}
            {t.company ? `, ${t.company}` : ''} · {t.createdAt.toLocaleDateString()}
          </p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {t.verifiedCustomer && <Chip tone="good">Verified</Chip>}
        {t.featured && <Chip tone="star">Featured</Chip>}
        {t.videoUrl && <Chip>Video</Chip>}
        {t.category && <Chip>{categoryLabel(t.category)}</Chip>}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-700">
        {quote || (
          <span className="text-zinc-400 italic">
            {t.videoUrl
              ? 'Video received, no text yet. Transcription runs in the background.'
              : 'No content.'}
          </span>
        )}
      </p>

      {(hasText || t.videoUrl) && (
        <details className="group mt-3">
          <Reveal label={t.videoUrl ? 'Watch and read the full story' : 'Read the full story'} />

          {t.videoUrl && (
            <video src={t.videoUrl} controls preload="metadata" className="mt-3 w-full rounded-xl bg-black" />
          )}

          <div className="mt-3 space-y-2 text-sm leading-relaxed">
            {t.situationBefore && <p className="text-zinc-500">{t.situationBefore}</p>}
            {t.whatChanged && <p className="text-zinc-800">{t.whatChanged}</p>}
            {t.recommendation && (
              <p className="border-l-2 border-accent pl-3 text-zinc-800 italic">
                &ldquo;{t.recommendation}&rdquo;
              </p>
            )}
            {t.videoTranscript && (
              <p className="border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-500">Transcript. </span>
                {t.videoTranscript}
              </p>
            )}
          </div>
        </details>
      )}

      <div className="grow" />

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
        <form action={toggleApprovalAction}>
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            className={
              t.approved
                ? 'rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400'
                : 'rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast hover:opacity-90'
            }
          >
            {t.approved ? 'Unpublish' : 'Approve'}
          </button>
        </form>
        <form action={toggleFeaturedAction}>
          <input type="hidden" name="id" value={t.id} />
          <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400">
            {t.featured ? 'Unfeature' : 'Feature'}
          </button>
        </form>
        <form action={deleteTestimonialAction} className="ml-auto">
          <input type="hidden" name="id" value={t.id} />
          <button className="rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-red-50 hover:text-red-600">
            Delete
          </button>
        </form>
      </footer>
    </article>
  );
}

function RequestRow({ r }: { r: TestimonialRequest }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar name={r.name || r.email} />
      {/* Full width on a phone, so the name and email never truncate to initials. */}
      <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
        <p className="truncate text-sm font-medium text-zinc-900">{r.name || r.email}</p>
        <p className="truncate text-xs text-zinc-500">
          {r.email} · sent {r.sentAt.toLocaleDateString()}
        </p>
      </div>
      {r.resendCount > 0 ? <Chip>Nudged</Chip> : <Chip tone="good">Waiting</Chip>}
      <div className="ml-auto flex w-32 shrink-0 justify-end gap-1">
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
          <button className="rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-red-50 hover:text-red-600">
            Cancel
          </button>
        </form>
      </div>
    </li>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (!(await isAuthenticated())) {
    // A real deployment with no password set means the admin is unreachable, by design.
    if (!authConfigured()) {
      return (
        <main className="mx-auto max-w-lg px-4 py-24">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>ADMIN_PASSWORD is not set.</strong> The admin is locked in production for safety.
            Set it in your environment and redeploy.
          </div>
        </main>
      );
    }
    return <LoginForm />;
  }

  const requested = (await searchParams).view;
  const view: View = VIEWS.includes(requested as View) ? (requested as View) : 'review';

  const [all, requests] = await Promise.all([listTestimonials(), listRequests()]);
  const received = all.filter((t) => !t.approved);
  const live = all.filter((t) => t.approved);
  const pending = requests.filter((r) => !r.respondedAt && !r.cancelledAt);

  const notes = [
    isDemoMode() &&
      'Demo mode. No DATABASE_URL is set, so this is in-memory sample data that resets when the server restarts. Everything works, nothing persists.',
    isOpenAdmin() &&
      !isDemoMode() &&
      'No admin password. This page is open because you are in development. Set ADMIN_PASSWORD before deploying.',
    !aiEnabled() &&
      'OPENAI_API_KEY is not set, so video testimonials are stored and playable but not transcribed or written up.',
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm font-bold tracking-widest text-accent uppercase">
            Debrief
          </Link>
          <span className="text-sm text-zinc-300">/</span>
          <span className="text-sm font-medium text-zinc-500">Admin</span>
          {isDemoMode() && (
            <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              Demo
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <SendRequestForm emailEnabled={emailEnabled()} />
            {!isOpenAdmin() && (
              <form action={logoutAction}>
                <button className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <nav className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <Tab
            view="review"
            active={view === 'review'}
            count={received.length}
            label="Awaiting review"
            short="To review"
          />
          <Tab
            view="live"
            active={view === 'live'}
            count={live.length}
            label="Live on your site"
            short="Live"
          />
          <Tab
            view="requests"
            active={view === 'requests'}
            count={pending.length}
            label="Requests out"
            short="Sent"
          />
        </nav>

        {notes.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
              About this instance
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-zinc-500">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {view === 'review' &&
          (received.length === 0 ? (
            <Empty>
              Nothing waiting on you. Everything that has come in is published or deleted.
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {received.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          ))}

        {view === 'live' &&
          (live.length === 0 ? (
            <Empty>
              Nothing is public yet. Approve something from the review tab and it appears here, and
              on your site, immediately.
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {live.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          ))}

        {view === 'requests' &&
          (pending.length === 0 ? (
            <Empty>No requests are out. Use New request above to ask someone.</Empty>
          ) : (
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {pending.map((r) => (
                <RequestRow key={r.id} r={r} />
              ))}
            </ul>
          ))}
      </main>
    </div>
  );
}
