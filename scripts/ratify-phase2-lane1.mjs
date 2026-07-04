#!/usr/bin/env node
// Phase-2 Lane 1 ratify: channel_profiles.character_id FK is the read authority; Guidelines
// picker writes character_id + mirrors the codename. Live DB: default cast to Fine Print
// (character_id=ead6f8d2-…, character='Fine Print'). FK-preference is proven NON-DISRUPTIVELY
// by rewriting the channel_profiles GET IN THE BROWSER SESSION ONLY (blank the free-text mirror,
// keep character_id) — the live row is never touched. Picker save is intercepted-and-aborted.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4316", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const FINE_PRINT_ID = "ead6f8d2-225c-4d6f-b56d-b0a702a78d0f";

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

// When armed, the channel_profiles GET response is rewritten so the default row has a BLANK
// free-text mirror but keeps character_id — proving FK-preferred resolution (no name to match).
const state = { blankMirror: false };
const captured = { upserts: [] };

async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    // Intercept-and-abort the channel_profiles upsert (POST/PATCH) — capture, fake 201, zero writes.
    if ((method === "POST" || method === "PATCH") && /\/rest\/v1\/channel_profiles/.test(url)) {
      let body = null;
      try { body = JSON.parse(request.postData() || "null"); } catch {}
      captured.upserts.push(Array.isArray(body) ? body[0] : body);
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
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
      // FK-preference: blank the default row's free-text mirror in-session (keep character_id).
      if (state.blankMirror && method === "GET" && /\/rest\/v1\/channel_profiles/.test(url)) {
        try {
          const rows = JSON.parse(buf.toString("utf8"));
          if (Array.isArray(rows)) {
            for (const r of rows) if (r.channel === "default") r.character = "";
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

    // ── P2-1: hub card shows the default channel as CAST ────────────────────
    await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const castBadge = await page.locator(".channel-card", { hasText: /default|Fine Print|Animal/ })
      .locator("text=/CAST/i").count().catch(() => 0);
    const anyCast = castBadge > 0 || (await page.locator("text=/CAST:/i").count()) > 0;
    check("P2-1 hub card renders the default channel as CAST", anyCast, `castMarkers=${castBadge}`);

    // ── P2-2 (FK-preference): with the free-text mirror BLANKED in-session, the Character
    //    tab still resolves Fine Print → it read character_id, not the name. ────────────
    state.blankMirror = true;
    await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const panel = page.locator("#workspace-panel-character.tab-panel.active");
    const showsFinePrint = (await panel.locator("text=/Fine Print/i").count()) > 0;
    const showsUncast = (await panel.locator("text=/No Character Assigned/i").count()) > 0;
    check("P2-2 FK-preference — Character tab resolves Fine Print via character_id (mirror blank)",
      showsFinePrint && !showsUncast, `finePrint=${showsFinePrint} uncast=${showsUncast}`);
    state.blankMirror = false;

    // ── P2-3: Guidelines picker is a <select> bound to character_id, Fine Print selected ─
    await page.goto(`${BASE}/?channel=default&tab=guidelines`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const picker = page.locator("#channel-profile-character");
    const isSelect = (await picker.evaluate((el) => el.tagName).catch(() => "")) === "SELECT";
    const pickerVal = await picker.inputValue().catch(() => "");
    const optCount = await picker.locator("option").count().catch(() => 0);
    check("P2-3 Guidelines Character control is a picker bound to character_id (Fine Print selected)",
      isSelect && pickerVal === FINE_PRINT_ID && optCount >= 2,
      `isSelect=${isSelect} value=${pickerVal} options=${optCount}`);

    // ── P2-4: picker save mirrors — select a character → payload writes character_id + codename;
    //    Unassigned → both null (intercept-and-abort; zero live writes). ─────────────────
    // (a) keep Fine Print selected, trigger a save → assert payload.
    captured.upserts = [];
    const saveBtn = page.getByRole("button", { name: /^Save/i }).first();
    if (await saveBtn.count()) {
      await saveBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    const savedPayload = captured.upserts[0];
    check("P2-4a save payload writes character_id + mirrored codename",
      !!savedPayload && savedPayload.character_id === FINE_PRINT_ID && savedPayload.character === "Fine Print",
      `character_id=${savedPayload?.character_id} character=${savedPayload?.character}`);

    // (b) pick Unassigned → save → payload has character_id null + character null.
    captured.upserts = [];
    await picker.selectOption("").catch(() => {});
    await page.waitForTimeout(400);
    const saveBtn2 = page.getByRole("button", { name: /^Save/i }).first();
    if (await saveBtn2.count()) {
      await saveBtn2.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    const unassignPayload = captured.upserts[0];
    check("P2-4b Unassigned save → character_id null + character null (explicit clear)",
      !!unassignPayload && unassignPayload.character_id == null && unassignPayload.character == null,
      `character_id=${unassignPayload?.character_id} character=${unassignPayload?.character}`);

    check("P2-5 no app-level console errors (env fonts CDN excluded)", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
