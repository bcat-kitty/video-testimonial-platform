import type { Testimonial } from './db/types';

/**
 * The only shape that ever leaves the public API. Email lives in the database
 * so submissions can be matched to requests, and it must never be published,
 * so the whitelist here is the safety boundary. Add fields deliberately.
 */
export interface PublicTestimonial {
  id: string;
  name: string;
  role: string;
  company: string | null;
  companyUrl: string | null;
  linkedinUrl: string | null;
  headshotUrl: string | null;
  videoUrl: string | null;
  situationBefore: string | null;
  whatChanged: string | null;
  recommendation: string | null;
  category: string | null;
  featured: boolean;
  verifiedCustomer: boolean;
  createdAt: string;
}

export function toPublic(t: Testimonial): PublicTestimonial {
  return {
    id: t.id,
    name: t.name,
    role: t.role,
    company: t.company,
    companyUrl: t.companyUrl,
    linkedinUrl: t.linkedinUrl,
    headshotUrl: t.headshotUrl,
    videoUrl: t.videoUrl,
    situationBefore: t.situationBefore,
    whatChanged: t.whatChanged,
    recommendation: t.recommendation,
    category: t.category,
    featured: t.featured,
    verifiedCustomer: t.verifiedCustomer,
    createdAt: t.createdAt.toISOString(),
  };
}
