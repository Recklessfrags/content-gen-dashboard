"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signInWithGoogle, type AuthState } from "./actions";

const initial: AuthState = {};

export default function LoginPage() {
  return (
    <div className="aurora-app login-aurora">
      <div className="aurora-backdrop" />
      <div className="aurora-noise" />
      <div className="login-aurora__wrap">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initial);
  const [email, setEmail] = useState("");
  const errorCode = useSearchParams().get("error");
  const oauthError =
    errorCode === "not_invited"
      ? "This Google account is not invited to this dashboard."
      : errorCode === "auth"
        ? "Google sign-in could not be completed. Please try again."
        : undefined;

  return (
    <div className="glass-panel login-aurora__card">
      <header className="login-aurora__head">
        <h1 className="text-display login-aurora__brand">
          Control<span aria-hidden="true">·</span>Room
        </h1>
        <p className="text-body login-aurora__tagline">
          Sign in to run the operation.
        </p>
      </header>

      <form action={signInWithGoogle}>
        <button className="btn btn-secondary login-aurora__btn" type="submit">
          Sign in with Google
        </button>
      </form>

      <div className="login-aurora__divider" role="separator">
        <span>or</span>
      </div>

      <form action={formAction} className="login-aurora__form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button
          className="btn btn-primary login-aurora__btn"
          type="submit"
          disabled={pending}
        >
          {pending ? "Working…" : "Sign in"}
        </button>
      </form>

      {state.error && (
        <div className="login-aurora__err" role="alert" aria-live="assertive">
          {state.error}
        </div>
      )}
      {oauthError && (
        <div className="login-aurora__err" role="alert" aria-live="assertive">
          {oauthError}
        </div>
      )}
    </div>
  );
}
