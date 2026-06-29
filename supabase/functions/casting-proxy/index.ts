// Casting proxy — dashboard-owned Supabase Edge Function.
//
// The dashboard is browser/anon-key only and must never hold the ElevenLabs
// secret. This function is the ONLY place that secret is read. It:
//   1. validates the caller's Supabase session (no open relay),
//   2. enforces a soft per-user/day cap on credit-spending actions,
//   3. proxies the four ElevenLabs calls the Casting Studio needs.
//
// Actions (JSON body discriminator): "design" | "create" | "tts" | "delete".
//   design → POST /v1/text-to-voice/design  (spends credits; capped)
//   create → POST /v1/text-to-voice         (spends credits; capped)
//   tts    → POST /v1/text-to-speech/{id}   (cheap live audition; NOT capped)
//   delete → DELETE /v1/voices/{id}         (library cleanup; NOT capped)
//
// Secret name: ELEVENLABS_API_KEY (set by the operator as a Supabase project
// secret; reuse-pipeline-key vs separate-casting-key is the operator's call).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const EL_BASE = "https://api.elevenlabs.io";
const TTS_MODEL = "eleven_multilingual_v2";
const DAILY_CAP = 25;
const SAMPLE_MIN = 100;
const SAMPLE_MAX = 1000;

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, origin);
  }
  if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Casting proxy is not configured." }, 500, origin);
  }

  // ── 1. session validation (no open relay) ─────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return json({ error: "Missing bearer token." }, 401, origin);
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ error: "Invalid or expired session." }, 401, origin);
  }
  const userId = userData.user.id;

  // ── parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, origin);
  }
  const action = body.action;
  if (action !== "design" && action !== "create" && action !== "tts" && action !== "delete") {
    return json({ error: "Unknown action." }, 400, origin);
  }

  // ── validate inputs BEFORE consuming any cap — a malformed request must not
  // burn a daily cap unit. (trim() length matches the client-side check.) ─────
  if (action === "design") {
    const sample = String(body.text ?? "").trim();
    if (sample.length < SAMPLE_MIN || sample.length > SAMPLE_MAX) {
      return json(
        { error: `Sample text must be ${SAMPLE_MIN}–${SAMPLE_MAX} characters.` },
        400,
        origin,
      );
    }
    if (String(body.voice_description ?? "").trim().length === 0) {
      return json({ error: "voice_description is required." }, 400, origin);
    }
  } else if (action === "create") {
    if (!String(body.voice_name ?? "").trim() || !String(body.generated_voice_id ?? "").trim()) {
      return json(
        { error: "voice_name and generated_voice_id are required." },
        400,
        origin,
      );
    }
  } else if (action === "tts") {
    if (!String(body.voice_id ?? "").trim() || !String(body.text ?? "").trim()) {
      return json({ error: "voice_id and text are required." }, 400, origin);
    }
  } else if (!String(body.voice_id ?? "").trim()) {
    return json({ error: "voice_id is required." }, 400, origin);
  }

  // ── 2. soft cap (design + create only) ────────────────────────────────────
  if (action === "design" || action === "create") {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: cap, error: capError } = await admin.rpc("casting_bump_usage", {
      p_user: userId,
      p_limit: DAILY_CAP,
    });
    if (capError) {
      return json({ error: "Could not check the casting cap." }, 500, origin);
    }
    const row = Array.isArray(cap) ? cap[0] : cap;
    if (!row?.allowed) {
      return json(
        {
          error: `Daily casting cap reached (${DAILY_CAP}/${DAILY_CAP}). Try again tomorrow.`,
          cap_reached: true,
          used: row?.used ?? DAILY_CAP,
          limit: DAILY_CAP,
        },
        429,
        origin,
      );
    }
  }

  // ── 3. proxy to ElevenLabs ────────────────────────────────────────────────
  const elHeaders = {
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json",
  };

  try {
    if (action === "design") {
      const voiceDescription = String(body.voice_description ?? "");
      const text = String(body.text ?? "");
      const res = await fetch(`${EL_BASE}/v1/text-to-voice/design`, {
        method: "POST",
        headers: elHeaders,
        body: JSON.stringify({ voice_description: voiceDescription, text }),
      });
      if (!res.ok) return await elError(res, origin);
      const data = await res.json();
      return json({ previews: data?.previews ?? [] }, 200, origin);
    }

    if (action === "create") {
      const voiceName = String(body.voice_name ?? "");
      const voiceDescription = String(body.voice_description ?? "");
      const generatedVoiceId = String(body.generated_voice_id ?? "");
      const res = await fetch(`${EL_BASE}/v1/text-to-voice`, {
        method: "POST",
        headers: elHeaders,
        body: JSON.stringify({
          voice_name: voiceName,
          voice_description: voiceDescription,
          generated_voice_id: generatedVoiceId,
        }),
      });
      if (!res.ok) return await elError(res, origin);
      const data = await res.json();
      if (!data?.voice_id) {
        return json({ error: "ElevenLabs did not return a voice id." }, 502, origin);
      }
      return json({ voice_id: data.voice_id }, 200, origin);
    }

    if (action === "delete") {
      const voiceId = String(body.voice_id ?? "");
      const res = await fetch(`${EL_BASE}/v1/voices/${encodeURIComponent(voiceId)}`, {
        method: "DELETE",
        headers: elHeaders,
      });
      if (res.status === 404) return json({ ok: true }, 200, origin);
      if (!res.ok) return await elError(res, origin);
      return json({ ok: true }, 200, origin);
    }

    // action === "tts"
    const voiceId = String(body.voice_id ?? "");
    const text = String(body.text ?? "");
    if (!voiceId || !text) {
      return json({ error: "voice_id and text are required." }, 400, origin);
    }
    const voiceSettings =
      body.voice_settings && typeof body.voice_settings === "object"
        ? body.voice_settings
        : {};
    const res = await fetch(
      `${EL_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: { ...elHeaders, Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: voiceSettings,
        }),
      },
    );
    if (!res.ok) return await elError(res, origin);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return json(
      { audio_base_64: encodeBase64(bytes), media_type: "audio/mpeg" },
      200,
      origin,
    );
  } catch (_e) {
    return json({ error: "Casting request failed upstream." }, 502, origin);
  }
});

// Map an ElevenLabs non-2xx response to a clean JSON error (never leak the key
// or raw upstream internals).
async function elError(res: Response, origin: string | null): Promise<Response> {
  let detail = "";
  try {
    const body = await res.json();
    detail =
      (body?.detail?.message as string) ??
      (typeof body?.detail === "string" ? body.detail : "") ??
      (body?.message as string) ??
      "";
  } catch {
    detail = "";
  }
  const status = res.status >= 500 ? 502 : res.status;
  return json(
    { error: `ElevenLabs error (${res.status})${detail ? `: ${detail}` : ""}.` },
    status,
    origin,
  );
}
