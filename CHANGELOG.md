# Changelog

## 2026-07-26 22:05 - Document the CRM loop, and close an API hole the demo bypass opened

`GET /api/requests` has existed since v1 and was never documented. It is the read side of the CRM
integration: who you have asked, and whether each one is pending, completed, or cancelled. The
README now covers all three endpoints as one table (ask, track, show) with the response shape, and
says plainly where the line sits. Your CRM knows who your clients are and decides who deserves a
request; Debrief knows who has been asked and what came back.

Removing the demo password in the previous entry had a consequence I missed at the time: because
`isAuthenticated()` returns true in demo mode, the admin API fell open with it, and `GET
/api/requests` returns customer email addresses. Split into two checks. `isOpenAdmin()` still opens
the admin page, and a new `isApiAuthorized()` guards the API, requiring the bearer token or a real
session. Demo mode alone is not enough. Verified: on the live demo's exact config the page opens
with no login and the API returns 401 without the token.

Files: `lib/auth.ts`, `app/api/requests/route.ts`, `README.md`, `CLAUDE.md`, `.env.example`

## 2026-07-26 21:15 - The admin is a dashboard, and the demo no longer asks for a password

The admin used to be four sections stacked on one long page. It is now one screen with three
views: awaiting review, live, and requests out. Testimonials sit in a two-column grid, compact by
default, with the video and full text behind an expander. Asking someone for a testimonial moved
into a dialog behind a button instead of taking up the top of the page. Nothing scrolls on a
desktop screen any more.

The demo has no login. In demo mode there is no database, so the data is sample rows that reset on
restart, and the password was guarding an empty room. Real instances are unchanged: once a
database exists, `ADMIN_PASSWORD` is required in production or the admin will not open at all.

Files: `app/admin/{page,SendRequestForm,LoginForm}.tsx`, `lib/auth.ts`, `app/page.tsx`,
`README.md`, `CLAUDE.md`, `docs/screenshots/admin-review.png`

## 2026-07-26 19:40 - Renamed from Vouch to Debrief

The project was called Vouch for one day. It is now Debrief. Renamed before any launch,
so nothing published points at the old name.

**Why:** vouchfor.com is an established video testimonial company whose public pitch is
identical to this project's (single link, AI-generated questions, CRM integration, embed
anywhere), with Canva, Nike, Cisco, HubSpot and Amazon as customers. Same name in the same
category is the textbook shape of trademark confusion, and it made the project impossible
to find. Alternatives were checked and rejected: "openvoucher" reads as a coupon engine
(voucherify.io owns that space) and still carries the competitor's mark; "sayso" collides
with sayso.video, another video testimonial company; "one take" collides with several video
recording apps including onetake.ai.

Debrief names the method rather than the output. Every competitor in the category is named
after the result (Vouch, Boast, Endorsal, Famewall, Testimonial.to); none is named after how
the thing is actually collected. It also survives the planned audio-only mode, since
"debrief your customers" holds whether they talk, record, or type.

**Changed:** `vouch.config.ts` → `debrief.config.ts` (`vouchConfig` → `debriefConfig`),
`components/vouch/` → `components/debrief/`, `vouch-client.ts` → `debrief-client.ts`,
`--vouch-accent` → `--debrief-accent`, `NEXT_PUBLIC_VOUCH_URL` → `NEXT_PUBLIC_DEBRIEF_URL`,
the `.v-*` utility classes → `.d-*`, the admin cookie, and every doc reference. All four
screenshots regenerated.

GitHub redirects github.com/anurieli/vouch to the new URL, so any link already shared keeps
working. The live demo moved to https://debrief-demo.vercel.app (admin password
`debrief-demo`), replacing the old randomly-generated Vercel alias.

## 2026-07-26 18:25 - Video enabled on the demo, one question per screen

**Commits:** `4da7b67` feat: idempotent requests, new tagline, `fa42adb` feat: GitHub stars,
`7fc45cd` feat: one question per screen on the recording page

- **Video works on the live demo.** It had been silently falling back to text mode because no
  Vercel Blob store existed. Created `debrief-demo` (public, iad1) and connected it to the project,
  which set `BLOB_READ_WRITE_TOKEN` across all environments. Confirmed live: the recording page
  now opens in video mode at step 1/4.
- **Recording page rebuilt as a stepped card.** The old single long form showed the customer
  everything they owed before they had given anything. Now: 4 screens in video mode, 6 in write
  mode (one question per screen), progress bar, Back, per-step validation so nobody is warned
  about a field they cannot see. Switching Record/Write keeps answers already given.
- **No page scroll, verified.** Measured with headless Chrome at 375x667, 390x844 and 1440x900,
  on every step, including with the camera preview live. Zero overflow at all three.
- **Idempotent requests.** One open request per email, enforced in both `POST /api/requests` and
  the admin form, so a CRM webhook can be wired blindly and a double-fire is a no-op.
- **Tagline:** "Testimonials that fill themselves", described as a self-hosted automated
  testimonial system. Applied to README, homepage hero, package.json, and the repo description.
- **Live GitHub stars and forks** on the instance homepage (cached 1h, degrades to a plain link)
  plus shields.io badges in the README.

Files: `app/submit/{TestimonialForm,VideoCapture}.tsx`, `app/globals.css`, `app/page.tsx`,
`app/api/requests/route.ts`, `app/admin/actions.ts`, `README.md`, `CLAUDE.md`, `package.json`,
`docs/screenshots/submit-questions.png`

## 2026-07-26 13:10 - Drop Drizzle, fix db setup, trim README, host a live demo

**Commits:** `bef4f33` refactor: drop Drizzle for plain SQL, fix db setup, trim README,
`83dd837` docs: add live demo instance to README

- **Drizzle removed.** `lib/store.ts` now talks to Postgres through plain SQL via postgres.js
  (`transform: postgres.camel`). The schema is `lib/db/schema.sql`, row types are hand-written in
  `lib/db/types.ts`, and `drizzle-orm`/`drizzle-kit` are gone (two dependencies, -1,616 net lines).
- **Fixed a shipped going-live bug:** `drizzle-kit push` never read `.env.local`, but
  `.env.example` told people to put `DATABASE_URL` there, so the documented setup path failed.
  Replaced with `npm run db:setup` (`scripts/db-setup.mjs`), which loads `.env.local`/`.env`
  itself and applies `schema.sql` idempotently.
- **Verified against a real Postgres 16** (docker): setup twice, request create, token-matched
  submission (verified flag), request close, approval read, public API shape, nudge query.
- **README trimmed 245 → 213 lines:** cut the persona section, the pipeline table that repeated
  the diagram, and the standalone premise essay; merged the two scope sections; fixed the clone
  URL which had regressed to the wrong handle.
- **Live demo hosted:** https://debrief-demo.vercel.app under the personal Vercel scope (no
  company trace in the URL), demo mode, admin password `debrief-demo` published in the README.
  GitHub repo connected for auto-deploy on push. `ADMIN_PASSWORD` and `NEXT_PUBLIC_APP_URL` set
  in production.

Files: `lib/store.ts`, `lib/db/{schema.sql,types.ts,index.ts}`, `scripts/db-setup.mjs`,
`package.json`, `README.md`, `CLAUDE.md`; deleted `drizzle.config.ts`, `lib/db/schema.ts`

## 2026-07-26 09:15 - Public launch

**Commits:** `0dd6c3c` docs: rewrite README for launch, `88b81ee` docs: tighten README wording

Repo published at https://github.com/anurieli/debrief (MIT, public).

- README rewritten for a cold reader: an explicit "This is v1" section listing chosen scope and
  what is not in it yet, a mermaid flow diagram of the pipeline, four concrete use cases, and the
  zero-config quick start moved up as the proof of how small the project is.
- Repo topics added for discoverability.
- Corrected two claims that were wrong in the first draft: approval is a step that needs you (the
  diagram had implied the whole flow was hands-off), and swapping storage touches two files rather
  than one.

## 2026-07-26 08:30 - Initial open-source release

**Commit:** `73b064a` feat: Debrief, a self-hosted video testimonial engine

First public version. Debrief was extracted from a private company codebase, where the
request-send, video-record, transcribe, approve, and display pipeline was wired directly into a
CRM (contacts table, stage machine, portal auth, agent API, hardcoded brand). This release
generalises all of that into a standalone app anyone can deploy.

What landed:

- **Two-table data model.** `testimonials` and `testimonial_requests`. Request status is derived
  (cancelled > responded > pending), not stored. Dropped the contact and user foreign keys the
  original had, so a request stands on its own.
- **Demo mode.** With no `DATABASE_URL`, the whole app runs on an in-memory seeded store, so
  `npm run dev` works on a fresh clone with zero configuration. `lib/store.ts` is the seam.
- **Every service optional.** Missing `OPENAI_API_KEY` stores video without text, missing
  `RESEND_API_KEY` returns the recording link for you to send yourself, missing
  `BLOB_READ_WRITE_TOKEN` disables video and keeps text mode. The admin shows a banner for each.
- **One config file.** `debrief.config.ts` holds brand name, sender, categories, the three
  questions, recording-page copy, and accent color. It drives the emails, the form, the admin,
  and the AI prompt.
- **Public API boundary.** `lib/public-shape.ts` is an explicit whitelist, so adding a schema
  column can never accidentally publish it. Email is never exposed.
- **Copy-in components.** `components/debrief/` has no imports from the rest of the repo, so it
  survives being pasted into someone else's project. `TestimonialStrip` and `TestimonialWall`,
  plus a fetch client that returns `[]` rather than throwing.
- **Agent-first install docs.** `CLAUDE.md` tells a coding agent to interview the developer about
  placement before writing code, and to restyle the components to the host site.
- **Screenshots** in `docs/screenshots/`, generated from the running app on demo data.

Verified: `tsc --noEmit` clean, `next build` clean, all seven routes render, public API returns
approved-only rows.

Files: `debrief.config.ts`, `lib/{store,email,ai,auth,public-shape,demo-data}.ts`, `lib/db/*`,
`app/{page,layout}.tsx`, `app/submit/*`, `app/admin/*`, `app/api/*`, `components/debrief/*`,
`README.md`, `CLAUDE.md`, `LICENSE`, `.env.example`, `vercel.json`, `drizzle.config.ts`
