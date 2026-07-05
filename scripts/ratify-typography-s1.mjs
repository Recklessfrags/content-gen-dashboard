#!/usr/bin/env node
// Bespoke ratify — S1 typography uniformity: the re-homed Aurora surfaces reuse legacy label classes
// (.eyebrow / .filecode / .metric-eyebrow / field label / *-label) that globals.css forced to
// monospace + UPPERCASE. Verify the scoped .aurora-app reset makes them render sentence-case sans,
// that native Aurora surfaces are unaffected, no @412 overflow, ZERO live writes. Read-only.
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

function loadDotEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  const loaded = {};
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
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(url)) writes.push({ method, url });
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
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL); await page.fill("input[type=password]", PASSWORD); await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2500);
  if (new URL(page.url()).pathname.endsWith("/login")) throw new Error("login-failed");
}
let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {} await sleep(1000); }
  throw new Error("server did not start");
}
// returns {transform, mono} for the first matching selector, or null
async function labelStyle(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const ff = cs.fontFamily || "";
    return { transform: cs.textTransform, mono: /mono|JetBrains|Courier|Consolas|Menlo/i.test(ff), ff };
  }, sel);
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

    // ---- T1: New-channel form (Gemini's surface) — labels now sentence-case sans ----
    await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" }); await page.waitForTimeout(1400);
    await page.locator(".btn-new-channel").first().click(); await page.waitForTimeout(1200);
    const eb = await labelStyle(page, ".channel-create-surface .eyebrow");
    check("T1a new-channel .eyebrow not UPPERCASED by CSS", !!eb && eb.transform === "none", JSON.stringify(eb));
    check("T1b new-channel .eyebrow not monospace", !!eb && eb.mono === false, eb?.ff);
    const fl = await labelStyle(page, ".channel-create-surface .field label");
    check("T1c new-channel field label not monospace/uppercase", !!fl && fl.transform === "none" && fl.mono === false, JSON.stringify(fl));

    // ---- T2: Overview + Cost metric eyebrows ----
    await page.goto(`${BASE}/?hub=overview`, { waitUntil: "networkidle" }); await page.waitForTimeout(1600);
    const ov = await labelStyle(page, ".overview-hub.scoped .metric-eyebrow");
    check("T2a overview .metric-eyebrow sentence-case sans", !!ov && ov.transform === "none" && ov.mono === false, JSON.stringify(ov));
    await page.goto(`${BASE}/?channel=default&tab=cost`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /View Global Cost Center/i }).click(); await page.waitForTimeout(1500);
    const co = await labelStyle(page, ".cost-center.scoped .metric-eyebrow");
    check("T2b cost .metric-eyebrow sentence-case sans", !!co && co.transform === "none" && co.mono === false, JSON.stringify(co));
    const bl = await labelStyle(page, ".cost-center.scoped .budget-target-label");
    check("T2c cost budget label not CSS-uppercased", !!bl && bl.transform === "none", JSON.stringify(bl));

    // ---- T3: native Aurora surface unaffected (ActionCenter .text-mono stays mono) ----
    await page.goto(`${BASE}/?hub=actions`, { waitUntil: "networkidle" }); await page.waitForTimeout(1400);
    const tm = await labelStyle(page, ".aurora-app .text-mono");
    check("T3 native Aurora .text-mono unaffected (still mono)", tm === null || tm.mono === true, JSON.stringify(tm));

    // ---- T4: no @412 overflow on the re-homed form ----
    await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
    await page.locator(".btn-new-channel").first().click(); await page.waitForTimeout(900);
    await page.setViewportSize({ width: 412, height: 900 }); await page.waitForTimeout(500);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("T4 no horizontal overflow @412 (new-channel form)", noOverflow);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- T0: zero live writes ----
    check("T0 ZERO live writes (read-only)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("T5 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
