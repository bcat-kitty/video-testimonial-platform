import type { Metadata } from 'next';
import { debriefConfig } from '@/debrief.config';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-16 text-center">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl text-accent">
        ✓
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900">That is genuinely helpful.</h1>
      <p className="text-base leading-relaxed text-zinc-600">
        Thank you for taking the time. {debriefConfig.senderName} will review it shortly, and it will
        only appear publicly once it has been approved.
      </p>
    </main>
  );
}
