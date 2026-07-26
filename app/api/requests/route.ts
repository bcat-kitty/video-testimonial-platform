import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isApiAuthorized } from '@/lib/auth';
import { buildSubmitLink, sendRequestEmail } from '@/lib/email';
import { createRequest, findOpenRequest, listRequests } from '@/lib/store';

export const runtime = 'nodejs';

/**
 * Send a testimonial request from a script, a cron job, or an AI agent.
 *
 *   curl -X POST https://your-instance/api/requests \
 *     -H "Authorization: Bearer $ADMIN_PASSWORD" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"jane@acme.com","name":"Jane","customMessage":"Loved working on the rollout with you."}'
 *
 * The admin UI does the same thing through a server action. This route takes
 * the bearer token instead, so automation does not need a browser session.
 *
 * Authorization is the bearer token, always. Not `isAuthenticated`, which has
 * bypasses for the demo and local dev that must never reach this route: GET
 * returns customer email addresses. See lib/auth.ts.
 */

export async function POST(request: Request) {
  if (!isApiAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      category?: string;
      customMessage?: string;
    };

    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    // Idempotent on purpose: wire this to a CRM webhook and a double-fire is a
    // no-op, not a second email. The open request wins until it is answered,
    // cancelled, or nudged by the cron.
    const open = await findOpenRequest({ email });
    if (open) {
      return NextResponse.json({
        id: open.id,
        emailed: false,
        existing: true,
        link: buildSubmitLink({ token: open.token, name: open.name, email: open.email, category: open.category }),
        note: 'An open request for this email already exists. No new email was sent.',
      });
    }

    const token = randomBytes(24).toString('base64url');
    const created = await createRequest({
      token,
      email,
      name: body.name?.trim() || null,
      category: body.category?.trim() || null,
      customMessage: body.customMessage?.trim() || null,
    });

    const result = await sendRequestEmail({
      to: email,
      name: created.name,
      token,
      category: created.category,
      customMessage: created.customMessage,
    });

    // The link is always returned, so an unconfigured mailer is an
    // inconvenience rather than a dead end.
    return NextResponse.json({
      id: created.id,
      emailed: result.sent,
      link: result.link,
      ...(result.sent ? {} : { note: result.reason }),
    });
  } catch (err) {
    console.error('[debrief] create request failed', err);
    return NextResponse.json({ error: 'Could not create request.' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  if (!isApiAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await listRequests();
  return NextResponse.json({
    requests: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      status: r.cancelledAt ? 'cancelled' : r.respondedAt ? 'completed' : 'pending',
      sentAt: r.sentAt.toISOString(),
      resendCount: r.resendCount,
    })),
  });
}
