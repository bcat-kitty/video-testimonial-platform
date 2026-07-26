# Debrief, for coding agents

This file is written for an AI coding assistant. If you are an agent and a human has asked you to
"add Debrief testimonials to this site", read this and follow it. If you are a human, the
[README](README.md) is the friendlier door.

There are two completely separate jobs below. Work out which one you have been asked to do
before touching anything.

---

## Job A: install the components into someone else's website

This is the common one. The human already has a Debrief instance deployed (or is about to), and
wants testimonials rendering on their own site. **You are working in their site's repo, not in
the Debrief repo.**

Do the whole job in one conversation. Do not hand back a checklist for the human to run later.

### Look before you ask

Read their repo first, so your questions are concrete and short. Find:

- **The framework and router.** App Router, Pages Router, Vite, Astro, something else. This decides
  whether the components drop in as-is (see Constraints below).
- **Their landing page.** Usually `app/page.tsx`, `pages/index.tsx`, `src/routes/+page.svelte`, or
  similar. Read it and note the real sections, so you can ask "after the pricing table and before
  the FAQ?" rather than "where do you want it?"
- **Their component conventions.** Directory, naming, whether they use `cn()`/`clsx`, a `Card`
  primitive, CSS modules, Tailwind, dark mode.
- **Whether an env file exists** and what it is called.

Never guess a placement and never scatter the components across pages hoping one sticks.

### Then interview

Ask these, and wait for answers. Lead with what you found, so each one is a confirmation rather
than an open question.

1. **Where is your Debrief instance?** You need the URL, e.g. `https://testimonials.acme.com`.
   If they do not have one, see "If they have no instance yet" below and do that first.
2. **Which pages, and where on each?** Propose the specific slots you found. Get a real answer,
   not "on the site".
3. **Compact or full?** `TestimonialStrip` is a row of short quotes for a landing page.
   `TestimonialWall` is full stories with video, for a dedicated page. They may want both,
   in different places.
4. **Do they use categories?** If their instance defines categories in `debrief.config.ts`, ask
   which ones belong on which page, so a support testimonial does not land on a sales page.

Only after you have real answers should you write code.

### If they have no instance yet

Do not send them away to read the README. Walk them through it here:

1. Fork or clone `https://github.com/anurieli/debrief`, then `npm install && npm run dev`. It runs
   on in-memory demo data with zero configuration, so they can see the whole system before
   committing to anything.
2. Edit `debrief.config.ts`: brand name, sender name, the three questions, categories, accent.
3. Deploy it (Vercel, or anywhere that runs Next.js). It is a separate deployment from their site,
   usually on a subdomain like `testimonials.theirdomain.com`.
4. **Database.** Any Postgres works: Neon, Supabase, RDS, local. Put the connection string in
   `DATABASE_URL` and run `npm run db:setup` once. That reads `.env.local` itself and applies
   `lib/db/schema.sql`, which is two tables and safe to re-run. Without a database it still runs,
   but nothing persists.
5. Everything else is optional and degrades honestly: `BLOB_READ_WRITE_TOKEN` for video,
   `OPENAI_API_KEY` for transcription, `RESEND_API_KEY` for sending request emails,
   `ADMIN_PASSWORD` to lock the admin, which they need as soon as they have a database.
   The admin shows a note for whatever is switched off.
   Tell them what each one buys and let them decide; do not insist on all of them up front.

Then come back and finish the install with the instance URL.

### Then install

1. Copy the `components/debrief/` directory from the Debrief repo into their project. Put it wherever
   their components live, matching their existing convention (`components/`, `src/components/`,
   `app/_components/`, whatever they already do).
2. Add `NEXT_PUBLIC_DEBRIEF_URL=https://their-instance.com` to their `.env` (and to `.env.example`
   if they keep one).
3. Place the components exactly where they said, and nowhere else.

```tsx
import TestimonialStrip from '@/components/debrief/TestimonialStrip';

<TestimonialStrip limit={3} heading="What our customers say" />
```

```tsx
import TestimonialWall from '@/components/debrief/TestimonialWall';

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
6. **Close the loop.** Tell them in two lines what you changed, which file the component landed in,
   and how to send their first request (the admin form, or `POST /api/requests` from their CRM).
   If the wall is empty because they have no testimonials yet, say so plainly so they do not go
   hunting for a bug that is not there.

### Constraints

- These are **async server components**. They work in the Next.js App Router. In a client component
  tree, or a non-Next React app, use `fetchTestimonials()` from `debrief-client.ts` inside your own
  data loading and pass the result via the `testimonials` prop instead.
- `fetchTestimonials` **never throws**. It logs and returns `[]`, because a testimonial service
  having a bad day must not take down a marketing page. Preserve that.
- The API is public, read-only, approved-only, and strips email addresses. Do not add authentication
  to it, and do not proxy it through a server route "for security". It is already the safe surface.
- Do not reach into anything other than `/api/public/testimonials` from a customer's site. The
  other routes are admin surface.

---

## Job B: work on the Debrief codebase itself

You are in the Debrief repo, changing the engine.

### The shape of it

```
debrief.config.ts        Every brand-specific value. Change this before changing anything else.
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
components/debrief/      What users copy into their own site. Keep dependency-free.
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
- **`components/debrief/` has no imports from the rest of the repo.** It gets copied into strangers'
  codebases. The moment it imports `@/lib/anything`, copy-paste breaks.
- **Demo mode has no login, and the API does not care.** `isOpenAdmin()` is true whenever there is
  no `DATABASE_URL`, because the data is in-memory sample rows that reset on restart, so a password
  there guards nothing and makes the demo worse. Do not "fix" that by adding a password back. But
  the bypass stops at the UI: `app/api/requests` uses `isApiAuthorized()`, which requires the bearer
  token or a real session, because `GET` on it returns customer email addresses. Any new route that
  exposes email uses `isApiAuthorized`, never `isAuthenticated`.
- **The admin is one screen with three views.** `?view=review|live|requests`, in the URL rather than
  in client state, so it survives a server action and a refresh. If you add something to the admin,
  it goes inside a view or behind a button; do not stack another section onto the page.
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
