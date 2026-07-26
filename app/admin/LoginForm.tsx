'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from './actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900">Debrief admin</h1>
      <p className="mb-8 text-sm text-zinc-500">Enter the admin password for this instance.</p>

      <form action={action} className="space-y-4">
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Password"
          className="d-input"
        />
        {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="d-btn w-full">
          {pending ? 'Checking...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
