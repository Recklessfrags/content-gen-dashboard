"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="brandline">
          Control<b>·</b>Room
        </h1>
        <p className="tagline">
          {mode === "in"
            ? "Sign in to run the operation."
            : "Create your operator account."}
        </p>
        <form action={formAction}>
          <label>
            <span className="lbl">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            <span className="lbl">Password</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
              placeholder="••••••••"
            />
          </label>
          <button className="btn" type="submit" disabled={pending}>
            {pending
              ? "Working…"
              : mode === "in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        {state.error && <div className="err">{state.error}</div>}
        <button
          type="button"
          className="toggle"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
