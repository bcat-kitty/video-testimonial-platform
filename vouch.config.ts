/**
 * Everything about Vouch that is specific to YOU lives in this one file.
 * Change it and the whole system, emails, recording page, admin, and the
 * components you drop into your site, follows.
 */

export interface VouchConfig {
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
  /** Accent color. Also settable at runtime via the --vouch-accent CSS variable. */
  accent: string;
}

export const vouchConfig: VouchConfig = {
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

  accent: '#4F46E5',
};

export const categoryLabel = (value: string | null | undefined): string =>
  vouchConfig.categories.find((c) => c.value === value)?.label || value || '';

export const isValidCategory = (value: string): boolean =>
  vouchConfig.categories.length === 0 || vouchConfig.categories.some((c) => c.value === value);
