import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Deliberately minimal admin auth: one shared password, one signed cookie.
 * There are no user accounts in Vouch, because one person approves
 * testimonials. If you need real accounts, put this behind your own auth
 * instead and delete this file.
 *
 * With no ADMIN_PASSWORD set, the admin is open in development and closed in
 * production. That way `npm run dev` just works and a misconfigured deploy
 * fails safe.
 */

const COOKIE = 'vouch_admin';

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

/** True when the admin is reachable without a password (dev with nothing configured). */
export const isOpenAdmin = (): boolean => !authConfigured() && !isProduction();

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
