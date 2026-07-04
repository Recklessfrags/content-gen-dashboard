// Channel guideline proxy — dashboard-owned Supabase Edge Function.
//
// The dashboard is browser/anon-key only and must never hold the Anthropic
// secret. This function validates the caller's Supabase session, enforces a
// soft per-user/day cap, and returns non-binding guideline suggestions only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_BASE = "https://api.anthropic.com";
const ANTHROPIC_MODEL = "claude-opus-4-8";
const ANTHROPIC_VERSION = "2023-06-01";
const DAILY_CAP = 10;
const DESCRIPTION_MIN = 30;
const DESCRIPTION_MAX = 2000;
const BRIEF_MAX_TOKENS = 1024;
const MAP_MAX_TOKENS = 1536;
const CHANNEL_GUIDELINE_ALLOWED_ORIGINS = Deno.env.get("CHANNEL_GUIDELINE_ALLOWED_ORIGINS");
const allowedOrigins = CHANNEL_GUIDELINE_ALLOWED_ORIGINS
  ? new Set(
      CHANNEL_GUIDELINE_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
  : null;

const GUIDELINE_TOOL = {
  name: "propose_channel_guidelines",
  description: "Propose non-binding guideline fields for a short-form video channel from its concept. Guideline fields only — never a character, never a must-do rule.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      display_name: { type: "string", description: "Short human-facing channel name." },
      voice_archetype: { type: "string", description: "Open-vocabulary narrator archetype (e.g. drill_instructor, calm_explainer, npr_explainer, hype_announcer)." },
      fact_anchor: { type: "string", enum: ["fda_standard_of_identity", "declassified_primary_doc", "none"] },
      treatment: { type: "string", enum: ["archival_documentary", "motion_graphic", "avatar", "live_demo"] },
      engagement_posture: {
        type: "object",
        additionalProperties: false,
        properties: {
          claim_discipline: { type: "string", enum: ["fact_first", "loose", "none"] },
          arousal_ceiling: { type: "string", enum: ["conservative", "standard"] }
        },
        required: ["claim_discipline", "arousal_ceiling"]
      },
      source_ladder: { type: "array", items: { type: "string" }, description: "Ordered evidence/footage ladder, e.g. archival, still_motion, generated." },
      packaging: {
        type: "object",
        additionalProperties: false,
        properties: {
          title_style: { type: "string" },
          thumbnail_style: { type: "string" }
        }
      },
      length_target: {
        type: "object",
        additionalProperties: false,
        properties: { short_s: { type: "integer" } }
      },
      platforms: { type: "array", items: { type: "string" } },
      assumptions: { type: "array", items: { type: "string" }, description: "2-4 short notes on what you inferred/guessed from an ambiguous concept." },
      cast_brief: {
        type: "object",
        additionalProperties: false,
        properties: {
          voice_description: { type: "string", description: "200-600 chars of vivid, ElevenLabs-ready prose describing the ideal narrator voice (age, timbre, energy, delivery) for short-form narration. Describe a voice, not a named person." },
          preview_line: { type: "string", description: "One 8-20 word sample line delivered in that voice." }
        },
        required: ["voice_description", "preview_line"]
      }
    },
    required: ["display_name", "voice_archetype", "fact_anchor", "treatment", "engagement_posture", "source_ladder", "packaging", "length_target", "platforms", "assumptions", "cast_brief"]
  }
};

const BRIEF_SYSTEM_PROMPT = `You are a short-form video channel strategist. Given a plain-language channel concept, write a tight editorial brief (150-250 words) an operator could hand to a production team. Cover, as flowing prose (not headers or bullet lists): positioning and audience; the hook and engagement posture (honest and non-sensational — this is fact-first short-form, never clickbait); the evidence and sourcing stance; the visual treatment; the packaging voice for titles and thumbnails; and the ideal narration voice. Be concrete and specific to THIS concept. Do not invent facts, do not output rules, and do not name a host or character — describe the channel, not a cast member.`;

const MAP_SYSTEM_PROMPT = `You configure GUIDELINE fields for a short-form (vertical, ~15–90s) video channel. You are given the channel concept AND an editorial brief — the brief is your source of truth for tone and stance; map it faithfully into the tool schema. You fill an editable form the operator will review and can override — your output is advisory, never binding.

Rules:
- Propose GUIDELINE fields ONLY. Never invent a host/character, never output universal must-do rules — those live elsewhere.
- Enum fields must use one of the allowed values in the tool schema. When the concept is ambiguous, PREFER THE SAFE FLOOR: fact_anchor=none, claim_discipline=fact_first, arousal_ceiling=conservative. Never propose anything sensational; the highest arousal you may propose is "standard".
- claim_discipline and arousal_ceiling are ENFORCED downstream, so bias conservative and record any inference in \`assumptions\`.
- fact_anchor: use fda_standard_of_identity only for food/ingredient-integrity channels; declassified_primary_doc only for history/document-driven channels; otherwise none.
- treatment: archival_documentary (archival footage + VO), motion_graphic (graphics/data), avatar (a presenter persona), live_demo (hands-on demonstration). Pick the closest.
- source_ladder: 2–4 short tokens, most-preferred first (e.g. archival, still_motion, generated).
- length_target.short_s: an integer number of seconds in [15, 180]; ~60 if unsure.
- packaging.title_style / thumbnail_style: one concise phrase each (non-enforcing suggestions).
- platforms: from {tiktok, youtube_shorts, instagram_reels} unless the concept names others.
- assumptions: 2–4 short strings naming what you inferred from an ambiguous concept. Be honest and specific.
- cast_brief: voice_description is 200–600 characters of vivid, ElevenLabs-ready prose for the ideal narrator voice (age, timbre, energy, delivery), suited to short-form narration — describe a VOICE, never a named person. preview_line is one 8–20 word sample line delivered in that voice. This is an advisory cast brief, not a character.
Return exactly one tool call.`;

const FACT_ANCHOR = ["fda_standard_of_identity", "declassified_primary_doc", "none"];
const TREATMENT = ["archival_documentary", "motion_graphic", "avatar", "live_demo"];
const CLAIM_DISCIPLINE = ["fact_first", "loose", "none"];
const AROUSAL_CEILING = ["conservative", "standard"];

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };

  // Setting CHANNEL_GUIDELINE_ALLOWED_ORIGINS enables strict CORS mode; production should set it.
  if (allowedOrigins) {
    if (origin && allowedOrigins.has(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
  } else {
    headers["Access-Control-Allow-Origin"] = origin ?? "*";
  }

  return headers;
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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampToCatalog(value: unknown, catalog: string[], fallback: string) {
  return typeof value === "string" && catalog.includes(value) ? value : fallback;
}

function cleanStringList(value: unknown, cap: number) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string" && v.trim().length > 0).map((v) => v.trim()).slice(0, cap);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractText(data: any) {
  return Array.isArray(data?.content)
    ? data.content.filter((b: any) => b?.type === "text").map((b: any) => (typeof b?.text === "string" ? b.text : "")).join("\n").trim()
    : "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, origin);
  }
  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Channel guideline proxy is not configured." }, 500, origin);
  }

  // ── session validation (no open relay) ────────────────────────────────────
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
  if (action !== "generate") {
    return json({ error: "Unknown action." }, 400, origin);
  }

  // ── validate inputs BEFORE consuming any cap ──────────────────────────────
  const description = String(body.description ?? "").trim();
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    return json(
      { error: `Description must be ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters.` },
      400,
      origin,
    );
  }

  // ── soft cap ──────────────────────────────────────────────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: cap, error: capError } = await admin.rpc("channel_guideline_bump_usage", {
    p_user: userId,
    p_limit: DAILY_CAP,
  });
  if (capError) {
    return json({ error: "Could not check the generation cap." }, 500, origin);
  }
  const row = Array.isArray(cap) ? cap[0] : cap;
  if (!row?.allowed) {
    return json(
      {
        error: `Daily generation cap reached (${DAILY_CAP}/${DAILY_CAP}). Try again tomorrow.`,
        cap_reached: true,
        used: row?.used ?? DAILY_CAP,
        limit: DAILY_CAP,
      },
      429,
      origin,
    );
  }

  // ── Anthropic Messages call ───────────────────────────────────────────────
  try {
    // ── stage 1: editorial brief (prose) ──────────────────────────────────
    const briefRes = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: BRIEF_MAX_TOKENS,
        temperature: 0.4,
        system: BRIEF_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Channel concept:\n\n${description}` }],
      }),
    });
    if (!briefRes.ok) return await anthropicError(briefRes, origin);
    const briefData = await briefRes.json();
    if (briefData?.stop_reason === "refusal") {
      return json({ error: "The model declined to generate guidelines for this concept. Edit the description and try again." }, 200, origin);
    }
    const brief = extractText(briefData);
    if (!brief) {
      return json({ error: "The model did not return a usable brief. Try a more specific description." }, 200, origin);
    }

    // ── stage 2: map concept + brief → guideline fields + cast brief ───────
    const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAP_MAX_TOKENS,
        temperature: 0.2,
        system: MAP_SYSTEM_PROMPT,
        tools: [GUIDELINE_TOOL],
        tool_choice: { type: "tool", name: "propose_channel_guidelines" },
        messages: [{ role: "user", content: `Channel concept:\n\n${description}\n\nEditorial brief:\n\n${brief}` }],
      }),
    });
    if (!res.ok) return await anthropicError(res, origin);

    const data = await res.json();
    if (data?.stop_reason === "refusal") {
      return json(
        { error: "The model declined to generate guidelines for this concept. Edit the description and try again." },
        200,
        origin,
      );
    }
    const block = Array.isArray(data?.content) ? data.content.find((b) => b?.type === "tool_use") : null;
    if (!block) {
      return json(
        { error: "The model did not return a usable suggestion. Try a more specific description." },
        200,
        origin,
      );
    }

    const raw = block.input ?? {};
    const posture = raw.engagement_posture && typeof raw.engagement_posture === "object" ? raw.engagement_posture : {};
    const packaging = raw.packaging && typeof raw.packaging === "object" ? raw.packaging : {};
    const lengthTarget = raw.length_target && typeof raw.length_target === "object" ? raw.length_target : {};
    const suggestions = {
      display_name: cleanText(raw.display_name),
      voice_archetype: cleanText(raw.voice_archetype),
      fact_anchor: clampToCatalog(raw.fact_anchor, FACT_ANCHOR, "none"),
      treatment: clampToCatalog(raw.treatment, TREATMENT, "archival_documentary"),
      engagement_posture: {
        claim_discipline: clampToCatalog(posture.claim_discipline, CLAIM_DISCIPLINE, "fact_first"),
        arousal_ceiling: clampToCatalog(posture.arousal_ceiling, AROUSAL_CEILING, "conservative"),
      },
      source_ladder: cleanStringList(raw.source_ladder, 8),
      packaging: {
        title_style: cleanText(packaging.title_style),
        thumbnail_style: cleanText(packaging.thumbnail_style),
      },
      length_target: { short_s: Math.round(clampNumber(lengthTarget.short_s, 15, 180, 60)) },
      platforms: cleanStringList(raw.platforms, 8),
    };
    const castBriefRaw = raw.cast_brief && typeof raw.cast_brief === "object" ? raw.cast_brief : {};
    const cast_brief = {
      voice_description: cleanText(castBriefRaw.voice_description).slice(0, 800),
      preview_line: cleanText(castBriefRaw.preview_line).slice(0, 200),
    };
    const assumptions = cleanStringList(raw.assumptions, 6);
    return json({ brief, suggestions, assumptions, cast_brief }, 200, origin);
  } catch (_e) {
    return json({ error: "Channel guideline request failed upstream." }, 502, origin);
  }
});

// Map an Anthropic non-2xx response to a clean JSON error (never leak the key
// or raw upstream internals).
async function anthropicError(res: Response, origin: string | null): Promise<Response> {
  let detail = "";
  try {
    const body = await res.json();
    detail = (body?.error?.message as string) ?? "";
  } catch {
    detail = "";
  }
  const status = res.status >= 500 ? 502 : res.status;
  return json(
    { error: `Generation failed (${res.status})${detail ? `: ${detail}` : ""}.` },
    status,
    origin,
  );
}
