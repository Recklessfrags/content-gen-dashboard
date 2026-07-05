#!/usr/bin/env node
// Bespoke ratify — Sub-lane 5a: channel DELETE in the Aurora workspace Guidelines tab.
// The DELETE is intercept-and-aborted (captured + fulfilled synthetically) => ZERO live writes;
// the seeded throwaway row `dash_ratify_del` survives and is cleaned up separately via MCP.
// Gates: (1) a non-default channel's Guidelines tab shows an ENABLED Delete; (2) clicking it fires
// exactly one channel_profiles DELETE for that channel + navigates back to the hub (onDeleted);
// (3) the `default` channel's Delete is DISABLED (fallback guard). Requires the throwaway seeded first.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4321", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const THROWAWAY = "dash_ratify_del";

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
function check(name, pass, detail = "") { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); }

const writes = { deletes: [], other: [] };
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(); const method = request.method(); const url = request.url();
    if (method === "DELETE" && /\/rest\/v1\/channel_profiles(\?|$)/.test(url)) {
      writes.deletes.push({ url });
      await route.fulfill({ status: 204, headers: { "content-range": "*/*" }, body: "" });
      return;
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(url)) writes.other.push({ method, url });
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

async function gotoGuidelines(page, channel) {
  await page.goto(`${BASE}/?channel=${channel}&tab=guidelines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
}

async function main() {
  const dot = loadDotEnvLocal();
  await startServer({ NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installBridge(context);
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {})); // accept the window.confirm
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  try {
    await login(page);

    // ---- D1: non-default channel Guidelines tab shows an ENABLED Delete ----
    await gotoGuidelines(page, THROWAWAY);
    check("D1a scoped Guidelines panel renders", (await page.locator(".channel-profiles.scoped").count()) >= 1);
    check("D1b legacy .cr NOT present", (await page.locator(".cr .rail").count()) === 0);
    const delBtn = page.locator(".channel-profiles.scoped").getByRole("button", { name: /^Delete$/i });
    check("D1c Delete button present in Aurora workspace", (await delBtn.count()) >= 1);
    check("D1d Delete ENABLED for a non-default channel", await delBtn.first().isEnabled().catch(() => false));

    // ---- D2: click Delete -> exactly ONE channel_profiles DELETE + nav back to hub ----
    writes.deletes.length = 0; writes.other.length = 0;
    await delBtn.first().click();
    await page.waitForTimeout(1800);
    check("D2a exactly ONE channel_profiles DELETE intercepted", writes.deletes.length === 1, `n=${writes.deletes.length}`);
    check("D2b DELETE targeted the throwaway channel", writes.deletes.length === 1 && /channel=eq\.dash_ratify_del/.test(writes.deletes[0].url), writes.deletes[0]?.url?.slice(-80));
    check("D2c no other live writes leaked", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));
    check("D2d navigated back to the Channels hub (onDeleted)", new URL(page.url()).searchParams.get("hub") === "channels", page.url());

    // ---- D3: default channel Delete is DISABLED (fallback guard) ----
    await gotoGuidelines(page, "default");
    const defDel = page.locator(".channel-profiles.scoped").getByRole("button", { name: /^Delete$/i });
    check("D3a Delete button present on default channel", (await defDel.count()) >= 1);
    check("D3b Delete DISABLED for the default (fallback) channel", (await defDel.first().isDisabled().catch(() => false)) === true);
    check("D3c fallback 'can't delete' hint shown", (await page.locator(".channel-profiles.scoped .hint", { hasText: /can't delete/i }).count()) >= 1);

    // ---- D0: zero live writes overall ----
    check("D0 ZERO live writes (DELETE intercept-and-aborted)", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));

    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("D4 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`writes intercepted: channel_profiles DELETE=${writes.deletes.length} other(forwarded)=${writes.other.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}

main();
