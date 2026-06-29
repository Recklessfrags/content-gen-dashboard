"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "./actions";

const initial: AuthState = {};

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <LoginForm />
    </div>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <div className="login-card">
      <h1 className="brandline">
        Control<b>·</b>Room
      </h1>
      <p className="tagline">Sign in to run the operation.</p>
      <form action={formAction}>
        <label htmlFor="email">
          <span className="lbl">Email</span>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label htmlFor="password">
          <span className="lbl">Password</span>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </label>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Working…" : "Sign in"}
        </button>
      </form>
      {state.error && (
        <div className="err" role="alert" aria-live="assertive">
          {state.error}
        </div>
      )}
    </div>
  );
}
