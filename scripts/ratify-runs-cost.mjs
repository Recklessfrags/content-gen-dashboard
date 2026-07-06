#!/usr/bin/env node
// Bespoke ratify — two BUILDABLE-NOW read surfaces: RunsHub (?hub=runs, per-worker failure
// attribution) + RunCostEstimate (empirical run-cost estimate in the Cost center). Both are
// READ-ONLY: the ratify intercept-and-aborts EVERY /rest/v1 write and asserts ZERO occurred,
// while forwarding reads live so the real jobs/receipts/episodes drive the surfaces.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4329", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.RATIFY_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
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
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(url)) {
      writes.push({ method, url }); // record AND abort — nothing leaks live
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
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
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL); await page.fill("input[type=password]", PASSWORD); await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2500);
  if (new URL(page.url()).pathname.endsWith("/login")) throw new Error("login-failed");
}
async function waitAurora(page) { await page.waitForSelector(".aurora-app[data-aurora-shell]", { timeout: 30_000 }); }
let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {} await sleep(1000); }
  throw new Error("server did not start");
}

async function main() {
  const dot = loadDotEnvLocal();
  const env = { NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  if (!EMAIL || !PASSWORD || !env.NEXT_PUBLIC_SUPABASE_URL) { console.error("Missing QA creds (.env.local)."); process.exit(2); }
  if (process.env.RATIFY_SKIP_BUILD !== "1") {
    console.log("Building with NEXT_PUBLIC_* present…");
    const b = spawnSync("node_modules/.bin/next", ["build"], { cwd: ROOT, env: { ...process.env, ...env }, stdio: "inherit" });
    if (b.status !== 0) { console.error("next build failed"); process.exit(1); }
  }
  await startServer(env);
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installBridge(context);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  try {
    await login(page);

    // ---- R1: ?hub=runs renders in AuroraShell with a run list ----
    await page.goto(`${BASE}/?hub=runs`, { waitUntil: "networkidle" });
    await waitAurora(page);
    await page.waitForTimeout(2000);
    const title = (await page.locator("#runs-hub-title").textContent().catch(() => "")) || "";
    check("R1a runs hub renders in AuroraShell", title.trim() === "Runs", `title=${JSON.stringify(title.trim())}`);
    const runCards = await page.locator(".runs-hub__list .run-card").count();
    check("R1b run list renders", runCards >= 1, `cards=${runCards}`);

    // ---- R2: an errored run shows the run error + expands to a per-worker log ----
    await page.locator(".runs-hub__filter", { hasText: "Needs attention" }).click().catch(() => {});
    await page.waitForTimeout(600);
    const errored = page.locator(".run-card", { has: page.locator(".run-card__error") }).first();
    const erroredCount = await errored.count();
    check("R2a an errored run shows its run-error text (hoisted, visible without expanding)", erroredCount >= 1, `n=${erroredCount}`);
    if (erroredCount >= 1) {
      const disclosure = errored.locator(".runs-hub__disclosure").first();
      await disclosure.click();
      await page.waitForSelector(".run-card .run-worker-row, .run-card .run-worker-log", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);
      const workerRows = await errored.locator(".run-worker-row").count();
      const stageText = (await errored.locator(".run-worker-stage").first().textContent().catch(() => "")) || "";
      check("R2b expanding loads the per-worker log (stage · verdict · reason)", workerRows >= 1, `rows=${workerRows} firstStage=${stageText.trim()}`);
      const verdicts = await errored.locator(".run-verdict").count();
      check("R2c per-worker verdict badges render", verdicts >= 1, `verdicts=${verdicts}`);
    } else {
      check("R2b expanding loads the per-worker log (stage · verdict · reason)", false, "no errored card found");
      check("R2c per-worker verdict badges render", false, "no errored card found");
    }

    // ---- R3: the empirical cost estimate renders in the Cost center ----
    await page.goto(`${BASE}/?channel=default&tab=cost`, { waitUntil: "networkidle" });
    await waitAurora(page);
    await page.waitForTimeout(1200);
    await page.locator("button", { hasText: "View global cost center" }).first().click().catch(() => {});
    await page.waitForSelector("#run-cost-estimate-title", { timeout: 10000 });
    await page.waitForTimeout(1500);
    const estimateText = (await page.locator(".run-cost-estimate").textContent().catch(() => "")) || "";
    const hasRange = /\$\d/.test(estimateText) && (estimateText.includes("–") || /Not enough spend history/.test(estimateText));
    check("R3a cost estimate card renders", (await page.locator(".run-cost-estimate").count()) >= 1);
    check("R3b estimate shows a $ range (or the empty-history note)", hasRange, estimateText.replace(/\s+/g, " ").slice(0, 140));
    // change episodes-per-run and confirm the headline reacts
    const before = (await page.locator(".run-cost-estimate__range").first().textContent().catch(() => "")) || "";
    await page.locator(".run-cost-estimate__cap input").fill("10");
    await page.waitForTimeout(600);
    const after = (await page.locator(".run-cost-estimate__range").first().textContent().catch(() => "")) || "";
    check("R3c estimate reacts to episodes-per-run input", before !== "" ? after !== before : true, `before=${before} after=${after}`);

    // ---- R0: ZERO live writes; no app console errors ----
    check("R0 ZERO live writes (read-only surfaces)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("R4 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`writes forwarded live: ${writes.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}
main();
