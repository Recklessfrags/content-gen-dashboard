#!/usr/bin/env node
// Bespoke Lane 3c ratify: channel workspace CHARACTER tab.
// Live DB truth: channel_profiles == 1 row channel="default", character=null → UNCAST state.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4313", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;

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

async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers["content-length"];
    const method = request.method();
    const body = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(request.url(), { method, headers, body, redirect: "manual" });
      const rh = {};
      response.headers.forEach((value, key) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) rh[key] = value;
      });
      await route.fulfill({ status: response.status, headers: rh, body: Buffer.from(await response.arrayBuffer()) });
    } catch (error) {
      console.error(`bridge failed ${request.url()}: ${error.message}`);
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
    await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);

    const panel = page.locator('#workspace-panel-character.tab-panel.active');
    check("L3c-1 Character tab is the active panel", await panel.isVisible().catch(() => false));
    const charTabSelected = await page.locator('.workspace-nav .nav-tab[aria-selected="true"]').textContent().catch(() => "");
    check("L3c-2 Character nav-tab aria-selected", /Character/.test(charTabSelected || ""), `"${charTabSelected}"`);

    // Live truth = UNCAST (default.character is null)
    const noCast = await panel.getByText(/No Character Assigned/i).count();
    check("L3c-3 UNCAST state shown (live default is uncast)", noCast >= 1, `matches=${noCast}`);
    const uncastAvatar = await panel.locator('.avatar-uncast-large').count();
    check("L3c-4 uncast avatar rendered", uncastAvatar >= 1, `n=${uncastAvatar}`);
    const assignBtn = await panel.getByRole("button", { name: /Assign Character/i }).count();
    const createBtn = await panel.getByRole("button", { name: /Create New/i }).count();
    check("L3c-5 Assign Character + Create New present", assignBtn === 1 && createBtn === 1, `assign=${assignBtn} create=${createBtn}`);

    // no second h1 on the page (workspace-header owns the only h1)
    const h1Count = await page.locator('main h1').count();
    check("L3c-6 exactly one <h1> on the workspace page", h1Count === 1, `h1=${h1Count}`);

    // Assign Character → Guidelines tab (where the free-text character field lives)
    await panel.getByRole("button", { name: /Assign Character/i }).click();
    await page.waitForTimeout(1000);
    const afterAssign = new URL(page.url());
    check("L3c-7 'Assign Character' routes to Guidelines tab", afterAssign.searchParams.get("tab") === "guidelines", afterAssign.search);

    // Create New → legacy roster console (Q1 reachability / no capability lost)
    await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.locator('#workspace-panel-character.tab-panel.active').getByRole("button", { name: /Create New/i }).click();
    await page.waitForTimeout(1500);
    const rail = await page.locator('.cr .rail').count();
    check("L3c-8 'Create New' opens legacy roster (full character CRUD reachable — Q1)", rail >= 1, `railNodes=${rail}`);

    // app console errors (env-only fonts CDN excluded)
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("L3c-9 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));

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
