"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signInWithGoogle, type AuthState } from "./actions";

const initial: AuthState = {};

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
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
    <div className="login-card">
      <h1 className="brandline">
        Control<b>·</b>Room
      </h1>
      <p className="tagline">Sign in to run the operation.</p>
      <form action={signInWithGoogle}>
        <button className="btn ghost" type="submit">
          Sign in with Google
        </button>
      </form>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
      {oauthError && (
        <div className="err" role="alert" aria-live="assertive">
          {oauthError}
        </div>
      )}
    </div>
  );
}
