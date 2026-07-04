#!/usr/bin/env node
// Bespoke Lane 5 ratify: reinstate the legacy ?view=->hub deep-link redirect (slice §3 Q3)
// while keeping the legacy shell reachable via the WARM openLegacyConsole path (gate 5, no
// capability lost). Live DB truth (2026-07-04): channel_profiles == 1 row, channel="default",
// uncast (character null) => Character tab shows the uncast state with a "Create New" CTA that
// opens the legacy roster.
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
  if (new URL(page.url()).pathname.endsWith("/login")) {
    const alert = await page.locator("[role=alert]").first().textContent().catch(() => "");
    throw new Error(`login-failed${alert ? `: ${alert.trim()}` : ""}`);
  }
}

let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (r.status > 0) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("server did not start");
}

// A cold deep-link must redirect to the hub and NOT enter the legacy .cr shell.
async function assertColdRedirect(page, view) {
  await page.goto(`${BASE}/?view=${view}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const url = new URL(page.url());
  const railCount = await page.locator(".cr .rail").count();
  const onHub = url.searchParams.get("hub") === "channels" && !url.searchParams.has("view");
  check(
    `L5 cold ?view=${view} redirects to ?hub=channels (no legacy shell)`,
    onHub && railCount === 0,
    `url=${url.search} legacyRail=${railCount}`,
  );
  return onHub && railCount === 0;
}

async function main() {
  const dot = loadDotEnvLocal();
  if (!EMAIL || !PASSWORD) throw new Error("RATIFY_EMAIL / RATIFY_PASSWORD not set (append to .env.local)");
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

    // --- L5-1..4: EVERY legacy ?view= cold deep link redirects to the Aurora hub ---
    await assertColdRedirect(page, "channels");
    await assertColdRedirect(page, "queue");
    await assertColdRedirect(page, "cost");
    // roster too — even the character-CRUD home redirects on a COLD link; it stays reachable
    // only via the WARM openLegacyConsole path (asserted below), which is the point of Lane 5.
    await assertColdRedirect(page, "roster");

    // --- L5-5: the redirected hub is the real, working Channels hub (1 live card) ---
    const cards = await page.locator('.channel-card[role="button"]').count();
    check("L5-5 redirect lands on a working hub (1 channel card == live)", cards === 1, `cards=${cards}`);

    // --- L5-6: GATE 5 no-capability-lost — legacy shell reachable via the WARM Character CTA ---
    await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const createNew = page.locator('#workspace-panel-character.tab-panel.active').getByRole("button", { name: /^Create New$/ });
    const createNewCount = await createNew.count();
    check("L5-6a uncast Character tab exposes 'Create New' CTA", createNewCount >= 1, `count=${createNewCount}`);
    if (createNewCount >= 1) {
      await createNew.first().click();
      await page.waitForTimeout(1500);
      const railAfterWarm = await page.locator(".cr .rail").count();
      const warmUrl = new URL(page.url());
      check(
        "L5-6b 'Create New' opens the legacy roster (warm path — full character CRUD reachable)",
        railAfterWarm >= 1 && warmUrl.searchParams.get("view") === "roster",
        `legacyRail=${railAfterWarm} url=${warmUrl.search}`,
      );

      // --- L5-7: N11 — the legacy rail Hub button still exits to the Aurora hub (regression) ---
      const railHub = page.locator('.cr .rail').getByRole("button", { name: /^Hub$/ });
      const railHubCount = await railHub.count();
      check("L5-7a legacy rail has a Hub button (N11)", railHubCount >= 1, `count=${railHubCount}`);
      if (railHubCount >= 1) {
        await railHub.first().click();
        await page.waitForTimeout(1200);
        const afterHub = new URL(page.url());
        const railGone = await page.locator('.cr .rail').count();
        check("L5-7b Hub button exits legacy shell to hub", afterHub.searchParams.get("hub") === "channels" && railGone === 0, `${afterHub.search} railNodes=${railGone}`);
      }
    }

    // --- L5-8: warm back-nav — enter legacy via warm CTA, browser Back exits legacy cleanly ---
    await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const createNew2 = page.locator('#workspace-panel-character.tab-panel.active').getByRole("button", { name: /^Create New$/ });
    if ((await createNew2.count()) >= 1) {
      await createNew2.first().click();
      await page.waitForTimeout(1200);
      const inLegacy = await page.locator(".cr .rail").count();
      await page.goBack();
      await page.waitForTimeout(1200);
      const backUrl = new URL(page.url());
      const railBack = await page.locator(".cr .rail").count();
      check(
        "L5-8 Back from warm legacy exits to prior Aurora scope (popstate, dirty-guard intact)",
        inLegacy >= 1 && railBack === 0 && backUrl.searchParams.get("channel") === "default" && backUrl.searchParams.get("tab") === "character",
        `railBack=${railBack} url=${backUrl.search}`,
      );
    }

    // --- L5-9: no app-level console errors (env-only fonts CDN / login abort excluded) ---
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|Failed to load resource.*login|net::ERR_ABORTED.*auth|ERR_CONNECTION_RESET/i.test(e));
    check("L5-9 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));

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
