#!/usr/bin/env node
// Bespoke ratify — P0 copy batch: dossier Restore/Discard dialogs + Cost Center strings.
// COPY-ONLY (+ error <details>). Verify the new plain copy renders, old caps/jargon gone, ZERO live writes.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4324", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const COST_FORBIDDEN = ["LIMIT EXCEEDED", "SYSTEM REGULATION", "AWAITING PIPELINE UPGRADE", "LOCAL SPEND GOVERNANCE", "SET TARGET GOAL", "API PROVIDER BREAKDOWN", "PER-CHARACTER COST", "Operational Spend", "In-Flight Aware", "max(spend_so_far)", "Cost Box Unavailable"];

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
async function openEditor(page, codename) {
  await page.goto(`${BASE}/?hub=characters`, { waitUntil: "networkidle" }); await page.waitForTimeout(1600);
  await page.locator(".channel-card", { hasText: codename }).first().click(); await page.waitForTimeout(1200);
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

    // ---- C: Cost Center new copy ----
    await page.goto(`${BASE}/?channel=default&tab=cost`, { waitUntil: "networkidle" }); await page.waitForTimeout(1400);
    await page.getByRole("button", { name: /View Global Cost Center/i }).click(); await page.waitForTimeout(1500);
    const cost = (await page.locator(".cost-center.scoped").textContent().catch(() => "")) || "";
    const costLeak = COST_FORBIDDEN.filter((s) => cost.includes(s));
    check("C1 cost surface: no old caps/jargon", costLeak.length === 0, `leaked=${JSON.stringify(costLeak)}`);
    check("C2 cost surface: new plain labels present", ["Total spend", "Budget target", "Spend by provider", "Coming soon"].every((s) => cost.includes(s)), cost.slice(0, 80));

    // ---- R: Restore dialog new copy ----
    await openEditor(page, "Fine Print");
    await page.locator(".characters-bench.scoped .history-trigger").first().click(); await page.waitForTimeout(1000);
    await page.locator(".characters-bench.scoped .revision-card").getByRole("button", { name: /^Restore$/i }).first().click(); await page.waitForTimeout(700);
    const rd = (await page.locator(".characters-bench.scoped .restore-dialog").textContent().catch(() => "")) || "";
    check("R1 restore dialog: new heading + button, no 'Are you sure'/'Yes, Restore'", /Restore this version\?/.test(rd) && /Restore version/.test(rd) && !/Are you sure/.test(rd) && !/Yes, Restore/.test(rd), rd.slice(0, 90));
    await page.getByRole("button", { name: /^Cancel$/i }).click(); await page.waitForTimeout(400);
    // close history
    await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(400);

    // ---- D: Discard dialog new copy (edit a field, navigate away) ----
    const ta = page.locator(".characters-bench.scoped .sheet textarea").first();
    await ta.click(); await ta.press("End"); await ta.type(" [dirty]"); await page.waitForTimeout(200);
    await page.locator(".characters-bench.scoped .breadcrumb .breadcrumb-button").click(); await page.waitForTimeout(500);
    const dd = (await page.getByRole("alertdialog").textContent().catch(() => "")) || "";
    check("D1 discard dialog: new copy, no 'BUFFER'/'field manual'/caps", /Discard unsaved changes\?/.test(dd) && /Keep editing/.test(dd) && !/BUFFER/.test(dd) && !/field manual/.test(dd), dd.slice(0, 90));
    await page.getByRole("button", { name: /Keep editing/i }).click(); await page.waitForTimeout(400);

    // ---- 0: zero live writes ----
    check("P0 ZERO live writes (read/confirm-cancel only)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("P1 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
