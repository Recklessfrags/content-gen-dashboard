#!/usr/bin/env node
// Channel auto-gen ratify — intercept-and-abort, ZERO live writes.
// Proves the money/persist path shape without spending or mutating live data:
//   • Generate stages a review proposal but does NOT fill the form (accept-gated).
//   • Apply fills the form; only the operator's Save attempts the upsert.
//   • A 429 from the proxy surfaces a cap message and no review panel.
//   • On Save: telemetry rows (proposed vs saved) are POSTed and the cast brief
//     is stashed in localStorage keyed by the assigned character_id.
//   • The proxy call itself is intercepted (canned / 429) so NO Anthropic spend
//     and the upsert + telemetry are intercepted-and-aborted so the live
//     default row is never touched.
// The server-side enum clamp (aggressive impossible) + two-stage shape are proven
// by code inspection + the separate cap-RPC and (optional) live-gen checks.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4322", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const FINE_PRINT_ID = "ead6f8d2-225c-4d6f-b56d-b0a702a78d0f";

const CANNED = {
  brief: "RATIFY editorial brief: a fact-first short-form channel with measured, non-sensational framing.",
  suggestions: {
    display_name: "RATIFY_NAME",
    voice_archetype: "npr_explainer",
    fact_anchor: "declassified_primary_doc",
    treatment: "motion_graphic",
    engagement_posture: { claim_discipline: "fact_first", arousal_ceiling: "standard" },
    source_ladder: ["archival", "generated"],
    packaging: { title_style: "RATIFY_TITLE", thumbnail_style: "RATIFY_THUMB" },
    length_target: { short_s: 45 },
    platforms: ["tiktok", "youtube_shorts"],
  },
  assumptions: ["ratify assumption one", "ratify assumption two"],
  cast_brief: {
    voice_description:
      "A RATIFY narrator voice — warm, precise, and measured, suited to short-form documentary narration with clear diction and calm authority from open to close.",
    preview_line: "Here is what the record actually shows.",
  },
};

function loadDotEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  const loaded = {};
  if (!existsSync(envPath)) return loaded;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    loaded[m[1]] = v;
  }
  return loaded;
}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// edgeMode: "canned" | "cap429" | "forward"
const state = { edgeMode: "canned" };
const captured = { proxyCalls: 0, upserts: [], telemetry: [] };

async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    // The proxy edge call — never let it hit Anthropic in canned/cap modes.
    if (/\/functions\/v1\/channel-guideline-proxy/.test(url)) {
      if (method === "OPTIONS") {
        await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" }, body: "" });
        return;
      }
      captured.proxyCalls += 1;
      if (state.edgeMode === "cap429") {
        await route.fulfill({
          status: 429,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
          body: JSON.stringify({ error: "Daily generation cap reached (10/10). Try again tomorrow.", cap_reached: true, used: 10, limit: 10 }),
        });
        return;
      }
      if (state.edgeMode === "canned") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
          body: JSON.stringify(CANNED),
        });
        return;
      }
      // "forward" → fall through to the real function (live-gen; real spend).
    }

    // Intercept-and-abort the channel_profiles upsert — capture, fake 201, zero writes.
    if ((method === "POST" || method === "PATCH") && /\/rest\/v1\/channel_profiles/.test(url)) {
      let body = null;
      try { body = JSON.parse(request.postData() || "null"); } catch {}
      captured.upserts.push(Array.isArray(body) ? body[0] : body);
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }

    // Intercept-and-abort telemetry inserts — capture, fake 201, zero writes.
    if (method === "POST" && /\/rest\/v1\/channel_guideline_telemetry/.test(url)) {
      let body = null;
      try { body = JSON.parse(request.postData() || "null"); } catch {}
      captured.telemetry.push(body);
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }

    // Everything else → forward to live Supabase (auth, GETs).
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers["content-length"];
    const reqBody = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(url, { method, headers, body: reqBody, redirect: "manual" });
      const rh = {};
      response.headers.forEach((value, k) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(k)) rh[k] = value;
      });
      const buf = Buffer.from(await response.arrayBuffer());
      await route.fulfill({ status: response.status, headers: rh, body: buf });
    } catch (error) {
      console.error(`bridge failed ${url}: ${error.message}`);
      await route.abort();
    }
  });
}

let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], {
    cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {}
    await sleep(1000);
  }
  throw new Error("server did not start");
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  if (new URL(page.url()).pathname.endsWith("/login")) throw new Error("login-failed");
}

async function gotoGuidelines(page) {
  await page.goto(`${BASE}/?channel=default&tab=guidelines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
}

async function fieldVal(page, id) {
  return page.locator(id).inputValue().catch(() => "<none>");
}

async function main() {
  const dot = loadDotEnvLocal();
  if (!EMAIL || !PASSWORD) throw new Error("RATIFY_EMAIL / RATIFY_PASSWORD not set (.env.local)");
  await startServer({
    NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installBridge(context);
  const page = await context.newPage();
  const appErrors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/fonts\.googleapis|ERR_CONNECTION_RESET/.test(t)) return;
    appErrors.push(t);
  });

  try {
    await login(page);
    await gotoGuidelines(page);

    // Type a >=30 char description to enable Generate.
    const desc = "A fact-first channel about the true history of everyday food and how labels really work.";
    await page.fill("#channel-profile-description", desc);
    await page.waitForTimeout(300);

    // Snapshot form fields BEFORE generation (to prove no auto-fill).
    const before = {
      name: await fieldVal(page, "#channel-profile-display-name"),
      fact: await fieldVal(page, "#channel-profile-fact-anchor"),
      arousal: await fieldVal(page, "#channel-profile-arousal-ceiling"),
    };

    // ── G1: Generate stages a review panel but does NOT fill the form ────────
    state.edgeMode = "canned";
    captured.proxyCalls = 0; captured.upserts = []; captured.telemetry = [];
    await page.getByRole("button", { name: /Generate from concept/i }).click().catch(() => {});
    await page.waitForTimeout(1500);
    const reviewVisible = (await page.locator(".autogen-review").count()) > 0;
    const after = {
      name: await fieldVal(page, "#channel-profile-display-name"),
      fact: await fieldVal(page, "#channel-profile-fact-anchor"),
      arousal: await fieldVal(page, "#channel-profile-arousal-ceiling"),
    };
    const formUnchanged = after.name === before.name && after.fact === before.fact && after.arousal === before.arousal;
    check("G1 Generate stages a review panel and does NOT auto-fill the form",
      reviewVisible && formUnchanged && after.name !== "RATIFY_NAME",
      `review=${reviewVisible} unchanged=${formUnchanged} name="${after.name}"`);
    check("G1b exactly one proxy call per click, zero upserts during Generate",
      captured.proxyCalls === 1 && captured.upserts.length === 0,
      `proxyCalls=${captured.proxyCalls} upserts=${captured.upserts.length}`);

    // ── G2: Apply fills the form; still no upsert ────────────────────────────
    await page.getByRole("button", { name: /Apply accepted/i }).click().catch(() => {});
    await page.waitForTimeout(800);
    const applied = {
      name: await fieldVal(page, "#channel-profile-display-name"),
      fact: await fieldVal(page, "#channel-profile-fact-anchor"),
      arousal: await fieldVal(page, "#channel-profile-arousal-ceiling"),
    };
    check("G2 Apply fills the form from the proposal (arousal=standard, NOT aggressive)",
      applied.name === "RATIFY_NAME" && applied.fact === "declassified_primary_doc" && applied.arousal === "standard",
      `name="${applied.name}" fact="${applied.fact}" arousal="${applied.arousal}"`);
    check("G2b no upsert attempted through Generate+Apply (accept-gated, not auto-persist)",
      captured.upserts.length === 0, `upserts=${captured.upserts.length}`);

    // ── G3: Save attempts the upsert (intercepted) + telemetry + cast-brief stash ─
    captured.upserts = []; captured.telemetry = [];
    await page.getByRole("button", { name: /^Save/i }).first().click().catch(() => {});
    await page.waitForTimeout(1800);
    const up = captured.upserts[0];
    const postureOk = up && up.engagement_posture && up.engagement_posture.arousal_ceiling === "standard";
    check("G3 Save upsert carries the accepted values and NO aggressive",
      !!up && up.display_name === "RATIFY_NAME" && up.fact_anchor === "declassified_primary_doc" && postureOk,
      `name=${up?.display_name} fact=${up?.fact_anchor} arousal=${up?.engagement_posture?.arousal_ceiling}`);

    const telRows = (captured.telemetry[0] || []);
    const findRow = (f) => telRows.find((r) => r.field === f);
    const nameRow = findRow("displayName");
    const arousalRow = findRow("arousalCeiling");
    check("G3b telemetry POSTed on Save with proposed-vs-saved rows",
      Array.isArray(telRows) && telRows.length > 0 &&
      !!nameRow && nameRow.proposed === "RATIFY_NAME" && nameRow.saved === "RATIFY_NAME" &&
      !!arousalRow && arousalRow.proposed === "standard",
      `rows=${telRows.length} name=${JSON.stringify(nameRow)} arousal=${JSON.stringify(arousalRow)}`);

    const stash = await page.evaluate((id) => window.localStorage.getItem(`cast_brief_${id}`), FINE_PRINT_ID);
    let stashOk = false;
    try { stashOk = !!stash && typeof JSON.parse(stash).voice_description === "string" && JSON.parse(stash).voice_description.includes("RATIFY"); } catch {}
    check("G3c cast brief stashed in localStorage keyed by assigned character_id",
      stashOk, `key=cast_brief_${FINE_PRINT_ID} present=${!!stash}`);

    // ── G4: a 429 from the proxy surfaces a cap message, no review panel, no fill ─
    await gotoGuidelines(page);
    await page.fill("#channel-profile-description", desc);
    await page.waitForTimeout(300);
    state.edgeMode = "cap429";
    captured.proxyCalls = 0;
    await page.getByRole("button", { name: /Generate from concept/i }).click().catch(() => {});
    await page.waitForTimeout(1200);
    const reviewAfterCap = (await page.locator(".autogen-review").count()) > 0;
    const capNotice = (await page.locator("text=/cap reached|locked until tomorrow/i").count()) > 0;
    check("G4 cap 429 → cap notice, no review panel, one proxy call",
      !reviewAfterCap && capNotice && captured.proxyCalls === 1,
      `review=${reviewAfterCap} notice=${capNotice} proxyCalls=${captured.proxyCalls}`);

    check("G5 no app-level console errors (env fonts CDN excluded)", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (error) {
    check("harness completed", false, error.message);
  } finally {
    const passed = results.filter((r) => r.pass).length;
    console.log(`\n${passed}/${results.length} gates PASS`);
    await browser?.close?.().catch(() => {});
    server?.kill?.("SIGKILL");
  }
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main();
