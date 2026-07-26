'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { isAuthenticated, login, logout } from '@/lib/auth';
import { buildSubmitLink, sendRequestEmail } from '@/lib/email';
import {
  createRequest,
  deleteTestimonial,
  findOpenRequest,
  getTestimonial,
  updateRequest,
  updateTestimonial,
} from '@/lib/store';

async function guard() {
  if (!(await isAuthenticated())) throw new Error('Unauthorized');
}

export type ActionState = { ok?: string; error?: string; link?: string } | null;

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get('password') || '');
  if (await login(password)) {
    revalidatePath('/admin');
    return { ok: 'Signed in' };
  }
  return { error: 'Wrong password.' };
}

export async function logoutAction() {
  await logout();
  revalidatePath('/admin');
}

export async function sendRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await guard();

  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email does not look right.' };

  // Same idempotency as POST /api/requests: one open request per email.
  const open = await findOpenRequest({ email });
  if (open) {
    return {
      error: 'There is already an open request for this email. Use Nudge on it instead.',
      link: buildSubmitLink({ token: open.token, name: open.name, email: open.email, category: open.category }),
    };
  }

  const token = randomBytes(24).toString('base64url');
  const created = await createRequest({
    token,
    email,
    name: String(formData.get('name') || '').trim() || null,
    category: String(formData.get('category') || '').trim() || null,
    customMessage: String(formData.get('customMessage') || '').trim() || null,
  });

  const result = await sendRequestEmail({
    to: email,
    name: created.name,
    token,
    category: created.category,
    customMessage: created.customMessage,
  });

  revalidatePath('/admin');

  // Email being unconfigured is not a failure. Hand back the link instead.
  return result.sent
    ? { ok: `Request emailed to ${email}.`, link: result.link }
    : { ok: `Request created. Email is not configured, so send this link yourself.`, link: result.link };
}

export async function resendRequestAction(formData: FormData) {
  await guard();
  const id = String(formData.get('id'));
  const email = String(formData.get('email'));
  const name = String(formData.get('name') || '') || null;
  const token = String(formData.get('token'));

  const result = await sendRequestEmail({ to: email, name, token, category: null, variant: 'nudge' });
  if (result.sent) await updateRequest(id, { resendCount: 1, lastResentAt: new Date() });

  revalidatePath('/admin');
}

export async function cancelRequestAction(formData: FormData) {
  await guard();
  await updateRequest(String(formData.get('id')), { cancelledAt: new Date() });
  revalidatePath('/admin');
}

export async function toggleApprovalAction(formData: FormData) {
  await guard();
  const id = String(formData.get('id'));
  const current = await getTestimonial(id);
  if (current) await updateTestimonial(id, { approved: !current.approved });
  revalidatePath('/admin');
}

export async function toggleFeaturedAction(formData: FormData) {
  await guard();
  const id = String(formData.get('id'));
  const current = await getTestimonial(id);
  if (current) await updateTestimonial(id, { featured: !current.featured });
  revalidatePath('/admin');
}

export async function deleteTestimonialAction(formData: FormData) {
  await guard();
  await deleteTestimonial(String(formData.get('id')));
  revalidatePath('/admin');
}
