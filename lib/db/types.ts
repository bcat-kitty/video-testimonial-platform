/**
 * TypeScript mirrors of the two tables in schema.sql. Hand-written on purpose:
 * this is the entire data model, and keeping it readable beats generating it.
 * If you add a column, add it in three places: schema.sql, here, and (only if
 * it should be public) lib/public-shape.ts.
 */

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  companyUrl: string | null;
  linkedinUrl: string | null;
  /** Never exposed by the public API. Used to match a submission to its request. */
  email: string | null;
  headshotUrl: string | null;
  videoUrl: string | null;
  videoTranscript: string | null;
  situationBefore: string | null;
  whatChanged: string | null;
  recommendation: string | null;
  category: string | null;
  approved: boolean;
  featured: boolean;
  /** True when the submission matched a request you sent, so you know it is really them. */
  verifiedCustomer: boolean;
  createdAt: Date;
}

export interface TestimonialRequest {
  id: string;
  token: string;
  email: string;
  name: string | null;
  category: string | null;
  customMessage: string | null;
  sentAt: Date;
  lastResentAt: Date | null;
  resendCount: number;
  respondedAt: Date | null;
  testimonialId: string | null;
  cancelledAt: Date | null;
}
