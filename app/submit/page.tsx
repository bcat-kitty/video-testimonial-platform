import { randomBytes } from 'node:crypto';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { debriefConfig } from '@/debrief.config';
import { createRequest, findOpenRequest, isDemoMode } from '@/lib/store';
import TestimonialForm from './TestimonialForm';

export const metadata: Metadata = {
  // Recording links are personal. Keep them out of search results.
  robots: { index: false, follow: false },
};

/** One standing walk-in invite for the demo, reused rather than one per visitor. */
const DEMO_VISITOR_EMAIL = 'you@example.com';

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim();

  if (!token && debriefConfig.inviteOnly) {
    // The demo has nobody to email you a link, so it issues one on the spot.
    // This is not a bypass: it creates a real request and hands back its real
    // token, exactly like an owner clicking Send. It reuses the open invite
    // when there is one, so the admin does not collect a row per visitor.
    if (isDemoMode()) {
      const open = await findOpenRequest({ email: DEMO_VISITOR_EMAIL });
      const invite =
        open ??
        (await createRequest({
          token: randomBytes(24).toString('base64url'),
          email: DEMO_VISITOR_EMAIL,
          name: null,
          category: null,
          customMessage: null,
        }));
      redirect(`/submit?token=${invite.token}`);
    }

    // A real instance: say so plainly rather than letting someone fill in the
    // whole form and hit a 403 at the end.
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <p className="mb-4 text-xs font-bold tracking-widest text-accent uppercase">
            {debriefConfig.recordingPage.eyebrow}
          </p>
          <h1 className="mb-3 text-xl font-bold tracking-tight text-zinc-900">
            You need your own link
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500">
            Recording links are personal, so this page only opens from the one{' '}
            {debriefConfig.senderName} emailed you. Check that email, or reply and ask for a fresh
            link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <Suspense>
      <TestimonialForm uploadsEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
    </Suspense>
  );
}
