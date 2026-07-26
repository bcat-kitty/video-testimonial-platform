import { getSql, hasDatabase } from './db';
import type { Testimonial, TestimonialRequest } from './db/types';
import { DEMO_REQUESTS, DEMO_TESTIMONIALS } from './demo-data';

/**
 * One data layer, two backends.
 *
 * With DATABASE_URL set, everything goes to Postgres through plain SQL
 * (postgres.js tagged templates, no ORM). Without it, Debrief runs on an
 * in-memory store seeded with demo testimonials, so you can clone the
 * repo and see the whole system work before signing up for anything. Writes in
 * demo mode are real but disappear on restart.
 */

export type NewTestimonial = Omit<Testimonial, 'id' | 'createdAt' | 'approved' | 'featured'> &
  Partial<Pick<Testimonial, 'approved' | 'featured'>>;

export type NewRequest = {
  token: string;
  email: string;
  name: string | null;
  category: string | null;
  customMessage: string | null;
};

export const isDemoMode = (): boolean => !hasDatabase();

/** postgres.js rejects undefined values, so strip them before insert/update. */
const defined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

// --- in-memory backend ------------------------------------------------------

type Memory = { testimonials: Testimonial[]; requests: TestimonialRequest[] };

const memory: Memory = ((globalThis as { __debrief?: Memory }).__debrief ??= {
  testimonials: [...DEMO_TESTIMONIALS],
  requests: [...DEMO_REQUESTS],
});

const uid = () => `mem-${Math.random().toString(36).slice(2, 10)}`;

// --- reads ------------------------------------------------------------------

export async function listTestimonials(opts: { approvedOnly?: boolean; category?: string } = {}): Promise<Testimonial[]> {
  let rows: Testimonial[];

  if (isDemoMode()) {
    rows = [...memory.testimonials];
  } else {
    const sql = getSql();
    rows = await sql<Testimonial[]>`SELECT * FROM testimonials ORDER BY created_at DESC`;
  }

  if (opts.approvedOnly) rows = rows.filter((t) => t.approved);
  if (opts.category) rows = rows.filter((t) => t.category === opts.category);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getTestimonial(id: string): Promise<Testimonial | null> {
  if (isDemoMode()) return memory.testimonials.find((t) => t.id === id) ?? null;
  const sql = getSql();
  const [row] = await sql<Testimonial[]>`SELECT * FROM testimonials WHERE id = ${id} LIMIT 1`;
  return row ?? null;
}

export async function listRequests(): Promise<TestimonialRequest[]> {
  if (isDemoMode()) {
    return [...memory.requests].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }
  const sql = getSql();
  return sql<TestimonialRequest[]>`SELECT * FROM testimonial_requests ORDER BY sent_at DESC`;
}

// --- writes -----------------------------------------------------------------

export async function createTestimonial(data: NewTestimonial): Promise<Testimonial> {
  if (isDemoMode()) {
    const row: Testimonial = {
      ...data,
      approved: data.approved ?? false,
      featured: data.featured ?? false,
      id: uid(),
      createdAt: new Date(),
    };
    memory.testimonials.unshift(row);
    return row;
  }
  const sql = getSql();
  const [row] = await sql<Testimonial[]>`INSERT INTO testimonials ${sql(defined(data))} RETURNING *`;
  return row;
}

export async function updateTestimonial(id: string, patch: Partial<Testimonial>): Promise<void> {
  if (isDemoMode()) {
    const row = memory.testimonials.find((t) => t.id === id);
    if (row) Object.assign(row, patch);
    return;
  }
  const values = defined(patch);
  if (Object.keys(values).length === 0) return;
  const sql = getSql();
  await sql`UPDATE testimonials SET ${sql(values)} WHERE id = ${id}`;
}

export async function deleteTestimonial(id: string): Promise<void> {
  if (isDemoMode()) {
    memory.testimonials = memory.testimonials.filter((t) => t.id !== id);
    return;
  }
  const sql = getSql();
  await sql`DELETE FROM testimonials WHERE id = ${id}`;
}

export async function createRequest(data: NewRequest): Promise<TestimonialRequest> {
  if (isDemoMode()) {
    const row: TestimonialRequest = {
      ...data,
      id: uid(),
      sentAt: new Date(),
      lastResentAt: null,
      resendCount: 0,
      respondedAt: null,
      testimonialId: null,
      cancelledAt: null,
    };
    memory.requests.unshift(row);
    return row;
  }
  const sql = getSql();
  const [row] = await sql<TestimonialRequest[]>`INSERT INTO testimonial_requests ${sql(defined(data))} RETURNING *`;
  return row;
}

/** Finds the open request a submission belongs to. Token first, then email. */
export async function findOpenRequest(opts: { token?: string | null; email?: string | null }): Promise<TestimonialRequest | null> {
  const isOpen = (r: TestimonialRequest) => !r.respondedAt && !r.cancelledAt;

  if (isDemoMode()) {
    if (opts.token) {
      const byToken = memory.requests.find((r) => r.token === opts.token && isOpen(r));
      if (byToken) return byToken;
    }
    if (opts.email) {
      const byEmail = memory.requests.find((r) => r.email === opts.email && isOpen(r));
      if (byEmail) return byEmail;
    }
    return null;
  }

  const sql = getSql();
  if (opts.token) {
    const [row] = await sql<TestimonialRequest[]>`
      SELECT * FROM testimonial_requests
      WHERE token = ${opts.token} AND responded_at IS NULL AND cancelled_at IS NULL
      LIMIT 1`;
    if (row) return row;
  }
  if (opts.email) {
    const [row] = await sql<TestimonialRequest[]>`
      SELECT * FROM testimonial_requests
      WHERE email = ${opts.email} AND responded_at IS NULL AND cancelled_at IS NULL
      ORDER BY sent_at
      LIMIT 1`;
    if (row) return row;
  }
  return null;
}

export async function updateRequest(id: string, patch: Partial<TestimonialRequest>): Promise<void> {
  if (isDemoMode()) {
    const row = memory.requests.find((r) => r.id === id);
    if (row) Object.assign(row, patch);
    return;
  }
  const values = defined(patch);
  if (Object.keys(values).length === 0) return;
  const sql = getSql();
  await sql`UPDATE testimonial_requests SET ${sql(values)} WHERE id = ${id}`;
}

/** Requests sent before `before`, never answered, never cancelled, never nudged. */
export async function findRequestsNeedingNudge(before: Date): Promise<TestimonialRequest[]> {
  if (isDemoMode()) {
    return memory.requests.filter(
      (r) => !r.respondedAt && !r.cancelledAt && r.resendCount === 0 && r.sentAt < before,
    );
  }
  const sql = getSql();
  return sql<TestimonialRequest[]>`
    SELECT * FROM testimonial_requests
    WHERE responded_at IS NULL AND cancelled_at IS NULL
      AND resend_count = 0 AND sent_at < ${before}`;
}
