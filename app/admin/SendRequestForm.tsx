'use client';

import { useActionState, useRef, useState } from 'react';
import { debriefConfig } from '@/debrief.config';
import { sendRequestAction, type ActionState } from './actions';

/**
 * Asking someone is the one thing you do here that is not reacting to something,
 * so it lives behind a button rather than taking up the top of the dashboard.
 *
 * A native <dialog> on purpose: Escape, focus trapping, and the backdrop come
 * from the browser instead of from us.
 */
export default function SendRequestForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendRequestAction, null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast hover:opacity-90"
      >
        New request
      </button>

      <dialog
        ref={dialog}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-zinc-900/40"
      >
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Ask for a testimonial</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {emailEnabled
                  ? 'They get an email with their own recording link.'
                  : 'Email is not configured, so you get a link to send yourself.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mt-1 rounded-lg px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            >
              &times;
            </button>
          </div>

          <form action={action} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="d-label-sm" htmlFor="req-email">
                  Email
                </label>
                <input
                  id="req-email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="jane@acme.com"
                  className="d-input-sm"
                />
              </div>
              <div>
                <label className="d-label-sm" htmlFor="req-name">
                  Name
                </label>
                <input id="req-name" name="name" placeholder="Jane Smith" className="d-input-sm" />
              </div>
            </div>

            {debriefConfig.categories.length > 0 && (
              <div>
                <label className="d-label-sm" htmlFor="req-category">
                  Category
                </label>
                <select id="req-category" name="category" defaultValue="" className="d-input-sm">
                  <option value="">No category</option>
                  {debriefConfig.categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="d-label-sm" htmlFor="req-message">
                A personal line at the top of the email
              </label>
              <textarea
                id="req-message"
                name="customMessage"
                rows={2}
                placeholder="Optional, and it roughly doubles the reply rate."
                className="d-input-sm"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Sending...' : 'Send request'}
            </button>
          </form>

          {state?.ok && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-800">{state.ok}</p>
            </div>
          )}
          {state?.error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {state.error}
            </p>
          )}
          {state?.link && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-600">
                {state.link}
              </code>
              <button
                type="button"
                onClick={() => copy(state.link!)}
                className="shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:border-zinc-400"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
