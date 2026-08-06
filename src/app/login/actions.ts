"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

// Public signup is intentionally disabled; authenticated users are a closed,
// trusted operator set for this dashboard.
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/");
}

export async function signInWithGoogle(): Promise<void> {
  let origin: string | undefined;
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    try {
      origin = new URL(configuredSiteUrl).origin;
    } catch {
      origin = undefined;
    }
  } else {
    const headerStore = await headers();
    const forwardedHost = headerStore
      .get("x-forwarded-host")
      ?.split(",")[0]
      .trim();
    const forwardedProto = headerStore
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim();
    const host = forwardedHost || headerStore.get("host");
    const protocol =
      forwardedProto === "http" || forwardedProto === "https"
        ? forwardedProto
        : "https";

    try {
      if (!host) throw new Error("Missing request host");
      origin = new URL(`${protocol}://${host}`).origin;
    } catch {
      origin = undefined;
    }
  }

  if (!origin) redirect("/login?error=auth");

  const supabase = await createClient();
  // Supabase's Redirect URL allowlist is the authoritative backstop; production
  // must include this callback URL even though NEXT_PUBLIC_SITE_URL is preferred.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) redirect("/login?error=auth");
  redirect(data.url);
}
