'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { debriefConfig } from '@/debrief.config';
import VideoCapture from './VideoCapture';

const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type SubmissionState = 'idle' | 'uploading' | 'submitting' | 'error';
type Mode = 'video' | 'text';
type StepId = 'you' | 'proof' | 'record' | 'before' | 'after' | 'recommend' | 'finish';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One question per screen, no page scroll.
 *
 * The old version was a single long form, which is the blank page in another
 * costume: you see everything you owe before you have given anything. Stepping
 * through it means each screen asks for one small thing, and the card is sized
 * so a phone and a laptop show the same amount of work left.
 */
export default function TestimonialForm({ uploadsEnabled }: { uploadsEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const { questions, categories, recordingPage } = debriefConfig;

  const [mode, setMode] = useState<Mode>(uploadsEnabled ? 'video' : 'text');
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [headshot, setHeadshot] = useState<File | null>(null);

  const [values, setValues] = useState({
    name: params.get('name') || '',
    role: '',
    company: '',
    companyUrl: '',
    linkedinUrl: '',
    email: params.get('email') || '',
    category: params.get('category') || '',
    situationBefore: '',
    whatChanged: '',
    recommendation: '',
  });

  const set = (key: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (state === 'error') setState('idle');
  };

  const steps: StepId[] =
    mode === 'video'
      ? ['you', 'proof', 'record', 'finish']
      : ['you', 'proof', 'before', 'after', 'recommend', 'finish'];

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex === steps.length - 1;
  const isBusy = state === 'uploading' || state === 'submitting';

  const fail = (message: string) => {
    setState('error');
    setErrorMessage(message);
    setProgress(null);
  };

  /** Only the current screen's fields are checked, so nobody is told about a problem they cannot see. */
  function validateStep(): string | null {
    const v = values;
    switch (step) {
      case 'you':
        if (!v.name.trim() || !v.role.trim()) return 'Your name and role, please.';
        if (categories.length > 0 && !v.category) return 'Pick which service you used.';
        return null;
      case 'proof': {
        if (!EMAIL_RE.test(v.email.trim())) return 'That email does not look right.';
        const companyUrl = normalizeUrl(v.companyUrl);
        const linkedinUrl = normalizeUrl(v.linkedinUrl);
        if (!companyUrl && !linkedinUrl) return 'Share your company website, or your LinkedIn.';
        if (companyUrl && !looksLikeUrl(companyUrl)) return 'That website does not look right. Try acme.com.';
        if (linkedinUrl && !looksLikeUrl(linkedinUrl)) return 'That LinkedIn does not look right.';
        return null;
      }
      case 'record':
        if (!videoFile) return 'Record or upload a video, or switch to writing.';
        if (videoFile.size > MAX_VIDEO_BYTES) return 'That video is too large. Max 150MB.';
        return null;
      case 'before':
        return v.situationBefore.trim() ? null : 'A sentence or two is plenty.';
      case 'after':
        return v.whatChanged.trim() ? null : 'A sentence or two is plenty.';
      case 'recommend':
        return v.recommendation.trim() ? null : 'A sentence or two is plenty.';
      case 'finish':
        if (headshot && headshot.size > MAX_IMAGE_BYTES) return 'That photo is too large. Max 5MB.';
        return null;
    }
  }

  function next() {
    const problem = validateStep();
    if (problem) return fail(problem);
    setState('idle');
    setErrorMessage('');
    if (isLast) void submit();
    else setStepIndex((i) => i + 1);
  }

  function back() {
    setState('idle');
    setErrorMessage('');
    setStepIndex((i) => Math.max(0, i - 1));
  }

  /** Switching mode mid-flow keeps the answers already given and rewinds to the answer step. */
  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setState('idle');
    setErrorMessage('');
    setStepIndex((i) => Math.min(i, 2));
  }

  async function submit() {
    setState('submitting');
    setErrorMessage('');

    // Files go straight from the browser to blob storage, so a large video
    // never passes through the server.
    const send = async (file: File, folder: string) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const contentType = (file.type || 'application/octet-stream').split(';')[0].trim();
      const blob = await upload(`testimonials/${folder}/${Date.now()}-${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType,
        // The recording link's token. Under inviteOnly the server will not issue
        // an upload slot without it.
        clientPayload: token,
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
      if (headshot && headshot.size > 0) {
        setProgress('Uploading your photo');
        headshotUrl = await send(headshot, 'photos');
      }

      setState('submitting');
      setProgress('Saving');

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          role: values.role.trim(),
          company: values.company.trim() || null,
          companyUrl: normalizeUrl(values.companyUrl),
          linkedinUrl: normalizeUrl(values.linkedinUrl),
          email: values.email.trim().toLowerCase(),
          category: values.category || null,
          situationBefore: values.situationBefore.trim() || null,
          whatChanged: values.whatChanged.trim() || null,
          recommendation: values.recommendation.trim() || null,
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

  const heading: Record<StepId, { title: string; hint?: string }> = {
    you: { title: 'First, who are you?', hint: 'This is how you will be credited.' },
    proof: { title: 'How can readers check you are real?', hint: 'Your email stays private. The link does not.' },
    record: { title: 'Now the good part', hint: 'One take, 60 to 120 seconds. Rambling is fine, we clean it up.' },
    before: { title: questions.before, hint: 'A sentence or two. Talk like you would to a friend.' },
    after: { title: questions.after, hint: 'Be specific. Concrete results land best.' },
    recommend: { title: questions.recommend },
    finish: { title: 'That is everything', hint: 'Add a photo if you like, then send it over.' },
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-3 sm:py-6">
      <div className="w-full max-w-2xl lg:max-w-3xl">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-accent uppercase">
              {recordingPage.eyebrow}
            </p>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900">{recordingPage.title}</h1>
          </div>
          {uploadsEnabled && step !== 'finish' && (
            <div className="inline-flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
              {(['video', 'text'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  disabled={isBusy}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors disabled:opacity-40 ${
                    mode === m ? 'bg-accent text-accent-contrast' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {m === 'text' ? 'Write' : 'Record'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              {stepIndex + 1}/{steps.length}
            </span>
          </div>

          <h2 className="text-lg leading-snug font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {heading[step].title}
          </h2>
          {heading[step].hint && (
            <p className="mt-1.5 text-xs text-zinc-500 sm:text-sm">{heading[step].hint}</p>
          )}

          <div className="mt-4 min-h-[11rem] sm:mt-5 sm:min-h-[14rem]">
            {step === 'you' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Name" value={values.name} onChange={set('name')} placeholder="Jane Smith" autoFocus />
                  <Field label="Role" value={values.role} onChange={set('role')} placeholder="Head of Operations" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Company (optional)"
                    value={values.company}
                    onChange={set('company')}
                    placeholder="Acme Corp"
                  />
                  {categories.length > 0 && (
                    <div>
                      <label htmlFor="category" className="d-label-sm">
                        What did we work on?
                      </label>
                      <select
                        id="category"
                        value={values.category}
                        onChange={(e) => set('category')(e.target.value)}
                        className="d-input-sm"
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
                </div>
              </div>
            )}

            {step === 'proof' && (
              <div className="space-y-3">
                <Field
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={set('email')}
                  placeholder="you@company.com"
                  hint="Never published. It is only how we know it is you."
                  autoFocus
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Company website"
                    value={values.companyUrl}
                    onChange={set('companyUrl')}
                    placeholder="acme.com"
                    url
                  />
                  <Field
                    label="or LinkedIn"
                    value={values.linkedinUrl}
                    onChange={set('linkedinUrl')}
                    placeholder="linkedin.com/in/yourname"
                    url
                  />
                </div>
              </div>
            )}

            {step === 'record' && (
              <div>
                <ol className="mb-3 grid gap-1.5 text-xs leading-snug text-zinc-600 sm:mb-4 sm:grid-cols-3 sm:text-sm">
                  {[questions.before, questions.after, questions.recommend].map((q, i) => (
                    <li key={q} className="rounded-lg bg-zinc-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                      <span className="mr-1.5 font-mono text-[10px] text-accent sm:text-xs">{i + 1}</span>
                      {q}
                    </li>
                  ))}
                </ol>
                <VideoCapture onChange={setVideoFile} maxBytes={MAX_VIDEO_BYTES} />
              </div>
            )}

            {(step === 'before' || step === 'after' || step === 'recommend') && (
              <textarea
                key={step}
                autoFocus
                rows={5}
                value={
                  step === 'before'
                    ? values.situationBefore
                    : step === 'after'
                      ? values.whatChanged
                      : values.recommendation
                }
                onChange={(e) =>
                  set(
                    step === 'before' ? 'situationBefore' : step === 'after' ? 'whatChanged' : 'recommendation',
                  )(e.target.value)
                }
                className="d-input-sm resize-none leading-relaxed"
                placeholder="Type here..."
              />
            )}

            {step === 'finish' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="headshot" className="d-label-sm">
                    Photo (optional)
                  </label>
                  <input
                    id="headshot"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!uploadsEnabled}
                    onChange={(e) => setHeadshot(e.currentTarget.files?.[0] ?? null)}
                    className="w-full cursor-pointer text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-40"
                  />
                </div>
                <dl className="rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4 py-1">
                    <dt className="text-zinc-500">Name</dt>
                    <dd className="truncate font-medium text-zinc-900">
                      {values.name}
                      {values.company ? `, ${values.company}` : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1">
                    <dt className="text-zinc-500">Testimonial</dt>
                    <dd className="font-medium text-zinc-900">
                      {mode === 'video' ? (videoFile ? 'Video recorded' : 'No video') : 'Written, 3 answers'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {progress && <p className="mt-4 font-mono text-sm text-zinc-500">{progress}...</p>}
          {state === 'error' && errorMessage && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
            <button
              type="button"
              onClick={back}
              disabled={stepIndex === 0 || isBusy}
              className="d-btn-secondary px-4 py-2 text-sm disabled:invisible"
            >
              Back
            </button>
            <button type="button" onClick={next} disabled={isBusy} className="d-btn px-8 py-2.5">
              {state === 'uploading'
                ? 'Uploading...'
                : state === 'submitting'
                  ? 'Sending...'
                  : isLast
                    ? 'Send it'
                    : 'Continue'}
            </button>
          </div>
        </div>

        {!uploadsEnabled && (
          <p className="mt-3 text-center text-xs text-zinc-400">
            Video is switched off on this instance, so this is the written version.
          </p>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  url = false,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  url?: boolean;
  autoFocus?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]/g, '');
  return (
    <div>
      <label htmlFor={id} className="d-label-sm">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="d-input-sm"
        {...(url
          ? { inputMode: 'url' as const, autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }
          : {})}
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
