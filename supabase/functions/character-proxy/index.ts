// Character generator proxy — dashboard-owned Supabase Edge Function.
//
// The browser never receives the Anthropic secret. This function validates the
// caller's Supabase session, enforces a separate per-user daily character budget,
// and returns an editable draft; it never writes a character.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CHARACTER_PROXY_ALLOWED_ORIGINS = Deno.env.get("CHARACTER_PROXY_ALLOWED_ORIGINS");
const ANTHROPIC_MODEL = "claude-opus-4-8";
const DAILY_CAP = 25;
const CONCEPT_MIN = 30;
const CONCEPT_MAX = 2000;
const allowedOrigins = CHARACTER_PROXY_ALLOWED_ORIGINS
  ? new Set(
      CHARACTER_PROXY_ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
  : null;

const CHARACTER_TOOL = {
  name: "draft_character",
  description: "Draft an original, advertiser-safe recurring short-form video character and complete character bible.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      codename: { type: "string", description: "Short, memorable original character name." },
      bible: {
        type: "object",
        additionalProperties: false,
        properties: {
          voice: { type: "string" },
          cadence: { type: "string" },
          vocab: { type: "string" },
          offlimits: { type: "string" },
          lines: { type: "string", description: "Two to four newline-separated gold-standard lines." },
          beats: { type: "string", description: "A concise repeatable episode beat template." },
          runtime: { type: "string", description: "Runtime and spoken-word window, e.g. 60–80s vertical, 135–165 spoken words." },
        },
        required: ["voice", "cadence", "vocab", "offlimits", "lines", "beats", "runtime"],
      },
    },
    required: ["codename", "bible"],
  },
};

const SYSTEM_PROMPT = `You are a senior character designer for factual short-form video. Turn the operator's concept into one distinctive, repeatable, ORIGINAL character and a complete production-ready character bible.

The draft is advisory and will be reviewed and edited by a human before saving. Follow these rules:
- Never imitate, name, or closely evoke a real person, performer, copyrighted character, or identifiable performance.
- Keep the character advertiser-safe and fact-first. Never add hateful, sexual, dangerous, defamatory, or deceptive traits.
- Make every field specific enough for a writer to use, without inventing factual claims about the subject matter.
- voice covers identity, perspective, tone, and apparent age without naming a real person.
- cadence covers pacing, emphasis, pauses, energy shifts, and delivery.
- vocab names signature language patterns and optional original catchphrases without forced repetition.
- offlimits states behavioral, legal, and editorial boundaries, including no fabricated certainty.
- lines contains 2–4 original newline-separated examples that demonstrate the voice.
- beats gives a reusable episode progression, not a topic-specific script.
- runtime must include both a seconds range and a plausible spoken-word range.
Return exactly one tool call.`;

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (allowedOrigins) {
    if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  } else {
    headers["Access-Control-Allow-Origin"] = origin ?? "*";
  }
  return headers;
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Character generator is not configured." }, 500, origin);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json({ error: "Missing bearer token." }, 401, origin);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "Invalid or expired session." }, 401, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, origin);
  }
  if (typeof body !== "object" || body === null) {
    return json({ error: "Invalid JSON body." }, 400, origin);
  }
  const concept = cleanText(body.concept, CONCEPT_MAX + 1);
  if (concept.length < CONCEPT_MIN || concept.length > CONCEPT_MAX) {
    return json({ error: `Concept must be ${CONCEPT_MIN}–${CONCEPT_MAX} characters.` }, 400, origin);
  }

  // Keep this immediately before the paid call: valid requests consume one cap unit.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: cap, error: capError } = await admin.rpc("character_bump_usage", {
    p_user: userData.user.id,
    p_limit: DAILY_CAP,
  });
  if (capError) return json({ error: "Could not check the character-generation cap." }, 500, origin);
  const capRow = Array.isArray(cap) ? cap[0] : cap;
  if (!capRow?.allowed) {
    return json(
      {
        error: "You’ve reached today’s character-generation limit. Try again tomorrow.",
        cap_reached: true,
        used: capRow?.used ?? DAILY_CAP,
        limit: DAILY_CAP,
      },
      429,
      origin,
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1800,
        system: SYSTEM_PROMPT,
        tools: [CHARACTER_TOOL],
        tool_choice: { type: "tool", name: "draft_character" },
        messages: [{ role: "user", content: `Character concept:\n\n${concept}` }],
      }),
    });
    if (!response.ok) {
      console.error("Anthropic character generation failed", response.status);
      return json({ error: "Character generation failed. Please try again." }, 502, origin);
    }
    const data = await response.json();
    if (data?.stop_reason === "refusal") {
      return json({ error: "The model couldn’t draft that concept. Edit it and try again." }, 200, origin);
    }
    const block = Array.isArray(data?.content)
      ? data.content.find((item: any) => item?.type === "tool_use" && item?.name === "draft_character")
      : null;
    const rawBible = block?.input?.bible ?? {};
    const draft = {
      codename: cleanText(block?.input?.codename, 120),
      bible: {
        voice: cleanText(rawBible.voice),
        cadence: cleanText(rawBible.cadence),
        vocab: cleanText(rawBible.vocab),
        offlimits: cleanText(rawBible.offlimits),
        lines: cleanText(rawBible.lines),
        beats: cleanText(rawBible.beats),
        runtime: cleanText(rawBible.runtime, 300),
      },
    };
    if (!draft.codename || Object.values(draft.bible).some((value) => !value)) {
      return json({ error: "The model did not return a complete character draft. Try again." }, 200, origin);
    }
    return json(draft, 200, origin);
  } catch (error) {
    console.error("Character proxy request failed", error);
    return json({ error: "Character generation is temporarily unavailable." }, 502, origin);
  }
});
