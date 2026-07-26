'use client';

import { useActionState } from 'react';
import { debriefConfig } from '@/debrief.config';
import { sendRequestAction, type ActionState } from './actions';

export default function SendRequestForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendRequestAction, null);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-zinc-900">Ask someone for a testimonial</h2>
      <p className="mb-6 text-sm text-zinc-500">
        {emailEnabled
          ? 'They get an email with a personal recording link.'
          : 'Email is not configured, so you will get a link to send yourself.'}
      </p>

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input name="email" type="email" required placeholder="jane@acme.com" className="d-input" />
          <input name="name" placeholder="Jane Smith" className="d-input" />
        </div>

        {debriefConfig.categories.length > 0 && (
          <select name="category" defaultValue="" className="d-input">
            <option value="">No category</option>
            {debriefConfig.categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        <textarea
          name="customMessage"
          rows={3}
          placeholder="A personal line at the top of the email. Optional, but it doubles the reply rate."
          className="d-input"
        />

        <button type="submit" disabled={pending} className="d-btn">
          {pending ? 'Sending...' : 'Send request'}
        </button>
      </form>

      {state?.ok && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{state.ok}</p>
          {state.link && (
            <p className="mt-2 font-mono text-xs break-all text-emerald-700">{state.link}</p>
          )}
        </div>
      )}
      {state?.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
    </section>
  );
}
