import { NextResponse } from 'next/server';
import { sendRequestEmail } from '@/lib/email';
import { findRequestsNeedingNudge, updateRequest } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NUDGE_AFTER_DAYS = 7;

/**
 * One follow-up, seven days later, and then it leaves people alone. Anything
 * past that is a conversation, not a cron job.
 *
 * On Vercel, wire it in vercel.json:
 *   { "crons": [{ "path": "/api/cron/nudges", "schedule": "0 14 * * *" }] }
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - NUDGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const due = await findRequestsNeedingNudge(cutoff);

  let sent = 0;
  for (const req of due) {
    const result = await sendRequestEmail({
      to: req.email,
      name: req.name,
      token: req.token,
      category: req.category,
      variant: 'nudge',
    });

    // Only count it as nudged if it actually went out, so a mail outage does
    // not silently burn everyone's single follow-up.
    if (result.sent) {
      await updateRequest(req.id, { resendCount: 1, lastResentAt: new Date() });
      sent += 1;
    }
  }

  return NextResponse.json({ due: due.length, sent });
}
