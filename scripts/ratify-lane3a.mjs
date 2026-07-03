#!/usr/bin/env node
// Bespoke Lane 3a ratify: channel-workspace shell + Guidelines + Cost tabs + N11 Hub link.
// Live DB truth (2026-07-03): channel_profiles == 1 row, channel="default", uncast (character null).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4312", 10);
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

    // --- Hub renders exactly the live channel count (1) ---
    await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const cards = await page.locator('.channel-card[role="button"]').count();
    check("L3a-1 hub shows 1 channel card (== live channel_profiles)", cards === 1, `cards=${cards}`);

    // --- Enter workspace at guidelines ---
    await page.goto(`${BASE}/?channel=default&tab=guidelines`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const url1 = new URL(page.url());
    check("L3a-2 workspace URL is source of truth (channel=default&tab=guidelines)",
      url1.searchParams.get("channel") === "default" && url1.searchParams.get("tab") === "guidelines",
      url1.search);

    // header identity
    const headerName = await page.locator(".workspace-header .text-display").first().textContent().catch(() => "");
    check("L3a-3 workspace-header shows channel display name", /Default/.test(headerName || ""), `"${headerName}"`);
    const uncast = await page.locator(".workspace-header .badge-neutral").filter({ hasText: /Uncast/i }).count();
    check("L3a-4 uncast badge shown (live character=null)", uncast >= 1, `uncastBadges=${uncast}`);

    // nav tablist + roving tabindex
    const navTabs = await page.locator(".workspace-nav .nav-tab[role=tab]").count();
    check("L3a-5 workspace-nav has 4 role=tab tabs", navTabs === 4, `tabs=${navTabs}`);
    const selectedTab = await page.locator('.workspace-nav .nav-tab[aria-selected="true"]').textContent().catch(() => "");
    check("L3a-6 Guidelines tab is aria-selected", /Guidelines/.test(selectedTab || ""), `"${selectedTab}"`);
    const rovingZero = await page.locator('.workspace-nav .nav-tab[tabindex="0"]').count();
    check("L3a-7 exactly one nav-tab has tabindex=0 (roving)", rovingZero === 1, `tabindex0=${rovingZero}`);

    // the .active tab-panel is actually visible (display:none trap)
    const panelVisible = await page.locator('#workspace-panel-guidelines.tab-panel.active').isVisible().catch(() => false);
    check("L3a-8 active tab-panel is visible (not display:none)", panelVisible);

    // Guidelines scoped editor: channel field == default & read-only; NO roster aside / new-channel / delete
    const chanField = await page.locator('#channel-profile-channel').inputValue().catch(() => "");
    const chanReadonly = await page.locator('#channel-profile-channel').getAttribute("readonly").catch(() => null);
    check("L3a-9 scoped Guidelines editor bound to 'default', read-only", chanField === "default" && chanReadonly !== null, `val=${chanField} ro=${chanReadonly}`);
    const rosterAside = await page.locator('.tab-panel.active .channel-profiles .roster').count();
    check("L3a-10 no master roster list in scoped Guidelines", rosterAside === 0, `roster=${rosterAside}`);
    const deleteBtn = await page.locator('.tab-panel.active').getByRole("button", { name: /^Delete$/ }).count();
    const newChanBtn = await page.locator('.tab-panel.active').getByRole("button", { name: /New channel/i }).count();
    check("L3a-11 no Delete / +New channel affordance in scoped mode", deleteBtn === 0 && newChanBtn === 0, `delete=${deleteBtn} new=${newChanBtn}`);
    const saveBtn = await page.locator('.tab-panel.active').getByRole("button", { name: /Save channel/i }).count();
    check("L3a-12 Save channel present (edit capability retained)", saveBtn === 1, `save=${saveBtn}`);

    // --- Gate 10: no legacy paper/stamp theme bleed (measured, DARK theme) ---
    const STAMP = "rgb(200, 69, 59)";   // legacy --stamp #C8453B
    const INK = "rgb(21, 24, 30)";      // legacy --ink   #15181E
    const saveBg = await page.locator('.tab-panel.active').getByRole("button", { name: /Save channel/i })
      .evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => "");
    check("L3a-G10a Save button is NOT legacy stamp-red (Aurora-skinned)", saveBg !== STAMP && saveBg !== "", `bg=${saveBg}`);
    const savebarBg = await page.locator('.tab-panel.active .savebar').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => "");
    check("L3a-G10b savebar is NOT legacy ink-dark", savebarBg !== INK, `bg=${savebarBg}`);
    const inputBg = await page.locator('#channel-profile-display-name')
      .evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => "");
    const paperInput = /rgb\(23[0-9], 2[0-9][0-9], 2[0-9][0-9]\)/.test(inputBg); // paper #E9E2D3-ish light fill
    check("L3a-G10c field input is not paper-colored", !paperInput, `inputBg=${inputBg}`);

    // --- Gate 10 (LIGHT theme): savebar must not be ink-dark; no horizontal scroll ---
    await page.locator(".theme-toggle").click().catch(() => {});
    await page.waitForTimeout(600);
    const themeAttr = await page.locator('[data-aurora-shell]').getAttribute("data-theme").catch(() => "");
    const savebarBgLight = await page.locator('.tab-panel.active .savebar').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => "");
    check("L3a-G10d LIGHT theme: savebar not ink-dark", themeAttr === "light" && savebarBgLight !== INK, `theme=${themeAttr} bg=${savebarBgLight}`);
    const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check("L3a-G10e no horizontal scroll at 1440 (light)", !hScroll);
    await page.locator(".theme-toggle").click().catch(() => {}); // back to dark
    await page.waitForTimeout(400);

    // keyboard: focus selected tab, ArrowRight moves focus to Cost (next after guidelines)
    await page.locator('.workspace-nav .nav-tab[aria-selected="true"]').focus();
    await page.keyboard.press("ArrowRight");
    const focusedAfterArrow = await page.evaluate(() => document.activeElement?.textContent || "");
    check("L3a-13 ArrowRight moves focus to next tab (Cost)", /Cost/.test(focusedAfterArrow), `focused="${focusedAfterArrow}"`);

    // --- Cost tab: honest deferred panel + global-cost link ---
    await page.goto(`${BASE}/?channel=default&tab=cost`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const deferred = await page.locator('.tab-panel.active .deferred-panel').filter({ hasText: /Deferred/i }).count();
    const noDollar = await page.locator('.tab-panel.active').filter({ hasText: /\$\d/ }).count();
    check("L3a-14 Cost tab = honest deferred panel (no fabricated per-channel $)", deferred >= 1 && noDollar === 0, `deferred=${deferred} dollarBlocks=${noDollar}`);
    const globalCostLink = await page.locator('.tab-panel.active').getByRole("button", { name: /Global Cost Center/i }).count();
    check("L3a-15 'View Global Cost Center' link present", globalCostLink === 1, `link=${globalCostLink}`);

    // --- Production/Character placeholders (in-scope: honest, present) ---
    await page.goto(`${BASE}/?channel=default&tab=production`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const prodPanel = await page.locator('#workspace-panel-production.tab-panel.active').isVisible().catch(() => false);
    check("L3a-16 Production placeholder panel renders (Lane 3b)", prodPanel);

    // --- Breadcrumb back to hub ---
    await page.goto(`${BASE}/?channel=default&tab=guidelines`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.locator('.breadcrumb .breadcrumb-button').filter({ hasText: /Channels/ }).click();
    await page.waitForTimeout(1000);
    const afterCrumb = new URL(page.url());
    check("L3a-17 breadcrumb 'Channels' returns to hub", afterCrumb.searchParams.get("hub") === "channels", afterCrumb.search);

    // --- N11: Hub button in legacy rail returns to Aurora hub ---
    await page.goto(`${BASE}/?view=roster`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const railHub = page.locator('.cr .rail').getByRole("button", { name: /^Hub$/ });
    const railHubCount = await railHub.count();
    check("L3a-18 legacy rail has a Hub button (N11)", railHubCount >= 1, `count=${railHubCount}`);
    if (railHubCount >= 1) {
      await railHub.first().click();
      await page.waitForTimeout(1200);
      const afterHub = new URL(page.url());
      const railGone = await page.locator('.cr .rail').count();
      check("L3a-19 Hub button exits legacy shell to hub", afterHub.searchParams.get("hub") === "channels" && railGone === 0, `${afterHub.search} railNodes=${railGone}`);
    }

    // console errors (env-only Google Fonts / login abort are acceptable; flag app errors)
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("L3a-20 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));

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
