# Vouch, for coding agents

This file is written for an AI coding assistant. If you are an agent and a human has asked you to
"add Vouch testimonials to this site", read this and follow it. If you are a human, the
[README](README.md) is the friendlier door.

There are two completely separate jobs below. Work out which one you have been asked to do
before touching anything.

---

## Job A: install the components into someone else's website

This is the common one. The human already has a Vouch instance deployed (or is about to), and
wants testimonials rendering on their own site. **You are working in their site's repo, not in
the Vouch repo.**

### Interview first

Do not start editing. Ask these, and wait for the answers. They change what you write.

1. **Where is your Vouch instance?** You need the URL, e.g. `https://testimonials.acme.com`.
   If they have not deployed one yet, stop and help them do that first (see the README quick start).
2. **Which pages should show testimonials, and where on each page?** Homepage above the footer?
   A dedicated `/testimonials` page? Under the pricing table? Get specifics, not "on the site".
3. **Compact or full?** `TestimonialStrip` is a row of short quotes for a landing page.
   `TestimonialWall` is full stories with video, for a dedicated page. They may want both,
   in different places.
4. **Do they use categories?** If their instance defines categories in `vouch.config.ts`, ask
   which ones belong on which page, so a support testimonial does not land on a sales page.

Only after you have real answers should you write code.

### Then install

1. Copy the `components/vouch/` directory from the Vouch repo into their project. Put it wherever
   their components live, matching their existing convention (`components/`, `src/components/`,
   `app/_components/`, whatever they already do).
2. Add `NEXT_PUBLIC_VOUCH_URL=https://their-instance.com` to their `.env` (and to `.env.example`
   if they keep one).
3. Place the components exactly where they said, and nowhere else.

```tsx
import TestimonialStrip from '@/components/vouch/TestimonialStrip';

<TestimonialStrip limit={3} heading="What our customers say" />
```

```tsx
import TestimonialWall from '@/components/vouch/TestimonialWall';

<TestimonialWall category="consulting" />
```

4. **Restyle them to match the surrounding site.** This matters, and it is the whole reason the
   components are copied rather than installed from npm. They ship as plain Tailwind with neutral
   zinc colors. Read the components next to where you are placing them and match the site's real
   conventions: border radius, shadow usage, font sizes, spacing scale, dark mode, whether they use
   `cn()`/`clsx`, whether they use a `Card` primitive already. A pasted-in component that looks
   foreign is a failed install.
5. Verify it renders. If the instance has no approved testimonials yet, **the components render
   `null` by design**, so an empty page is expected, not a bug. Confirm by curling
   `<instance>/api/public/testimonials` and checking whether the array is empty.

### Constraints

- These are **async server components**. They work in the Next.js App Router. In a client component
  tree, or a non-Next React app, use `fetchTestimonials()` from `vouch-client.ts` inside your own
  data loading and pass the result via the `testimonials` prop instead.
- `fetchTestimonials` **never throws**. It logs and returns `[]`, because a testimonial service
  having a bad day must not take down a marketing page. Preserve that.
- The API is public, read-only, approved-only, and strips email addresses. Do not add authentication
  to it, and do not proxy it through a server route "for security". It is already the safe surface.
- Do not reach into anything other than `/api/public/testimonials` from a customer's site. The
  other routes are admin surface.

---

## Job B: work on the Vouch codebase itself

You are in the Vouch repo, changing the engine.

### The shape of it

```
vouch.config.ts        Every brand-specific value. Change this before changing anything else.
lib/store.ts           The data layer. Postgres when DATABASE_URL is set, in-memory otherwise.
lib/db/schema.sql      Two tables: testimonials, testimonial_requests. Applied by npm run db:setup.
lib/db/types.ts        Hand-written TypeScript mirrors of the two tables.
lib/email.ts           Resend. Optional, returns the link when unconfigured.
lib/ai.ts              Whisper + GPT. Optional, returns null when unconfigured.
lib/auth.ts            One password, one signed cookie. No user accounts.
lib/public-shape.ts    The whitelist of fields the public API may expose.
app/submit/            The customer-facing recording page.
app/admin/             Review and approve.
app/api/               Public read, submission, upload token, requests, cron.
components/vouch/      What users copy into their own site. Keep dependency-free.
```

### Invariants, do not break these

- **`approved` is the only publish gate.** Nothing reaches the public API without it. If you add a
  new read path, filter on it.
- **Email never goes public.** `lib/public-shape.ts` is a whitelist, not a blacklist. Adding a
  column to the schema must not automatically expose it. Add fields there deliberately. A new
  column goes in three places: `schema.sql`, `types.ts`, and (only if public) `public-shape.ts`.
- **Every external service is optional.** `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`,
  `OPENAI_API_KEY` must each be absent without crashing the app. Demo mode is a feature, it is how
  people evaluate the project. If you add a service, follow the same pattern: a capability check,
  a graceful null, and a banner in the admin explaining what is switched off.
- **Never overwrite text a human wrote.** AI extraction only fills `situationBefore` / `whatChanged`
  / `recommendation` when all three are empty. See `app/api/testimonials/route.ts`.
- **Transcription runs in `after()`**, past the response. The customer must never wait on Whisper.
  The row is saved first, so a failed transcription leaves a recoverable testimonial, not a lost one.
- **One nudge, ever.** `resendCount` only advances when the email actually sent, so a mail outage
  cannot silently burn everyone's single follow-up. Do not add a second automatic nudge.
- **One open request per email.** Creating a request is idempotent: both `POST /api/requests` and
  the admin form return the existing open request instead of creating a duplicate. This is what
  makes the CRM-webhook integration safe to wire blindly. Keep it.
- **`components/vouch/` has no imports from the rest of the repo.** It gets copied into strangers'
  codebases. The moment it imports `@/lib/anything`, copy-paste breaks.
- **The recording page never scrolls.** `app/submit/` is one question per screen, sized to fit a
  375px-wide phone and a laptop without page scroll. If you add a field, put it on its own step or
  take one away; do not grow a screen past the fold. Validation is per-step so nobody is warned
  about a field they cannot see.

### Swapping a provider

Each one is deliberately isolated to a single file:

- **Storage** (S3, R2, anything): rewrite `app/api/upload/route.ts` to issue your presigned URL, and
  the `upload()` call in `app/submit/TestimonialForm.tsx` to use it. Nothing else knows where files
  live, the database only stores the resulting URL string.
- **Email**: rewrite `lib/email.ts`. Keep the `SendResult` shape, the admin depends on getting the
  link back when sending fails.
- **AI**: rewrite `lib/ai.ts`. Keep `transcribeVideo` and `extractStructured` returning `null` on
  any failure.
- **Database**: `lib/store.ts` is already the seam. Both backends implement the same functions.
  The Postgres branch is plain SQL through postgres.js, no ORM, so a different database means
  rewriting those queries and `scripts/db-setup.mjs`, and nothing else.

### House style

- No em dashes in any user-facing copy or comments.
- Comments explain *why*, not *what*. If a line needs a comment to say what it does, rename things.
- Match the surrounding file. This codebase is plain, direct, and short on abstraction, on purpose.
