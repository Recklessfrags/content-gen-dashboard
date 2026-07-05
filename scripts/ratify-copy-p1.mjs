#!/usr/bin/env node
// Bespoke ratify — P1 copy sweep: S2 jargon→plain rename across the surviving Aurora surfaces
// + shared dossier editor + overlays. COPY-ONLY. Verify new plain copy renders on the live build,
// old theming/jargon is gone, and ZERO live writes (read/navigate only — no save).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4351", 10);
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
    // Intercept EVERY table an action might write (ledger lesson: zero-writes is only as true as the intercept list).
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(url)) {
      writes.push({ method, url });
      // Abort any write outright so nothing can land live.
      await route.abort(); return;
    }
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
  await page.waitForSelector(".aurora-app", { timeout: 30_000 }); // client must hydrate (NEXT_PUBLIC creds baked into build)
}
async function gotoHydrated(page, url, sel) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(sel, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(600);
}
let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {} await sleep(1000); }
  throw new Error("server did not start");
}
const has = (hay, s) => hay.includes(s);
const none = (hay, list) => list.filter((s) => hay.includes(s));

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

    // ---- A: Aurora Characters hub (grid) ----
    await gotoHydrated(page, `${BASE}/?hub=characters`, "section[aria-labelledby='characters-hub-title']");
    const hub = (await page.locator("section[aria-labelledby='characters-hub-title']").first().textContent().catch(() => "")) || "";
    const hubHtml = (await page.locator("section[aria-labelledby='characters-hub-title']").first().innerHTML().catch(() => "")) || "";
    check("A1 chars hub: new subtitle, no 'field manuals'/'personas'", has(hub, "Recurring characters for your channels") && none(hub, ["field manual", "personas", "Personas"]).length === 0, hub.slice(0, 70));
    check("A2 chars hub: card aria uses 'character profile' not 'dossier'", /Open .* character profile/.test(hubHtml) && !/character dossier/i.test(hubHtml), "");

    // ---- B: Aurora Overview ----
    await gotoHydrated(page, `${BASE}/?hub=overview`, ".overview");
    const ov = (await page.locator(".overview").first().textContent().catch(() => "")) || "";
    const ovLeak = none(ov, ["Roster Dossier", "The Wire Queue", "Sentinel Pass Rate", "Sentinel", "Total Pipeline Runs", "Operational Spend", "dossier", "manuals", "No pipeline output"]);
    check("B1 overview: no theming/jargon labels", ovLeak.length === 0, `leaked=${JSON.stringify(ovLeak)}`);
    check("B2 overview: new plain headings + metric labels", ["Fact-check pass rate", "Total runs", "Total spend", "Idea conversion"].every((s) => has(ov, s)), ov.slice(0, 60));

    // ---- C: Aurora Channels hub ----
    await gotoHydrated(page, `${BASE}/?hub=channels`, "section[aria-labelledby='channels-hub-title']");
    const ch = (await page.locator("section[aria-labelledby='channels-hub-title']").first().textContent().catch(() => "")) || "";
    check("C1 channels hub: no 'Root Objects'/'Phase 3'", ch.length > 0 && none(ch, ["Root Objects", "Production Lines", "Phase 3"]).length === 0, ch.slice(0, 80));

    // ---- D: Shared dossier editor (open a character) ----
    await gotoHydrated(page, `${BASE}/?hub=characters`, ".channel-card");
    await page.locator(".channel-card").first().click(); await page.waitForTimeout(1400);
    const ed = (await page.locator(".characters-bench.scoped").first().textContent().catch(() => "")) || "";
    check("D1 editor: 'Save character' + 'ID ·', no 'Save dossier'/'FIELD MANUAL'/'UNPERSISTED'/'EXPORT MANUAL'", ed.length > 0 && has(ed, "Save character") && none(ed, ["Save dossier", "FIELD MANUAL", "UNPERSISTED", "EXPORT MANUAL"]).length === 0, ed.slice(0, 60));
    check("D2 editor: no 'Codename' label / no 'FILE ·' eyebrow, has 'ID ·'", ed.length > 0 && !/\bCodename\b/.test(ed) && !/FILE ·/.test(ed) && /ID ·/.test(ed), "");

    // ---- E: Channel workspace — Character tab ----
    await gotoHydrated(page, `${BASE}/?channel=default&tab=character`, ".aurora-app");
    const wsBody = (await page.locator(".aurora-app").first().textContent().catch(() => "")) || "";
    check("E1 workspace: no 'Bible)'/'E1 Persona Advisory'/'Persona engine' leaks", wsBody.length > 0 && none(wsBody, ["Character Dossier (Bible)", "E1 Persona Advisory", "Persona engine"]).length === 0, "");

    // ---- F: Channel workspace — Cost tab (Phase 3 leak) ----
    await gotoHydrated(page, `${BASE}/?channel=default&tab=cost`, ".aurora-app");
    const costBody = (await page.locator(".aurora-app").first().textContent().catch(() => "")) || "";
    check("F1 cost tab: no 'Phase 3'/'channel scope column', new plain deferral copy", costBody.length > 0 && none(costBody, ["Phase 3", "channel scope column"]).length === 0 && has(costBody, "coming soon"), "");

    // ---- G: Channel profile dial labels (guidelines tab) — operator-approved S2 renames ----
    await gotoHydrated(page, `${BASE}/?channel=default&tab=guidelines`, ".aurora-app");
    const gl = (await page.locator(".aurora-app").first().textContent().catch(() => "")) || "";
    const glLeak = none(gl, ["Treatment", "Claim discipline", "Arousal ceiling", "Source ladder", "Sources & packaging", "Sources &amp; packaging"]);
    check("G1 dial form: no old jargon labels", gl.length > 0 && glLeak.length === 0, `leaked=${JSON.stringify(glLeak)}`);
    check("G2 dial form: new plain labels present", ["Fact-check strictness", "Intensity limit", "Footage sources", "Footage & presentation"].every((s) => has(gl, s)), gl.slice(0, 60));

    // ---- 0: zero live writes + no app console errors ----
    check("Z1 ZERO live writes (navigate/read only)", writes.length === 0, JSON.stringify(writes.slice(0, 4)));
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
