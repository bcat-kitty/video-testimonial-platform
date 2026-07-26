# Changelog

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
- **Live demo hosted:** https://vouch-pi-ochre.vercel.app under the personal Vercel scope (no
  company trace in the URL), demo mode, admin password `vouch-demo` published in the README.
  GitHub repo connected for auto-deploy on push. `ADMIN_PASSWORD` and `NEXT_PUBLIC_APP_URL` set
  in production.

Files: `lib/store.ts`, `lib/db/{schema.sql,types.ts,index.ts}`, `scripts/db-setup.mjs`,
`package.json`, `README.md`, `CLAUDE.md`; deleted `drizzle.config.ts`, `lib/db/schema.ts`

## 2026-07-26 09:15 - Public launch

**Commits:** `0dd6c3c` docs: rewrite README for launch, `88b81ee` docs: tighten README wording

Repo published at https://github.com/anurieli/vouch (MIT, public).

- README rewritten for a cold reader: an explicit "This is v1" section listing chosen scope and
  what is not in it yet, a mermaid flow diagram of the pipeline, four concrete use cases, and the
  zero-config quick start moved up as the proof of how small the project is.
- Repo topics added for discoverability.
- Corrected two claims that were wrong in the first draft: approval is a step that needs you (the
  diagram had implied the whole flow was hands-off), and swapping storage touches two files rather
  than one.

## 2026-07-26 08:30 - Initial open-source release

**Commit:** `73b064a` feat: Vouch, a self-hosted video testimonial engine

First public version. Vouch was extracted from a private company codebase, where the
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
- **One config file.** `vouch.config.ts` holds brand name, sender, categories, the three
  questions, recording-page copy, and accent color. It drives the emails, the form, the admin,
  and the AI prompt.
- **Public API boundary.** `lib/public-shape.ts` is an explicit whitelist, so adding a schema
  column can never accidentally publish it. Email is never exposed.
- **Copy-in components.** `components/vouch/` has no imports from the rest of the repo, so it
  survives being pasted into someone else's project. `TestimonialStrip` and `TestimonialWall`,
  plus a fetch client that returns `[]` rather than throwing.
- **Agent-first install docs.** `CLAUDE.md` tells a coding agent to interview the developer about
  placement before writing code, and to restyle the components to the host site.
- **Screenshots** in `docs/screenshots/`, generated from the running app on demo data.

Verified: `tsc --noEmit` clean, `next build` clean, all seven routes render, public API returns
approved-only rows.

Files: `vouch.config.ts`, `lib/{store,email,ai,auth,public-shape,demo-data}.ts`, `lib/db/*`,
`app/{page,layout}.tsx`, `app/submit/*`, `app/admin/*`, `app/api/*`, `components/vouch/*`,
`README.md`, `CLAUDE.md`, `LICENSE`, `.env.example`, `vercel.json`, `drizzle.config.ts`
