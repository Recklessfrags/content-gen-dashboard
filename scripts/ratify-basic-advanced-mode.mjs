#!/usr/bin/env node
// Bespoke ratify — Basic/Advanced detail-level toggle. Verify: default is Basic; Basic hides the
// auto-drafted/detail fields on the dossier editor + channel form and shows a reveal; Advanced (and
// the reveal button) shows everything; the choice persists; ZERO live writes (read/toggle only).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4357", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;

function loadDotEnvLocal() {
  const envPath = join(ROOT, ".env.local"); const loaded = {};
  if (!existsSync(envPath)) return loaded;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (!m) continue;
    let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    loaded[m[1]] = v;
  }
  return loaded;
}
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); }

const writes = [];
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(); const method = request.method(); const url = request.url();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(url)) { writes.push({ method, url }); await route.abort(); return; }
    const headers = { ...request.headers() }; delete headers.host; delete headers["content-length"];
    const body = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(url, { method, headers, body, redirect: "manual" });
      const rh = {}; response.headers.forEach((value, key) => { if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) rh[key] = value; });
      await route.fulfill({ status: response.status, headers: rh, body: Buffer.from(await response.arrayBuffer()) });
    } catch (error) { console.error(`bridge failed ${url}: ${error.message}`); await route.abort(); }
  });
}
async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", EMAIL); await page.fill("input[type=password]", PASSWORD); await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 45_000 }).catch(() => {});
  if (new URL(page.url()).pathname.endsWith("/login")) throw new Error("login-failed");
  await page.waitForSelector(".aurora-app", { timeout: 30_000 });
}
async function gotoHydrated(page, url, sel) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(sel, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(700);
}
let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {} await sleep(1000); }
  throw new Error("server did not start");
}
const txt = async (loc) => (await loc.first().textContent().catch(() => "")) || "";
async function openCharacter(page) {
  await gotoHydrated(page, `${BASE}/?hub=characters`, ".channel-card");
  await page.locator(".channel-card").first().click(); await page.waitForTimeout(1200);
}

async function main() {
  const dot = loadDotEnvLocal();
  await startServer({ NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installBridge(context);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  try {
    await login(page);

    // ---- H: header toggle defaults to Basic ----
    const modeToggle = page.locator(".mode-toggle");
    check("H1 header has Basic·Advanced toggle", (await modeToggle.count()) > 0, "");
    const basicBtn = page.locator(".mode-toggle-option", { hasText: "Basic" }).first();
    check("H2 Basic is the default (active)", (await basicBtn.getAttribute("aria-pressed")) === "true", "");

    // ---- D: dossier editor — Basic hides auto-drafted fields ----
    await openCharacter(page);
    let sheet = await txt(page.locator(".characters-bench.scoped .sheet"));
    const basicKeep = ["Name", "One-line concept", "Voice & identity", "Gold-standard lines"].every((s) => sheet.includes(s));
    const basicHide = ["Cadence & delivery", "Vocabulary & catchphrases", "Off-limits", "Beat template", "Runtime target"].every((s) => !sheet.includes(s));
    check("D1 Basic dossier: keeps seeds, hides auto-drafted detail", basicKeep && basicHide, `keep=${basicKeep} hide=${basicHide}`);
    check("D2 Basic dossier: 'Show advanced settings' present", (await page.locator(".characters-bench.scoped .show-advanced-btn").count()) > 0, "");

    // reveal via the in-form button
    await page.locator(".characters-bench.scoped .show-advanced-btn").first().click(); await page.waitForTimeout(600);
    sheet = await txt(page.locator(".characters-bench.scoped .sheet"));
    check("D3 reveal button shows all bible fields", ["Cadence & delivery", "Off-limits", "Beat template", "Runtime target"].every((s) => sheet.includes(s)), "");
    check("D4 header now reflects Advanced", (await page.locator(".mode-toggle-option", { hasText: "Advanced" }).first().getAttribute("aria-pressed")) === "true", "");

    // ---- P: persistence — Advanced survives reload ----
    await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector(".aurora-app", { timeout: 30_000 }); await page.waitForTimeout(800);
    check("P1 Advanced persists across reload (localStorage)", (await page.locator(".mode-toggle-option", { hasText: "Advanced" }).first().getAttribute("aria-pressed")) === "true", "");

    // ---- back to Basic for the channel-form check ----
    await page.locator(".mode-toggle-option", { hasText: "Basic" }).first().click(); await page.waitForTimeout(400);

    // ---- C: channel form — Basic hides detail sections ----
    await gotoHydrated(page, `${BASE}/?channel=default&tab=guidelines`, ".aurora-app");
    let form = await txt(page.locator(".aurora-app"));
    const chKeep = ["Channel concept", "Character"].every((s) => form.includes(s));
    const chHide = ["Content settings", "Footage & presentation", "Voice archetype", "Intensity limit"].every((s) => !form.includes(s));
    check("C1 Basic channel form: keeps seeds, hides detail sections", chKeep && chHide, `keep=${chKeep} hide=${chHide}`);
    check("C2 Basic channel form: 'Show advanced settings' present", (await page.locator(".show-advanced-btn").count()) > 0, "");
    // reveal
    await page.locator(".show-advanced-btn").first().click(); await page.waitForTimeout(600);
    form = await txt(page.locator(".aurora-app"));
    check("C3 reveal shows detail sections", ["Content settings", "Footage & presentation", "Intensity limit"].every((s) => form.includes(s)), "");

    // ---- 0: zero live writes + no console errors ----
    check("Z1 ZERO live writes (toggle/read only)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("Z2 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}
main();
