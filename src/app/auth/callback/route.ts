import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(candidate: string | null, origin: string): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) return "/";

  try {
    const target = new URL(candidate, origin);
    if (target.origin !== origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL(
      safeNextPath(requestUrl.searchParams.get("next"), requestUrl.origin),
      requestUrl.origin,
    ),
  );
}
