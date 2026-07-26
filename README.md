# Vouch

**Send a link. Your customer records a video. AI writes the testimonial. You approve it. It renders on your site.**

Vouch is a self-hosted testimonial engine. You deploy one instance, it exposes a public read-only API, and you drop a component into your own codebase that reads from it. Your content, your database, your domain.

It is a Next.js app you run yourself, so the videos your customers record live in storage you control and there is nothing to pay per seat.

<p align="center">
  <img src="docs/screenshots/home.png" alt="The Vouch home page" width="900">
</p>

---

## Why video, then text

Almost nobody will sit down and write you three good paragraphs. Almost everybody will talk to their phone for ninety seconds.

So Vouch asks for a video, transcribes it with Whisper, and rewrites it as three short paragraphs in the customer's own voice: the situation before, what changed, and who they would recommend you to. You get a testimonial you can put on a landing page, and a video you can put next to it. The customer spent two minutes.

There is a text mode too, for the people who prefer typing.

---

## The pipeline

| Stage | What happens |
|---|---|
| **Ask** | You send a request from the admin, a script, or your CRM. Each one gets a unique tokenised link. One automatic nudge goes out after seven days, then it stops. |
| **Record** | They open the link, answer three questions on camera, and the video uploads straight from their browser to blob storage. No account, no app. |
| **Process** | Whisper transcribes it. GPT rewrites it into three paragraphs, faithfully, without inventing anything. Both steps run in the background so the customer never waits. |
| **Approve** | Nothing is public until you flip one switch in the admin. |
| **Publish** | Approved testimonials appear on `/api/public/testimonials`, and the components you copied into your site render them. |

Submissions that match a request you sent get a **verified** flag, so you can tell a real customer from a stranger who found the form.

---

## Quick start

```bash
git clone https://github.com/YOU/vouch.git
cd vouch
npm install
npm run dev
```

Open `http://localhost:3000`. **It works immediately with no configuration**, running on in-memory demo data so you can click through the whole system before deciding whether you want it. Nothing persists until you add a database.

Then make it yours by editing one file, `vouch.config.ts`:

```ts
export const vouchConfig: VouchConfig = {
  brandName: 'Acme',
  senderName: 'Alex',
  categories: [{ value: 'consulting', label: 'Consulting' }],
  questions: {
    before: 'What was the situation before we worked together?',
    after: 'What changed after?',
    recommend: 'Would you recommend us, and to whom?',
  },
  recordingPage: {
    eyebrow: 'Customer testimonial',
    title: 'Share your experience',
    intro: 'Two minutes. A short video works best, and one take covers all three questions.',
  },
  accent: '#4F46E5',
};
```

That drives the emails, the recording page, the admin, and the AI prompt. There is no other branding to find and replace.

---

## Going live

Deploy to Vercel (or anywhere that runs Next.js), then set what you need. Every service is optional and degrades honestly rather than crashing.

| Variable | Without it |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Recording links are built against `http://localhost:3000`. Set it before you email anyone. |
| `DATABASE_URL` | Runs on in-memory demo data. Any Postgres works: Neon, Supabase, RDS, local. |
| `BLOB_READ_WRITE_TOKEN` | Video upload is disabled, text mode still works. |
| `ADMIN_PASSWORD` | Admin is open in dev, locked entirely in production. |
| `RESEND_API_KEY` + `EMAIL_FROM` | Requests are still created, the admin just hands you the link to send yourself. |
| `EMAIL_NOTIFY` | No email when a testimonial lands. You find it in the admin instead. |
| `OPENAI_API_KEY` | Videos are stored and playable, but not transcribed or written up. |
| `CRON_SECRET` | The nudge endpoint is unauthenticated. Set it. |

With a real database, push the schema once:

```bash
npm run db:push
```

---

## Putting testimonials on your site

Copy `components/vouch/` into your own project and point it at your instance:

```bash
NEXT_PUBLIC_VOUCH_URL=https://testimonials.yourdomain.com
```

Then use it wherever you want:

```tsx
import TestimonialStrip from '@/components/vouch/TestimonialStrip';

<TestimonialStrip limit={3} heading="What people say" />
```

```tsx
import TestimonialWall from '@/components/vouch/TestimonialWall';

<TestimonialWall />  // full stories with video, for a /testimonials page
```

The components are yours once copied. Restyle them, rename them, tear them apart. They are deliberately plain Tailwind with no dependencies so that editing them is obvious.

**Working with an AI assistant?** This repo ships a [`CLAUDE.md`](CLAUDE.md) written for coding agents. Point Claude Code (or any agent) at it and say *"install Vouch components into this site"*. It will read the contract, ask you where the testimonials should go, and wire it up.

If you would rather not copy components, just read the API:

```
GET https://your-instance/api/public/testimonials?category=consulting&limit=6&featured=true
```

Approved testimonials only, no email addresses, CORS open.

---

## Sending requests programmatically

The admin has a form, but anything can send a request:

```bash
curl -X POST https://your-instance/api/requests \
  -H "Authorization: Bearer $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@acme.com","name":"Jane","customMessage":"Loved building the rollout with you."}'
```

Hook it to the moment a project closes in your CRM and testimonial collection stops being something you remember to do.

---

## The three pages

There are only three, and `npm run dev` shows you all of them on demo data.

**`/submit`** is what your customer sees. Three questions, then record in the browser. Or switch to text and type it.

<p align="center">
  <img src="docs/screenshots/submit-questions.png" alt="The recording page, showing the three questions and the record button" width="900">
</p>

**`/admin`** is the whole job in one screen: who has not replied yet, what is waiting on you, and what is currently live. Approving is one click, and so is changing your mind.

<p align="center">
  <img src="docs/screenshots/admin-review.png" alt="The admin page, showing pending requests and a testimonial awaiting approval" width="900">
</p>

**`/`** is the instance's own front page, with the component rendering live below it, reading from the same instance you are looking at. Delete the file if you would rather the instance had no public homepage.

<p align="center">
  <img src="docs/screenshots/home-strip.png" alt="The TestimonialStrip component rendering approved testimonials" width="900">
</p>

---

## What is deliberately not here

Vouch is small on purpose. There are no user accounts (one password, because one person approves testimonials), no analytics, no widget builder, no plan tiers, and no hosted wall on someone else's domain. If you need any of that, the code is short enough to add it.

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Drizzle + Postgres · Vercel Blob · Resend · OpenAI Whisper + GPT

Each of those is isolated so it can be swapped. Email lives in `lib/email.ts`, AI in `lib/ai.ts`, and the database behind `lib/store.ts`, one file each. Storage is two: `app/api/upload/route.ts` issues the token and `app/submit/TestimonialForm.tsx` uses it.

---

## License

MIT. Use it commercially, fork it, close-source your fork; just keep the copyright notice.
