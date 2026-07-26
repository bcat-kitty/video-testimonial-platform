import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { hasDatabase } from '@/lib/db';

/**
 * Deliberately minimal admin auth: one shared password, one signed cookie.
 * There are no user accounts in Debrief, because one person approves
 * testimonials. If you need real accounts, put this behind your own auth
 * instead and delete this file.
 *
 * Two cases open the admin without a password, and both are cases where there
 * is nothing to protect:
 *
 * - **Demo mode.** With no DATABASE_URL the whole app runs on in-memory sample
 *   data that resets on restart. A password there is a locked door in front of
 *   an empty room, and it turns "look at the owner's side" into a chore.
 * - **Local development with nothing configured**, so `npm run dev` just works.
 *
 * A real deployment has a database, which means it needs ADMIN_PASSWORD. Set it
 * and this file starts doing its job. Forget it in production and the admin
 * locks itself entirely rather than falling open.
 */

const COOKIE = 'debrief_admin';

const secret = () => process.env.ADMIN_PASSWORD || '';

const sign = (value: string): string =>
  createHmac('sha256', secret()).update(value).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export const authConfigured = (): boolean => Boolean(secret());
export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/** True when the admin is reachable without a password. See the note at the top. */
export const isOpenAdmin = (): boolean => !hasDatabase() || (!authConfigured() && !isProduction());

export async function isAuthenticated(): Promise<boolean> {
  if (isOpenAdmin()) return true;
  if (!authConfigured()) return false;

  const cookie = (await cookies()).get(COOKIE)?.value;
  return Boolean(cookie && safeEqual(cookie, sign('ok')));
}

export async function login(password: string): Promise<boolean> {
  if (!authConfigured() || !safeEqual(password, secret())) return false;

  (await cookies()).set(COOKIE, sign('ok'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
