import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * A testimonial someone actually submitted. `approved` is the only publish
 * gate: nothing reaches your public API until you flip it in the admin.
 */
export const testimonials = pgTable('testimonials', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  companyUrl: text('company_url'),
  linkedinUrl: text('linkedin_url'),
  /** Never exposed by the public API. Used to match a submission to its request. */
  email: varchar('email', { length: 320 }),
  headshotUrl: text('headshot_url'),
  videoUrl: text('video_url'),
  videoTranscript: text('video_transcript'),
  situationBefore: text('situation_before'),
  whatChanged: text('what_changed'),
  recommendation: text('recommendation'),
  category: varchar('category', { length: 50 }),
  approved: boolean('approved').notNull().default(false),
  featured: boolean('featured').notNull().default(false),
  /** True when the submission matched a request you sent, so you know it is really them. */
  verifiedCustomer: boolean('verified_customer').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A request you sent out. The token in the emailed link points back here, which
 * is how a submission gets verified and how you know who has not replied yet.
 * Status is derived, not stored: cancelled > responded > pending.
 */
export const testimonialRequests = pgTable(
  'testimonial_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 64 }).notNull().unique(),
    email: varchar('email', { length: 320 }).notNull(),
    name: varchar('name', { length: 255 }),
    category: varchar('category', { length: 50 }),
    customMessage: text('custom_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    lastResentAt: timestamp('last_resent_at', { withTimezone: true }),
    resendCount: integer('resend_count').notNull().default(0),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    testimonialId: uuid('testimonial_id').references(() => testimonials.id, {
      onDelete: 'set null',
    }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    index('testimonial_requests_email_idx').on(table.email),
    index('testimonial_requests_token_idx').on(table.token),
  ],
);

export type Testimonial = typeof testimonials.$inferSelect;
export type TestimonialRequest = typeof testimonialRequests.$inferSelect;
