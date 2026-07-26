import { Resend } from 'resend';
import { debriefConfig } from '@/debrief.config';

/**
 * Email is optional. Without RESEND_API_KEY, Debrief still creates the request
 * and its link, it just reports back that nothing was sent so the admin can
 * copy the link and send it however they like.
 */

export const emailEnabled = (): boolean => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

const from = () => process.env.EMAIL_FROM || `${debriefConfig.brandName} <onboarding@resend.dev>`;

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function buildSubmitLink(opts: {
  token: string;
  name?: string | null;
  email?: string | null;
  category?: string | null;
}): string {
  const url = new URL(`${appUrl()}/submit`);
  url.searchParams.set('token', opts.token);
  if (opts.name) url.searchParams.set('name', opts.name);
  if (opts.email) url.searchParams.set('email', opts.email);
  if (opts.category) url.searchParams.set('category', opts.category);
  return url.toString();
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Never greet someone as "Hi jane@acme.com,". Fall back to the email's local part. */
export function displayName(name: string | null | undefined, email: string): string {
  const trimmed = (name || '').trim();
  if (trimmed && !EMAIL_LIKE.test(trimmed)) return trimmed;
  const local = email.split('@')[0] || '';
  const cleaned = local.replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
  if (!cleaned) return 'there';
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export type SendResult = { sent: boolean; link: string; reason?: string };

export async function sendRequestEmail(opts: {
  to: string;
  name: string | null;
  token: string;
  category: string | null;
  customMessage?: string | null;
  variant?: 'initial' | 'nudge';
}): Promise<SendResult> {
  const link = buildSubmitLink({
    token: opts.token,
    name: displayName(opts.name, opts.to),
    email: opts.to,
    category: opts.category,
  });

  if (!emailEnabled()) {
    return { sent: false, link, reason: 'RESEND_API_KEY or EMAIL_FROM not set' };
  }

  const { brandName, senderName, questions } = debriefConfig;
  const firstName = displayName(opts.name, opts.to).split(' ')[0];
  const isNudge = opts.variant === 'nudge';

  const subject = isNudge
    ? 'Quick nudge, testimonial?'
    : 'Quick favor, would you share your experience?';
  const lead = isNudge
    ? 'I sent this last week and figure it slipped past. Same link, same ask. Two minutes if you have them.'
    : `I would love for you to record a short testimonial about working with ${brandName}. It would mean a lot.`;

  const customBlock = opts.customMessage
    ? `<tr><td style="padding:0 0 24px 20px;color:#3f3f46;font-size:15px;line-height:1.7;border-left:3px solid ${debriefConfig.accent};">${escapeHtml(
        opts.customMessage,
      ).replace(/\n/g, '<br/>')}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;padding:40px;">
  <tr><td style="padding-bottom:28px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${debriefConfig.accent};">${escapeHtml(brandName)}</td></tr>
  <tr><td style="color:#18181b;font-size:22px;font-weight:700;line-height:1.3;padding-bottom:20px;">Hi ${escapeHtml(firstName)},</td></tr>
  ${customBlock}
  <tr><td style="color:#3f3f46;font-size:16px;line-height:1.7;padding-bottom:20px;">${escapeHtml(lead)}</td></tr>
  <tr><td style="color:#52525b;font-size:15px;line-height:1.7;padding-bottom:10px;">When you record, just answer these three:</td></tr>
  <tr><td style="padding-bottom:28px;">
    <ol style="color:#18181b;font-size:15px;line-height:1.7;padding-left:20px;margin:0;">
      <li style="margin-bottom:6px;">${escapeHtml(questions.before)}</li>
      <li style="margin-bottom:6px;">${escapeHtml(questions.after)}</li>
      <li>${escapeHtml(questions.recommend)}</li>
    </ol>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <a href="${link}" style="display:inline-block;background:${debriefConfig.accent};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Record your testimonial</a>
  </td></tr>
  <tr><td style="color:#71717a;font-size:14px;line-height:1.7;">You can record straight from your phone or laptop, no app needed. Prefer to type it? There is a text option on the same page.<br/><br/>Thank you,<br/>${escapeHtml(senderName)}</td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: from(),
      to: opts.to,
      subject,
      html,
    });
    return { sent: true, link };
  } catch (err) {
    console.error('[debrief] request email failed', err);
    return { sent: false, link, reason: err instanceof Error ? err.message : 'send failed' };
  }
}

/** Tells you a testimonial landed and is waiting for approval. Silent no-op if unconfigured. */
export async function sendNewSubmissionNotification(data: { name: string; role: string; company: string | null }) {
  const to = process.env.EMAIL_NOTIFY;
  if (!emailEnabled() || !to) return;

  const who = `${data.name}, ${data.role}${data.company ? ` at ${data.company}` : ''}`;
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: from(),
      to,
      subject: `New testimonial from ${data.name}`,
      html: `<div style="font-family:-apple-system,Arial,sans-serif;font-size:15px;line-height:1.7;color:#18181b;">
        <p><strong>${escapeHtml(who)}</strong> just submitted a testimonial.</p>
        <p>It is not public yet. Review and approve it at <a href="${appUrl()}/admin">${appUrl()}/admin</a>.</p>
      </div>`,
    });
  } catch (err) {
    console.error('[debrief] notification email failed', err);
  }
}
