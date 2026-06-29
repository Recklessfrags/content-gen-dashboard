import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";
import { cookies } from "next/headers";

// Server-side Supabase client for Server Components / Route Handlers / Actions.
// The SupabaseCompatibleDatabase cast works around a supabase-js Insert/Update
// inference bug — see compat.ts.
export async function createClient(): Promise<SupabaseClient<SupabaseCompatibleDatabase>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; the middleware
            // refreshes the session cookie on every request.
          }
        },
      },
    },
  ) as unknown as SupabaseClient<SupabaseCompatibleDatabase>;
}
