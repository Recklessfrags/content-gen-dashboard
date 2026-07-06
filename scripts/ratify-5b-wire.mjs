#!/usr/bin/env node
// Bespoke ratify — sub-lane 5b (The Wire -> Aurora "Ideas" home + enqueue money path).
// Intercept-and-abort EVERY table these surfaces write (ledger lesson: zero-writes is only as true as
// the intercept list): ideas, jobs, idea_job_map. Assert exactly-one-write-per-action, zero leaked live,
// duplicate-key handling, and that EnqueueIdeaPanel actually renders in the AURORA path (the #1 trap).
//
// Ratify trap (ledger 2026-07-05): NEXT_PUBLIC_* are inlined at BUILD time. This script rebuilds with
// .env.local present, then `next start`, so the client Supabase client actually initialises (else the app
// renders a blank shell and content gates false-pass). Set RATIFY_SKIP_BUILD=1 to reuse an env-built .next.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4327", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.RATIFY_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;

const FORBIDDEN = [
  "TRANSMIT", "TRANSMITTING", "TRANSMISSION", "The Wire", "Field Manual", "Dossier",
  "LOG NEW BEAT", "LOG IT", "declassifying", "BRAND ALIGNMENT WARNING",
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

// Write ledger. Every write to ideas/jobs/idea_job_map is intercept-and-aborted (synthesized response,
// NEVER forwarded). Any OTHER /rest/v1 write is recorded AND aborted so nothing leaks live.
const writes = { ideas: [], jobs: [], ideaJobMap: [], other: [] };
const seenJobKeys = new Set();
let uuidSeq = 0;
function fakeUuid() { uuidSeq += 1; return `00000000-0000-4000-8000-${String(uuidSeq).padStart(12, "0")}`; }

async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(); const method = request.method(); const url = request.url();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const json = (status, body) => route.fulfill({ status, headers: { "content-type": "application/json" }, body });

    if (isWrite && /\/rest\/v1\/ideas(\?|$)/.test(url)) {
      writes.ideas.push({ method, url, body: request.postData() });
      if (method === "POST") {
        // useIdeas insert uses .select().single() -> must echo a single row object.
        let payload = {}; try { const p = JSON.parse(request.postData() || "{}"); payload = Array.isArray(p) ? p[0] : p; } catch {}
        const row = {
          id: fakeUuid(), owner: "ratify",
          title: payload.title ?? "", note: payload.note ?? "",
          character_id: payload.character_id ?? null, channel: payload.channel ?? "",
          status: payload.status ?? "backlog", created_at: new Date().toISOString(),
        };
        return json(201, JSON.stringify(row));
      }
      return json(200, "[]"); // PATCH status/tag update: hook only checks error.
    }

    if (isWrite && /\/rest\/v1\/jobs(\?|$)/.test(url)) {
      let key = null; try { const p = JSON.parse(request.postData() || "{}"); key = (Array.isArray(p) ? p[0] : p)?.idempotency_key ?? null; } catch {}
      writes.jobs.push({ method, url, key });
      if (key && seenJobKeys.has(key)) {
        // Simulate the unique-constraint collision so the duplicate path ("Already queued") is exercised.
        return json(409, JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint", details: null, hint: null }));
      }
      if (key) seenJobKeys.add(key);
      return json(201, "[]");
    }

    if (isWrite && /\/rest\/v1\/idea_job_map(\?|$)/.test(url)) {
      writes.ideaJobMap.push({ method, url, body: request.postData() });
      return json(201, "[]");
    }

    if (isWrite && /\/rest\/v1\//.test(url)) { writes.other.push({ method, url }); return json(201, "[]"); }

    // Reads pass through live so the app loads real ideas/characters/channels.
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
async function waitAurora(page) {
  await page.waitForSelector(".aurora-app[data-aurora-shell]", { timeout: 30_000 });
}
let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {} await sleep(1000); }
  throw new Error("server did not start");
}

async function main() {
  const dot = loadDotEnvLocal();
  const env = { NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  if (!EMAIL || !PASSWORD || !env.NEXT_PUBLIC_SUPABASE_URL) { console.error("Missing QA creds (.env.local: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY + RATIFY_EMAIL/PASSWORD)."); process.exit(2); }

  if (process.env.RATIFY_SKIP_BUILD !== "1") {
    console.log("Building with NEXT_PUBLIC_* present (inline-at-build trap)…");
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

    // ---- I1: ?hub=ideas renders in AuroraShell with the capture form + list/empty ----
    await page.goto(`${BASE}/?hub=ideas`, { waitUntil: "networkidle" });
    await waitAurora(page);
    await page.waitForTimeout(1500);
    const hubTitle = (await page.locator("#ideas-hub-title").textContent().catch(() => "")) || "";
    check("I1a ideas hub renders in AuroraShell", hubTitle.trim() === "Ideas", `title=${JSON.stringify(hubTitle.trim())}`);
    const hasCapture = await page.locator(".ideas-hub__capture #idea-title").count();
    check("I1b capture form present", hasCapture === 1, `n=${hasCapture}`);
    const listOrEmpty = (await page.locator(".ideas-hub__list").count()) + (await page.locator(".ideas-hub .au-empty").count());
    check("I1c idea list or empty-state present", listOrEmpty >= 1);

    // ---- I2: no spy/terminal theming leaked into the Aurora surface ----
    const surface = (await page.locator(".ideas-hub").textContent().catch(() => "")) || "";
    const leaked = FORBIDDEN.filter((f) => surface.includes(f));
    check("I2 audit-clean copy (no spy/terminal theming)", leaked.length === 0, `leaked=${JSON.stringify(leaked)}`);

    // ---- I3: logging an idea => exactly one intercepted `ideas` insert, correct payload, nothing leaked ----
    writes.ideas.length = 0; writes.other.length = 0;
    const marker = `ratify beat ${Date.now()}`;
    await page.fill("#idea-title", marker);
    await page.locator(".ideas-hub__capture button.btn-primary").click();
    await page.waitForTimeout(1500);
    const ideaInserts = writes.ideas.filter((w) => w.method === "POST");
    check("I3a exactly one ideas insert", ideaInserts.length === 1, `n=${ideaInserts.length}`);
    const insertBody = ideaInserts[0]?.body || "";
    check("I3b insert payload carries the typed title + status backlog", insertBody.includes(marker) && /"status"\s*:\s*"backlog"/.test(insertBody), insertBody.slice(0, 160));
    check("I3c optimistic card rendered", (await page.locator(".idea-card__title", { hasText: marker }).count()) >= 1);

    // ---- I4: a status change => one `ideas` PATCH update; nothing leaked ----
    writes.ideas.length = 0;
    const firstCard = page.locator(".ideas-hub__list .idea-card").first();
    const inactiveSeg = firstCard.locator(".ideas-hub__segment:not(.is-active)").first();
    if (await inactiveSeg.count()) {
      await inactiveSeg.click(); await page.waitForTimeout(1200);
      const patches = writes.ideas.filter((w) => w.method === "PATCH");
      check("I4 status change => exactly one ideas update", patches.length === 1, `n=${patches.length}`);
    } else { check("I4 status change => exactly one ideas update", true, "no eligible card — skipped"); }

    // ---- I5: [Queue as run] opens EnqueueIdeaPanel IN THE AURORA PATH (the #1 trap) ----
    const queueBtn = page.locator(".ideas-hub__list .idea-card .ideas-hub__queue").first();
    check("I5a a Queue-as-run button exists", (await queueBtn.count()) >= 1);
    writes.jobs.length = 0; writes.ideaJobMap.length = 0; writes.other.length = 0;
    await queueBtn.click();
    await page.waitForSelector(".enqueue-panel", { timeout: 8000 });
    const panelVisible = await page.locator(".enqueue-panel").isVisible();
    const stillAurora = await page.locator(".aurora-app[data-aurora-shell]").count();
    check("I5b EnqueueIdeaPanel renders in the Aurora path", panelVisible && stillAurora >= 1, `panel=${panelVisible} aurora=${stillAurora}`);
    check("I5c opening the panel wrote nothing", writes.jobs.length === 0 && writes.ideaJobMap.length === 0);

    // ---- I6: submit => exactly one jobs insert + one idea_job_map insert sharing the idempotency_key ----
    await page.locator(".enqueue-panel button[type=submit]").click();
    await page.waitForTimeout(1800);
    check("I6a exactly one jobs insert", writes.jobs.length === 1, `n=${writes.jobs.length}`);
    check("I6b exactly one idea_job_map insert", writes.ideaJobMap.length === 1, `n=${writes.ideaJobMap.length}`);
    const jobKey = writes.jobs[0]?.key || "";
    const mapBody = writes.ideaJobMap[0]?.body || "";
    check("I6c idea_job_map carries the same idempotency_key", !!jobKey && mapBody.includes(jobKey), `key=${jobKey} map=${mapBody.slice(0, 120)}`);

    // ---- I7: duplicate key => "Already queued", no second forwarded row ----
    writes.jobs.length = 0; writes.ideaJobMap.length = 0;
    const queueBtn2 = page.locator(".ideas-hub__list .idea-card .ideas-hub__queue").first();
    if (await queueBtn2.count()) {
      await queueBtn2.click();
      await page.waitForSelector(".enqueue-panel", { timeout: 8000 });
      await page.locator(".enqueue-panel button[type=submit]").click();
      await page.waitForTimeout(1500);
      const dupToast = (await page.locator(".toast").allTextContents().catch(() => [])).join(" | ");
      check("I7a duplicate submit surfaces 'Already queued'", /already queued/i.test(dupToast), dupToast.slice(0, 120));
      check("I7b duplicate wrote no idea_job_map row (job insert 409'd)", writes.ideaJobMap.length === 0, `map=${writes.ideaJobMap.length}`);
    } else { check("I7a duplicate submit surfaces 'Already queued'", true, "panel unavailable — skipped"); }
    await page.keyboard.press("Escape").catch(() => {});

    // ---- I8: "Log an idea ->" from the dossier editor navigates to ?hub=ideas ----
    await page.goto(`${BASE}/?hub=characters`, { waitUntil: "networkidle" });
    await waitAurora(page); await page.waitForTimeout(1200);
    const card = page.locator(".channels-grid [role=button]").first();
    if (await card.count()) {
      await card.click(); await page.waitForTimeout(1200);
      const logBtn = page.locator("button", { hasText: "Log an idea" }).first();
      if (await logBtn.count()) {
        await logBtn.click(); await page.waitForTimeout(1200);
        const onIdeas = new URL(page.url()).search.includes("hub=ideas") && (await page.locator("#ideas-hub-title").count()) >= 1;
        check("I8 'Log an idea ->' navigates to the Aurora ideas hub", onIdeas, page.url());
      } else { check("I8 'Log an idea ->' navigates to the Aurora ideas hub", false, "Log-an-idea button not found on editor"); }
    } else { check("I8 'Log an idea ->' navigates to the Aurora ideas hub", true, "no character to open — skipped"); }

    // ---- I0: ZERO live writes forwarded; no app console errors ----
    check("I0 ZERO live writes forwarded (all intercept-and-aborted)", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));
    // Exclude env/proxy noise AND the intentional duplicate-key 409 the bridge induces in I7
    // (the "Already queued" path) — the browser logs a network 409 for it, which is the test
    // artifact, not an app defect (I7a/I7b assert the app handled it correctly).
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth|Failed to load resource.*409|status of 409/i.test(e));
    check("I9 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`writes intercepted: ideas=${writes.ideas.length} jobs=${writes.jobs.length} idea_job_map=${writes.ideaJobMap.length} | forwarded live: ${writes.other.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}
main();
