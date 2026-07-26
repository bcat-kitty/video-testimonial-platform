'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from './actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="mb-6 text-xs font-bold tracking-widest text-accent uppercase">Debrief</p>
        <h1 className="mb-1 text-xl font-bold tracking-tight text-zinc-900">Sign in</h1>
        <p className="mb-6 text-sm text-zinc-500">The admin password for this instance.</p>

        <form action={action} className="space-y-3">
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="Password"
            className="d-input-sm"
          />
          {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending} className="d-btn w-full">
            {pending ? 'Checking...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
