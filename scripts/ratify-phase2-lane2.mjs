#!/usr/bin/env node
// Phase-2 Lane 2 ratify: Casting Studio + Visual Identity are DE-MODALED into the workspace
// Character tab as an inline split-screen (variant="inline"). Money path proven with
// intercept-and-abort: the casting-proxy edge function + any characters write are captured and
// faked so ZERO live spend / ZERO live writes occur. Live DB: default → Fine Print (voice-cast,
// NOT visually-cast) so the cast branch renders; Casting Studio = cast state, Visual = empty state.
// E1.b positive pre-select is proven NON-DISRUPTIVELY by blanking Fine Print's voice_recipe IN THE
// BROWSER SESSION ONLY (the live row is never touched) so the channel's suggested persona applies.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4317", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
// A 1x1 silent-ish base64 payload; the <audio> never plays, it just has to render a candidate.
const FAKE_AUDIO = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSuKxLILhSCbCe";

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

const state = { blankRecipe: false };
const captured = { proxy: [], charWrites: [] };

async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    // Intercept-and-abort the casting-proxy edge function — ZERO live spend. Capture the action;
    // synthesize a candidate for action:"design" and a voice_id for action:"create".
    if (/\/functions\/v1\/casting-proxy/.test(url)) {
      let body = null;
      try { body = JSON.parse(request.postData() || "null"); } catch {}
      captured.proxy.push(body);
      const action = body?.action;
      let payload = { error: "intercepted" };
      if (action === "design") {
        payload = { previews: [{ generated_voice_id: "ratify_gen_voice_1", audio_base_64: FAKE_AUDIO, media_type: "audio/mpeg" }], seed: 12345 };
      } else if (action === "create") {
        payload = { voice_id: "ratify_created_voice_1" };
      } else if (action === "tts") {
        payload = { audio_base_64: FAKE_AUDIO, media_type: "audio/mpeg" };
      }
      await route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      return;
    }

    // Intercept-and-abort any write to characters (voice_recipe birth-certificate / voice_settings) — ZERO live writes.
    if ((method === "POST" || method === "PATCH") && /\/rest\/v1\/characters/.test(url)) {
      let body = null;
      try { body = JSON.parse(request.postData() || "null"); } catch {}
      captured.charWrites.push({ method, body });
      await route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }

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
      let buf = Buffer.from(await response.arrayBuffer());
      // E1.b positive proof: blank Fine Print's voice_recipe in-session so the panel has no saved
      // design → the channel's suggested persona applies. Live row untouched.
      if (state.blankRecipe && method === "GET" && /\/rest\/v1\/characters/.test(url)) {
        try {
          const rows = JSON.parse(buf.toString("utf8"));
          if (Array.isArray(rows)) {
            for (const r of rows) if (r && typeof r === "object" && "voice_recipe" in r) r.voice_recipe = null;
            buf = Buffer.from(JSON.stringify(rows));
          }
        } catch {}
      }
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

const panelSel = "#workspace-panel-character.tab-panel.active";

async function gotoCharacterTab(page) {
  await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
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
    if (/fonts\.googleapis|ERR_CONNECTION_RESET|Failed to load resource/.test(t)) return;
    appErrors.push(t);
  });
  page.on("pageerror", (e) => appErrors.push("pageerror: " + e.message));

  try {
    await login(page);

    // ── L2-1: inline render, NO modal overlay ────────────────────────────────
    await gotoCharacterTab(page);
    const panel = page.locator(panelSel);
    const hasCastingInline = (await panel.locator(".casting-inline").count()) > 0;
    const hasVisualInline = (await panel.locator(".visual-inline").count()) > 0;
    const modalOverlays = await page.locator(".history-layer").count();
    check("L2-1 Casting + Visual render INLINE in the Character tab, no modal overlay",
      hasCastingInline && hasVisualInline && modalOverlays === 0,
      `casting=${hasCastingInline} visual=${hasVisualInline} overlays=${modalOverlays}`);

    // ── L2-2: legacy redirect chrome removed ─────────────────────────────────
    const redirectGone = (await panel.locator("text=/Inline casting arrives in Phase 2/i").count()) === 0
      && (await panel.getByRole("button", { name: /^Configure Voice$/ }).count()) === 0;
    check("L2-2 old 'Configure Voice/Visuals → legacy' redirect removed", redirectGone);

    // ── L2-3: Casting Studio inline shows CAST state (Fine Print voice-cast) ──
    const castingTitle = (await panel.locator("#casting-panel-title").count()) > 0;
    const tuning = (await panel.locator("text=/Live Synthesis Tuning/i").count()) > 0;
    const lockHint = (await panel.locator("text=/Lock a voice above before tuning/i").count()) > 0;
    check("L2-3 Casting Studio inline = cast state (tuning live, no 'lock first' hint)",
      castingTitle && tuning && !lockHint, `title=${castingTitle} tuning=${tuning} lockHint=${lockHint}`);

    // ── L2-4: Visual Identity inline shows empty/upload state (not visually cast) ─
    const visualTitle = (await panel.locator("#visual-panel-title").count()) > 0;
    const dropzone = (await panel.locator("text=/Drag & Drop reference image/i").count()) > 0;
    check("L2-4 Visual Identity inline = empty/upload state", visualTitle && dropzone,
      `title=${visualTitle} dropzone=${dropzone}`);

    // ── L2-5: ZERO spend / ZERO write on mount (just viewing the tab) ─────────
    check("L2-5 mounting the inline panels spends nothing & writes nothing",
      captured.proxy.length === 0 && captured.charWrites.length === 0,
      `proxyCalls=${captured.proxy.length} charWrites=${captured.charWrites.length}`);

    // ── L2-7 (money gate): generate → candidate → audition lock-confirm gate →
    //    CONFIRM LOCK writes the voice_recipe birth-certificate; all intercepted-and-aborted. ─
    captured.proxy = [];
    captured.charWrites = [];
    const genBtn = panel.getByRole("button", { name: /Generate previews/i });
    await genBtn.scrollIntoViewIfNeeded().catch(() => {});
    await genBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    const designCalls = captured.proxy.filter((b) => b?.action === "design").length;
    const candidateAppeared = (await panel.locator(".casting-candidate").count()) > 0;
    check("L2-7a Generate is wired inline (design call attempted, aborted → zero live spend) and a candidate renders",
      designCalls === 1 && candidateAppeared, `designCalls=${designCalls} candidate=${candidateAppeared}`);

    // No characters write from generating (generate must not persist).
    check("L2-7b Generate performs no characters write", captured.charWrites.length === 0,
      `charWrites=${captured.charWrites.length}`);

    // Drive Lock as winner → the audition lock-confirm gate.
    const lockBtn = panel.getByRole("button", { name: /^Lock as winner$/ }).first();
    await lockBtn.scrollIntoViewIfNeeded().catch(() => {});
    await lockBtn.click().catch(() => {});
    await page.waitForTimeout(800);
    const lockDialog = page.locator(".casting-lock-dialog");
    const gateShown = (await lockDialog.count()) > 0;
    const confirm = lockDialog.getByRole("button", { name: /CONFIRM LOCK/i });
    const disabledBeforeAck = await confirm.isDisabled().catch(() => false);
    check("L2-7c audition lock-confirm gate appears and CONFIRM is disabled until acknowledged",
      gateShown && disabledBeforeAck, `gate=${gateShown} disabledBeforeAck=${disabledBeforeAck}`);

    // Acknowledge → CONFIRM LOCK → the voice_recipe birth-certificate write fires (intercepted).
    captured.proxy = [];
    captured.charWrites = [];
    await lockDialog.locator('input[type="checkbox"]').check().catch(() => {});
    await confirm.click().catch(() => {});
    await page.waitForTimeout(2500);
    const createCall = captured.proxy.some((b) => b?.action === "create");
    const recipeWrite = captured.charWrites.find((w) => w.method === "PATCH" && w.body && "voice_recipe" in w.body);
    check("L2-7d CONFIRM LOCK writes voice_recipe birth-certificate (create voice + characters PATCH; intercepted, zero live writes)",
      createCall && !!recipeWrite, `create=${createCall} recipeWrite=${!!recipeWrite}`);

    // ── L2-8: responsive — split stacks to one column at 412px (Q2) ──────────
    await page.setViewportSize({ width: 412, height: 900 });
    await gotoCharacterTab(page);
    const cols = await page.locator(".workspace-character-split").evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns).catch(() => "");
    const stacked = cols.split(" ").filter(Boolean).length === 1;
    check("L2-8 split-screen stacks to a single column at 412px", stacked, `gridCols="${cols}"`);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── L2-6 / E1.b: with the recipe present the suggestion does NOT override (safety),
    //    and with the recipe blanked in-session the channel's suggested persona pre-selects. ─
    // (a) recipe present → persona chip reflects the SAVED recipe, not the channel suggestion.
    await gotoCharacterTab(page);
    const naturalistSelectedWithRecipe = await page.locator(
      ".casting-inline .casting-choice-chip.is-selected", { hasText: /Naturalist/i }).count();
    check("L2-6a E1.b safety — a character WITH a saved voice_recipe is not overridden by the channel suggestion",
      naturalistSelectedWithRecipe === 0, `naturalistSelected=${naturalistSelectedWithRecipe}`);

    // (b) blank the recipe in-session → the suggested persona (Animal channel → hushed-naturalist) pre-selects.
    state.blankRecipe = true;
    await gotoCharacterTab(page);
    const personaGroup = page.locator('.casting-inline [aria-label="Persona"]');
    const selectedPersona = await personaGroup.locator(".casting-choice-chip.is-selected").first()
      .innerText().catch(() => "");
    check("L2-6b E1.b pre-select — no-recipe character gets the channel's suggested persona chip pre-selected",
      /Naturalist/i.test(selectedPersona), `selectedPersona="${selectedPersona}"`);

    // overridable: click a different persona chip → selection moves.
    const otherChip = personaGroup.locator(".casting-choice-chip", { hasText: /Confessor|Mentor|Storyteller|Anchor|Skeptic/i }).first();
    let overridden = false;
    if (await otherChip.count()) {
      const label = await otherChip.innerText();
      await otherChip.click().catch(() => {});
      await page.waitForTimeout(300);
      const nowSelected = await personaGroup.locator(".casting-choice-chip.is-selected").first().innerText().catch(() => "");
      overridden = nowSelected.trim() === label.trim();
    }
    check("L2-6c E1.b is overridable — selecting another persona chip moves the selection", overridden);
    state.blankRecipe = false;

    // ── L2-9: no app-level console errors (env fonts CDN excluded) ───────────
    check("L2-9 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
