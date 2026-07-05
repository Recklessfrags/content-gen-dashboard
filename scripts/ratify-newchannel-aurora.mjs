#!/usr/bin/env node
// Bespoke ratify — Sub-lane 4: Aurora "New channel" create surface (WRITE-PATH, decoy fix).
// Intercept-and-abort ALL channel_profiles writes: captured + fulfilled synthetically, NEVER
// forwarded => ZERO live writes. Gates = slice-newcomer-journey-fixes.md #1:
//   (1) hub "+ New Channel" lands on a BLANK Aurora create form (no existing channel / no `default`);
//   (2) Save writes a NEW channel_profiles row (new codename) and never PATCHes/upserts `default`;
//   (3) abandoning writes nothing (defer-to-save).
// Live DB truth (2026-07-05): channel_profiles == 1 (`default`).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4318", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const NEW_CODENAME = "ratify_newchan";

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

const writes = { profiles: [], other: [] };
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (isWrite && /\/rest\/v1\/channel_profiles(\?|$)/.test(url)) {
      writes.profiles.push({ method, url, body: request.postData() });
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }
    if (isWrite && /\/rest\/v1\//.test(url)) writes.other.push({ method, url });
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers["content-length"];
    const body = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(url, { method, headers, body, redirect: "manual" });
      const rh = {};
      response.headers.forEach((value, key) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) rh[key] = value;
      });
      await route.fulfill({ status: response.status, headers: rh, body: Buffer.from(await response.arrayBuffer()) });
    } catch (error) {
      console.error(`bridge failed ${url}: ${error.message}`);
      await route.abort();
    }
  });
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  if (new URL(page.url()).pathname.endsWith("/login")) throw new Error("login-failed");
}

async function gotoHub(page) {
  await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
}
async function openCreate(page) {
  await gotoHub(page);
  await page.locator(".btn-new-channel").first().click();
  await page.waitForTimeout(1000);
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

async function main() {
  const dot = loadDotEnvLocal();
  await startServer({
    NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installBridge(context);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  try {
    await login(page);

    // ---- N1: "+ New Channel" -> Aurora create surface (not legacy), blank form ----
    writes.profiles.length = 0; writes.other.length = 0;
    await openCreate(page);
    check("N1a Aurora create surface renders (.channel-create-surface)", (await page.locator(".channel-create-surface").count()) >= 1);
    check("N1b rendered inside AuroraShell, legacy .cr NOT present", (await page.locator(".aurora-app").count()) >= 1 && (await page.locator(".cr .rail").count()) === 0);
    check("N1c scoped ChannelProfilesPanel present", (await page.locator(".channel-create-surface .channel-profiles.scoped").count()) >= 1);
    const bc = await page.locator(".channel-create-surface .breadcrumb").textContent().catch(() => "");
    check("N1d breadcrumb shows Channels / New channel", /Channels/.test(bc) && /New channel/i.test(bc), `"${bc}"`);
    const newRow = await page.locator(".channel-create-surface .filecode .live").textContent().catch(() => "");
    check("N1e NEW ROW indicator (not EDITING ROW)", /NEW/i.test(newRow) && !/EDITING/i.test(newRow), `"${newRow}"`);

    // ---- N2: BLANK form — codename empty + editable; no existing channel / no `default` / no master list ----
    const codename = page.locator("#channel-profile-channel");
    const codenameVal = await codename.inputValue().catch(() => "<none>");
    check("N2a codename field is BLANK (no default pre-filled)", codenameVal === "", `codename="${codenameVal}"`);
    const readOnly = await codename.evaluate((el) => el.hasAttribute("readonly")).catch(() => true);
    check("N2b codename field editable (creating)", readOnly === false);
    check("N2c no master list / roster shown", (await page.locator(".channel-create-surface .roster").count()) === 0);
    check("N2d no 'default' text pre-selected in the create form", !/\bdefault\b/.test((await page.locator(".channel-create-surface .dossier-head").textContent().catch(() => "")) || ""));

    // ---- N3: defer-to-save — opening the form wrote NOTHING ----
    check("N3 opening the create form wrote nothing (defer-to-save)", writes.profiles.length === 0, `n=${writes.profiles.length}`);

    // ---- N4: Save a NEW codename -> exactly ONE channel_profiles write, new codename, never `default` ----
    await codename.click();
    await codename.fill(NEW_CODENAME);
    await page.locator("#channel-profile-display-name").fill("Ratify New Channel").catch(() => {});
    await page.waitForTimeout(200);
    writes.profiles.length = 0;
    await page.getByRole("button", { name: /Save channel/i }).click();
    await page.waitForTimeout(1800);
    check("N4a exactly ONE channel_profiles write intercepted", writes.profiles.length === 1, `n=${writes.profiles.length} methods=${writes.profiles.map((w) => w.method)}`);
    const body = writes.profiles[0]?.body || "";
    check("N4b write payload carries the NEW codename", new RegExp(`"channel":"${NEW_CODENAME}"`).test(body) || body.includes(NEW_CODENAME), body.slice(0, 140));
    check("N4c write does NOT target `default`", !/"channel":"default"/.test(body), body.slice(0, 140));
    check("N4d ZERO channel_profiles writes forwarded live (all aborted)", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));
    // onCreated closed the surface -> back on the hub grid
    await page.waitForTimeout(600);
    check("N4e create surface closed after save (back on hub)", (await page.locator(".channel-create-surface").count()) === 0);

    // ---- N5: abandon writes nothing ----
    await openCreate(page);
    await page.locator("#channel-profile-channel").fill("abandoned_chan");
    writes.profiles.length = 0;
    await page.locator(".channel-create-surface .breadcrumb .breadcrumb-button").click();
    await page.waitForTimeout(700);
    check("N5a Cancel returns to the hub (no create surface)", (await page.locator(".channel-create-surface").count()) === 0);
    check("N5b abandoning wrote nothing", writes.profiles.length === 0 && writes.other.length === 0, `profiles=${writes.profiles.length} other=${writes.other.length}`);

    // ---- N6: no horizontal overflow @412 on the create surface ----
    await openCreate(page);
    await page.setViewportSize({ width: 412, height: 900 });
    await page.waitForTimeout(500);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("N6 no horizontal overflow @412 (create surface)", noOverflow);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- N0: zero live writes overall ----
    check("N0 ZERO live channel_profiles writes forwarded (all intercepted)", writes.other.length === 0);

    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("N7 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`writes intercepted: channel_profiles=${writes.profiles.length} other(forwarded)=${writes.other.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}

main();
