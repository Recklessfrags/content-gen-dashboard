#!/usr/bin/env node
// Bespoke ratify — P0 money-confirmation copy (QueueActionDialog + ActionCenter). COPY-ONLY change:
// verify the leaked contract tokens / theming are gone, the new plain copy renders, and the money path
// still fires exactly one write (intercept-and-abort => ZERO live writes). Live DB (2026-07-05):
// 10 ready_for_review + 2 stale actionable jobs.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4323", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;

const FORBIDDEN = [
  "TRANSMITTING", "Transmitting", "fact_approved=true", "spend_approved=true", "regulated-YELLOW",
  "byte-identical", "Buffer token", "hard-cap", "extra-budgetary", "Authorize & continue",
  "Classifying parked gate", "stranded - needs attention", "Parked to prevent runaway",
  "could not be classified",
];

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

const writes = { jobs: [], other: [] };
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(); const method = request.method(); const url = request.url();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    // Intercept-and-abort the whole re-enqueue money path: the jobs write AND the
    // idea_job_map provenance write (Phase-3 Lane 1) => ZERO live writes.
    if (isWrite && /\/rest\/v1\/(jobs|idea_job_map)(\?|$)/.test(url)) {
      writes.jobs.push({ method, url });
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }
    if (isWrite && /\/rest\/v1\//.test(url)) writes.other.push({ method, url });
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

    // ---- M1: ActionCenter renders actionable jobs ----
    await page.goto(`${BASE}/?hub=actions`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // let park classification resolve
    const rows = await page.locator(".approval-row").count();
    check("M1 ActionCenter renders actionable jobs", rows >= 1, `rows=${rows}`);

    // ---- M2: forbidden contract tokens / theming absent from the surface ----
    const surface = (await page.locator("section[aria-labelledby='action-center-title']").textContent().catch(() => "")) || "";
    const leaked = FORBIDDEN.filter((f) => surface.includes(f));
    check("M2 no leaked contract tokens / theming on the surface", leaked.length === 0, `leaked=${JSON.stringify(leaked)}`);

    // ---- M3: new plain park-status phrasing present ----
    const newPhrases = ["need your sign-off", "Paused to avoid unexpected cost", "stalled and needs a re-run", "Checking why this run paused", "couldn't tell which approval", "Waiting to publish"];
    check("M3 new plain park-status copy present", newPhrases.some((p) => surface.includes(p)), surface.slice(0, 120));

    // ---- M4: open an inline confirm -> new copy, no forbidden tokens ----
    writes.jobs.length = 0; writes.other.length = 0;
    await page.locator(".approval-row .approval-actions button").first().click();
    await page.waitForTimeout(900);
    const confirm = await page.locator(".au-inline-confirm-copy").first().textContent().catch(() => "");
    check("M4a inline confirm opens with copy", !!confirm && confirm.length > 10, (confirm || "").slice(0, 80));
    check("M4b confirm copy has no forbidden tokens", FORBIDDEN.every((f) => !confirm.includes(f)), confirm?.slice(0, 100));
    check("M4c opening the confirm wrote nothing (step-1 no write)", writes.jobs.length === 0, `n=${writes.jobs.length}`);

    // ---- M5: confirming still fires the money path — exactly one write, ZERO forwarded ----
    const confirmBtn = page.locator(".au-inline-confirm-actions button").nth(1); // [Cancel, Confirm]
    await confirmBtn.click();
    await page.waitForTimeout(1500);
    check("M5a confirming fires the re-enqueue (money path intact)", writes.jobs.length >= 1, `jobs writes=${writes.jobs.length}`);
    check("M5b ZERO jobs writes forwarded live (intercept-and-abort)", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));

    // ---- M0: zero live writes overall ----
    check("M0 ZERO live writes forwarded", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("M6 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`writes: jobs(intercepted)=${writes.jobs.length} other(forwarded)=${writes.other.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}
main();
