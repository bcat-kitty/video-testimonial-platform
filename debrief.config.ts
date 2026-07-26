/**
 * Everything about Debrief that is specific to YOU lives in this one file.
 * Change it and the whole system, emails, recording page, admin, and the
 * components you drop into your site, follows.
 */

export interface DebriefConfig {
  /** Your company or personal brand name. Appears in emails and on the recording page. */
  brandName: string;
  /** Who the request emails come from, in the customer's eyes. Usually a person, not a company. */
  senderName: string;
  /**
   * Categories a testimonial can belong to, so you can show the right ones in
   * the right place ("show me testimonials for the onboarding product").
   * Set to [] to drop the concept entirely and the picker disappears.
   */
  categories: { value: string; label: string }[];
  /** The three questions. These drive the recording prompt, the text form, and the AI extraction. */
  questions: { before: string; after: string; recommend: string };
  /** Copy on the public recording page. */
  recordingPage: { eyebrow: string; title: string; intro: string };
  /**
   * Only people you actually asked can submit. Default, and the safe one.
   *
   * Every request you send carries a private token in its link. With this on,
   * that token is required: no token means no upload slot and no submission, so
   * a stranger who finds your /submit URL gets a polite 403 instead of a row in
   * your review queue and a hole in your storage bill.
   *
   * Set it to false if you want a permanently open "leave us a testimonial"
   * page that anyone can find and fill in. Everything still lands unapproved,
   * so nothing reaches your site without you, but you own the spam.
   */
  inviteOnly: boolean;
  /** Accent color. Also settable at runtime via the --debrief-accent CSS variable. */
  accent: string;
}

export const debriefConfig: DebriefConfig = {
  brandName: 'Acme',
  senderName: 'Alex',

  categories: [
    { value: 'consulting', label: 'Consulting' },
    { value: 'product', label: 'Product' },
    { value: 'support', label: 'Support' },
  ],

  questions: {
    before: 'What was the situation before we worked together?',
    after: 'What changed after?',
    recommend: 'Would you recommend us, and to whom?',
  },

  recordingPage: {
    eyebrow: 'Customer testimonial',
    title: 'Share your experience',
    intro:
      'Two minutes. A short video works best, and you can answer all three questions in one take. Your story helps other people decide.',
  },

  inviteOnly: true,

  accent: '#4F46E5',
};

export const categoryLabel = (value: string | null | undefined): string =>
  debriefConfig.categories.find((c) => c.value === value)?.label || value || '';

export const isValidCategory = (value: string): boolean =>
  debriefConfig.categories.length === 0 || debriefConfig.categories.some((c) => c.value === value);
