# Changelog

## 2026-07-26 08:30 — Initial open-source release

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
