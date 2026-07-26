'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { vouchConfig } from '@/vouch.config';
import VideoCapture from './VideoCapture';

const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type SubmissionState = 'idle' | 'uploading' | 'submitting' | 'error';
type Mode = 'video' | 'text';

/** People type "acme.com". Accept it, and don't make them think about protocols. */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function looksLikeUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    return new URL(value).hostname.includes('.');
  } catch {
    return false;
  }
}

export default function TestimonialForm({ uploadsEnabled }: { uploadsEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const { questions, categories, recordingPage } = vouchConfig;

  const [mode, setMode] = useState<Mode>(uploadsEnabled ? 'video' : 'text');
  const [state, setState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [headshotName, setHeadshotName] = useState<string | null>(null);

  const isBusy = state === 'uploading' || state === 'submitting';

  const fail = (message: string) => {
    setState('error');
    setErrorMessage(message);
    setProgress(null);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMessage('');

    const fd = new FormData(e.currentTarget);
    const text = (key: string) => ((fd.get(key) as string) || '').trim();

    const name = text('name');
    const role = text('role');
    const email = text('email').toLowerCase();
    const category = text('category');
    const companyUrl = normalizeUrl(text('companyUrl'));
    const linkedinUrl = normalizeUrl(text('linkedinUrl'));
    const situationBefore = text('situationBefore');
    const whatChanged = text('whatChanged');
    const recommendation = text('recommendation');
    const headshotFile = fd.get('headshot') as File | null;

    if (!name || !role || !email) return fail('Please fill in your name, role, and email.');
    if (categories.length > 0 && !category) return fail('Please pick which service you used.');
    if (!companyUrl && !linkedinUrl) {
      return fail('Please share your company website, or your LinkedIn if you do not have one.');
    }
    if (companyUrl && !looksLikeUrl(companyUrl)) return fail('That website does not look right. Try acme.com.');
    if (linkedinUrl && !looksLikeUrl(linkedinUrl)) {
      return fail('That LinkedIn does not look right. Try linkedin.com/in/yourname.');
    }
    if (mode === 'text' && (!situationBefore || !whatChanged || !recommendation)) {
      return fail('Please answer all three questions, or switch to video.');
    }
    if (mode === 'video' && !videoFile) return fail('Please record or upload a video, or switch to text.');
    if (videoFile && videoFile.size > MAX_VIDEO_BYTES) return fail('That video is too large. Max 150MB.');
    if (headshotFile && headshotFile.size > MAX_IMAGE_BYTES) return fail('That photo is too large. Max 5MB.');

    // Files go straight from the browser to blob storage, so a large video
    // never passes through the server.
    const send = async (file: File, folder: string) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const contentType = (file.type || 'application/octet-stream').split(';')[0].trim();
      const blob = await upload(`testimonials/${folder}/${Date.now()}-${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType,
      });
      return blob.url;
    };

    try {
      let videoUrl: string | null = null;
      let headshotUrl: string | null = null;

      if (videoFile) {
        setState('uploading');
        setProgress('Uploading your video');
        videoUrl = await send(videoFile, 'videos');
      }
      if (headshotFile && headshotFile.size > 0) {
        setProgress('Uploading your photo');
        headshotUrl = await send(headshotFile, 'photos');
      }

      setState('submitting');
      setProgress('Saving');

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          company: text('company') || null,
          companyUrl,
          linkedinUrl,
          email,
          category: category || null,
          situationBefore: situationBefore || null,
          whatChanged: whatChanged || null,
          recommendation: recommendation || null,
          videoUrl,
          headshotUrl,
          token: token || null,
          mode,
        }),
      });

      const result = await res.json();
      if (result.success) router.push('/submit/thank-you');
      else fail(result.error || 'Something went wrong. Please try again.');
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <p className="mb-3 text-xs font-semibold tracking-widest text-accent uppercase">
        {recordingPage.eyebrow}
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
        {recordingPage.title}
      </h1>
      <p className="mb-10 text-base leading-relaxed text-zinc-600">{recordingPage.intro}</p>

      <div className="mb-10 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        {(['video', 'text'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={isBusy || (m === 'video' && !uploadsEnabled)}
            className={`rounded-md px-5 py-2 text-sm font-semibold capitalize transition-colors disabled:opacity-40 ${
              mode === m ? 'bg-accent text-accent-contrast' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {!uploadsEnabled && (
        <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Video uploads are not configured on this instance, so text mode it is.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="v-label">
              Your name <span className="text-accent">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Jane Smith"
              defaultValue={params.get('name') || ''}
              className="v-input"
            />
          </div>
          <div>
            <label htmlFor="role" className="v-label">
              Your role <span className="text-accent">*</span>
            </label>
            <input id="role" name="role" required placeholder="Head of Operations" className="v-input" />
          </div>
        </div>

        <div>
          <label htmlFor="company" className="v-label">
            Company
          </label>
          <input id="company" name="company" placeholder="Acme Corp" className="v-input" />
        </div>

        <fieldset className="space-y-5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            A public link, so readers can see you are real <span className="text-accent">*</span>
          </legend>
          <p className="-mt-2 text-xs text-zinc-500">
            Your company website is ideal. LinkedIn works too. One of the two.
          </p>
          <div>
            <label htmlFor="companyUrl" className="v-label">
              Company website
            </label>
            <input
              id="companyUrl"
              name="companyUrl"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="acme.com"
              className="v-input"
            />
          </div>
          <div>
            <label htmlFor="linkedinUrl" className="v-label">
              LinkedIn
            </label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="linkedin.com/in/yourname"
              className="v-input"
            />
          </div>
        </fieldset>

        <div>
          <label htmlFor="email" className="v-label">
            Email <span className="text-accent">*</span>
          </label>
          <p className="v-hint">Never published. It is only how we know it is you.</p>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            defaultValue={params.get('email') || ''}
            className="v-input"
          />
        </div>

        {categories.length > 0 && (
          <div>
            <label htmlFor="category" className="v-label">
              What did we work on? <span className="text-accent">*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue={params.get('category') || ''}
              className="v-input"
            >
              <option value="">Select one...</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'video' ? (
          <div>
            <label className="v-label">
              Your video <span className="text-accent">*</span>
            </label>
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="mb-2 text-sm font-semibold text-zinc-900">
                Answer these three in one take, 60 to 120 seconds.
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-zinc-700">
                <li>{questions.before}</li>
                <li>{questions.after}</li>
                <li>{questions.recommend}</li>
              </ol>
            </div>
            <VideoCapture onChange={setVideoFile} maxBytes={MAX_VIDEO_BYTES} />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="situationBefore" className="v-label">
                {questions.before} <span className="text-accent">*</span>
              </label>
              <textarea id="situationBefore" name="situationBefore" rows={3} required className="v-input" />
            </div>
            <div>
              <label htmlFor="whatChanged" className="v-label">
                {questions.after} <span className="text-accent">*</span>
              </label>
              <p className="v-hint">Be specific. Concrete results land best.</p>
              <textarea id="whatChanged" name="whatChanged" rows={3} required className="v-input" />
            </div>
            <div>
              <label htmlFor="recommendation" className="v-label">
                {questions.recommend} <span className="text-accent">*</span>
              </label>
              <textarea id="recommendation" name="recommendation" rows={3} required className="v-input" />
            </div>
          </>
        )}

        <div>
          <label htmlFor="headshot" className="v-label">
            Photo (optional)
          </label>
          <p className="v-hint">Shown next to your testimonial. JPG, PNG, or WebP, up to 5MB.</p>
          <input
            id="headshot"
            name="headshot"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!uploadsEnabled}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              setHeadshotName(f ? `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)` : null);
            }}
            className="w-full cursor-pointer text-sm text-zinc-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-40"
          />
          {headshotName && <p className="mt-2 font-mono text-xs text-zinc-500">{headshotName}</p>}
        </div>

        {progress && <p className="font-mono text-sm text-zinc-500">{progress}...</p>}
        {state === 'error' && errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={isBusy} className="v-btn w-full py-4 sm:w-auto sm:px-10">
          {state === 'uploading' ? 'Uploading...' : state === 'submitting' ? 'Sending...' : 'Send testimonial'}
        </button>
      </form>
    </main>
  );
}
