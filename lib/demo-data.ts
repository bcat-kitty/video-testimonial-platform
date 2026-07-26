import type { Testimonial, TestimonialRequest } from './db/schema';

/**
 * Seed data for demo mode, so `npm run dev` shows a working system before you
 * have a database, an API key, or a single real customer. These are invented.
 */
const base = {
  companyUrl: null,
  linkedinUrl: null,
  email: null,
  headshotUrl: null,
  videoUrl: null,
  videoTranscript: null,
  approved: true,
  featured: false,
  verifiedCustomer: true,
};

export const DEMO_TESTIMONIALS: Testimonial[] = [
  {
    ...base,
    id: 'demo-1',
    name: 'Sarah Chen',
    role: 'Founder',
    company: 'Bright Path',
    category: 'consulting',
    situationBefore:
      'We were collecting testimonials by asking people over email and then copy-pasting whatever came back into a spreadsheet. Half the time we never followed up.',
    whatChanged:
      'Now the request goes out the moment a project closes, and the video comes back written up and ready to publish. We went from four testimonials a year to four a month.',
    recommendation:
      'If you are still chasing customers for quotes by hand, stop. This took an afternoon to set up and it has paid for itself many times over.',
    createdAt: new Date('2026-05-02T10:00:00Z'),
  },
  {
    ...base,
    id: 'demo-2',
    name: 'Marcus Rivera',
    role: 'Head of Operations',
    company: 'Summit Group',
    category: 'product',
    situationBefore:
      'Our website had three testimonials on it, all from 2023, and everyone on the team knew they were stale. Nobody owned fixing it.',
    whatChanged:
      'The recording link does the work. Customers hit record on their phone, talk for ninety seconds, and we get a clean written testimonial we can actually use on a landing page.',
    recommendation:
      'The video-to-text part is the whole trick. People will happily talk for two minutes. Almost nobody will sit down and write three paragraphs.',
    createdAt: new Date('2026-05-14T10:00:00Z'),
  },
  {
    ...base,
    id: 'demo-3',
    name: 'Diana Koloff',
    role: 'CEO',
    company: 'Koloff Creative',
    category: 'support',
    situationBefore:
      'I had a folder of nice things customers had said in Slack and email, and no way to turn any of it into something I could put on the site.',
    whatChanged:
      'I sent nine requests in one sitting. Six came back within a week, and every one of them reads like the customer wrote it, because they did.',
    recommendation:
      'Worth it for the approval step alone. Nothing goes live until I have read it, so I never have to worry about what is on the page.',
    createdAt: new Date('2026-06-01T10:00:00Z'),
  },
  {
    ...base,
    id: 'demo-4',
    name: 'James Whitfield',
    role: 'Managing Partner',
    company: 'Whitfield & Associates',
    category: 'consulting',
    situationBefore:
      'Every proposal we sent had the same two quotes on the last page. Prospects had almost certainly seen them before.',
    whatChanged:
      'We now have enough recent testimonials that we pick the two that match the prospect. Same proposal, much better last page.',
    recommendation:
      'Set it up once and it keeps producing. That is a rare thing in marketing tooling.',
    createdAt: new Date('2026-06-20T10:00:00Z'),
  },
  // Unapproved on purpose, so the admin shows a real review queue on first run.
  {
    ...base,
    id: 'demo-5',
    name: 'Priya Raman',
    role: 'Director of Marketing',
    company: 'Northwind Labs',
    category: 'product',
    approved: false,
    situationBefore:
      'Our proof page was a wall of logos and nothing else. Prospects kept asking for references, which meant a real person had to go find one every time.',
    whatChanged:
      'We collected eleven testimonials in three weeks without writing a single follow-up email by hand. The reference request has basically stopped coming up on calls.',
    recommendation:
      'The part I did not expect to care about is the approval step. I can see exactly what is public and change my mind in one click.',
    createdAt: new Date('2026-07-18T10:00:00Z'),
  },
];

/** Requests that have gone out and not come back, so the admin has something to show. */
export const DEMO_REQUESTS: TestimonialRequest[] = [
  {
    id: 'demo-req-1',
    token: 'demo-token-nadia',
    email: 'nadia@harborlogistics.com',
    name: 'Nadia Bello',
    category: 'consulting',
    customMessage: null,
    sentAt: new Date('2026-07-22T09:00:00Z'),
    lastResentAt: null,
    resendCount: 0,
    respondedAt: null,
    testimonialId: null,
    cancelledAt: null,
  },
  {
    id: 'demo-req-2',
    token: 'demo-token-tom',
    email: 'tom@fieldstone.co',
    name: 'Tom Ashworth',
    category: null,
    customMessage: null,
    sentAt: new Date('2026-07-09T09:00:00Z'),
    lastResentAt: new Date('2026-07-16T09:00:00Z'),
    resendCount: 1,
    respondedAt: null,
    testimonialId: null,
    cancelledAt: null,
  },
];
