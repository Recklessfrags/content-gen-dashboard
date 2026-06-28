import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Reads the session from cookies set by the
// SSR middleware. All access is gated by RLS, so the publishable key is safe here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
