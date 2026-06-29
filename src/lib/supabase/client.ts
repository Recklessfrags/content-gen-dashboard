import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";

// Browser-side Supabase client. Reads the session from cookies set by the
// SSR middleware. All access is gated by RLS, so the publishable key is safe here.
// The SupabaseCompatibleDatabase cast works around a supabase-js Insert/Update
// inference bug — see compat.ts.
export function createClient(): SupabaseClient<SupabaseCompatibleDatabase> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<SupabaseCompatibleDatabase>;
}
