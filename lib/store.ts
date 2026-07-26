import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { getDb, hasDatabase } from './db';
import { testimonialRequests, testimonials, type Testimonial, type TestimonialRequest } from './db/schema';
import { DEMO_REQUESTS, DEMO_TESTIMONIALS } from './demo-data';

/**
 * One data layer, two backends.
 *
 * With DATABASE_URL set, everything goes to Postgres. Without it, Vouch runs
 * on an in-memory store seeded with demo testimonials, so you can clone the
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

// --- in-memory backend ------------------------------------------------------

type Memory = { testimonials: Testimonial[]; requests: TestimonialRequest[] };

const memory: Memory = ((globalThis as { __vouch?: Memory }).__vouch ??= {
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
    rows = await getDb().select().from(testimonials).orderBy(desc(testimonials.createdAt));
  }

  if (opts.approvedOnly) rows = rows.filter((t) => t.approved);
  if (opts.category) rows = rows.filter((t) => t.category === opts.category);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getTestimonial(id: string): Promise<Testimonial | null> {
  if (isDemoMode()) return memory.testimonials.find((t) => t.id === id) ?? null;
  const [row] = await getDb().select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return row ?? null;
}

export async function listRequests(): Promise<TestimonialRequest[]> {
  if (isDemoMode()) {
    return [...memory.requests].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }
  return getDb().select().from(testimonialRequests).orderBy(desc(testimonialRequests.sentAt));
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
  const [row] = await getDb().insert(testimonials).values(data).returning();
  return row;
}

export async function updateTestimonial(id: string, patch: Partial<Testimonial>): Promise<void> {
  if (isDemoMode()) {
    const row = memory.testimonials.find((t) => t.id === id);
    if (row) Object.assign(row, patch);
    return;
  }
  await getDb().update(testimonials).set(patch).where(eq(testimonials.id, id));
}

export async function deleteTestimonial(id: string): Promise<void> {
  if (isDemoMode()) {
    memory.testimonials = memory.testimonials.filter((t) => t.id !== id);
    return;
  }
  await getDb().delete(testimonials).where(eq(testimonials.id, id));
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
  const [row] = await getDb().insert(testimonialRequests).values(data).returning();
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

  const db = getDb();
  if (opts.token) {
    const [row] = await db
      .select()
      .from(testimonialRequests)
      .where(
        and(
          eq(testimonialRequests.token, opts.token),
          isNull(testimonialRequests.respondedAt),
          isNull(testimonialRequests.cancelledAt),
        ),
      )
      .limit(1);
    if (row) return row;
  }
  if (opts.email) {
    const [row] = await db
      .select()
      .from(testimonialRequests)
      .where(
        and(
          eq(testimonialRequests.email, opts.email),
          isNull(testimonialRequests.respondedAt),
          isNull(testimonialRequests.cancelledAt),
        ),
      )
      .orderBy(testimonialRequests.sentAt)
      .limit(1);
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
  await getDb().update(testimonialRequests).set(patch).where(eq(testimonialRequests.id, id));
}

/** Requests sent before `before`, never answered, never cancelled, never nudged. */
export async function findRequestsNeedingNudge(before: Date): Promise<TestimonialRequest[]> {
  if (isDemoMode()) {
    return memory.requests.filter(
      (r) => !r.respondedAt && !r.cancelledAt && r.resendCount === 0 && r.sentAt < before,
    );
  }
  return getDb()
    .select()
    .from(testimonialRequests)
    .where(
      and(
        isNull(testimonialRequests.respondedAt),
        isNull(testimonialRequests.cancelledAt),
        eq(testimonialRequests.resendCount, 0),
        lt(testimonialRequests.sentAt, before),
      ),
    );
}
