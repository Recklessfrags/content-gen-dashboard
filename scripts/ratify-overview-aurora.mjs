#!/usr/bin/env node
// Bespoke ratify — Sub-lane 5e: Aurora "System Overview" home (READ-ONLY re-skin).
// The legacy OverviewDashboard is re-homed into ?hub=overview under `.overview-hub.scoped`.
// Verifies: Aurora skin renders real data (not the stub), AA both themes, scoping (legacy .cr
// untouched), no @412 overflow, ZERO live writes (read-only surface). Live DB (2026-07-05):
// characters == 3, episodes == 55.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4319", 10);
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

function parseRGB(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
}
function comp(fg, bg) { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
function lum({ r, g, b }) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function ratio(fg, bg) { const L1 = lum(fg), L2 = lum(bg); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }

async function elemContrast(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
    const layers = [];
    let n = el;
    while (n) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
      n = n.parentElement;
    }
    let base = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : (theme === "light" ? { r: 245, g: 245, b: 247, a: 1 } : { r: 5, g: 5, b: 10, a: 1 });
    for (let i = layers.length - 1; i >= 0; i--) { const f = layers[i]; base = { r: f.r * f.a + base.r * (1 - f.a), g: f.g * f.a + base.g * (1 - f.a), b: f.b * f.a + base.b * (1 - f.a), a: 1 }; }
    return { color: getComputedStyle(el).color, effBg: `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})` };
  }, selector);
}
function ratioFrom(c) { if (!c) return null; const effBg = parseRGB(c.effBg); const txt = comp(parseRGB(c.color), effBg); return ratio(txt, effBg); }
async function setTheme(page, theme) {
  await page.evaluate((t) => { document.documentElement.setAttribute("data-theme", t); const shell = document.querySelector("[data-aurora-shell]"); if (shell) shell.setAttribute("data-theme", t); }, theme);
  await page.waitForTimeout(350);
}
async function bgAlpha(page, sel) {
  return page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map(parseFloat); return p[3] === undefined ? 1 : p[3]; }, sel);
}

const writes = [];
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(url)) writes.push({ method, url });
    const headers = { ...request.headers() };
    delete headers.host; delete headers["content-length"];
    const body = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(url, { method, headers, body, redirect: "manual" });
      const rh = {};
      response.headers.forEach((value, key) => { if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) rh[key] = value; });
      await route.fulfill({ status: response.status, headers: rh, body: Buffer.from(await response.arrayBuffer()) });
    } catch (error) { console.error(`bridge failed ${url}: ${error.message}`); await route.abort(); }
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

    // ---- O1: ?hub=overview renders the Aurora overview (not the stub, not legacy) ----
    await page.goto(`${BASE}/?hub=overview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    check("O1a URL stays ?hub=overview", new URL(page.url()).searchParams.get("hub") === "overview");
    check("O1b Aurora overview-hub renders", (await page.locator(".overview-hub.scoped").count()) >= 1);
    check("O1c inside AuroraShell, legacy .cr NOT present", (await page.locator(".aurora-app").count()) >= 1 && (await page.locator(".cr .rail").count()) === 0);
    const bodyText = await page.locator(".overview-hub.scoped").textContent().catch(() => "");
    check("O1d NOT the stub ('next lane' gone)", !/next lane/i.test(bodyText || ""));
    const columns = await page.locator(".overview-hub.scoped .overview-column").count();
    check("O1e three domain columns render", columns === 3, `columns=${columns}`);

    // ---- O2: real data — metric cards + at least one numeric metric-value ----
    const cards = await page.locator(".overview-hub.scoped .metric-card").count();
    check("O2a metric cards render", cards >= 3, `cards=${cards}`);
    const firstVal = await page.locator(".overview-hub.scoped .metric-value").first().textContent().catch(() => "");
    check("O2b first metric value is real (numeric)", /\d/.test(firstVal || ""), `"${firstVal}"`);
    // "Total Characters" == live 3
    const totalChars = await page.locator(".overview-hub.scoped .metric-card", { hasText: /Total Characters/i }).locator(".metric-value").first().textContent().catch(() => "");
    check("O2c Total Characters == live 3", (totalChars || "").trim() === "3", `"${totalChars}"`);

    // ---- O3: Aurora skin — translucent surfaces + legacy terminal header hidden ----
    const colA = await bgAlpha(page, ".overview-hub.scoped .overview-column");
    check("O3a columns use Aurora translucent surface", colA !== null && colA < 1, `bgAlpha=${colA}`);
    const cardA = await bgAlpha(page, ".overview-hub.scoped .metric-card");
    check("O3b metric cards use Aurora translucent surface", cardA !== null && cardA < 1, `bgAlpha=${cardA}`);
    const legacyHeadShown = await page.evaluate(() => {
      const el = document.querySelector(".overview-hub.scoped .overview > .col-head");
      return el ? getComputedStyle(el).display !== "none" : false;
    });
    check("O3c redundant legacy terminal header hidden", legacyHeadShown === false);

    // ---- O4: AA both themes (metric value, subtext, status-accent text) ----
    const valDark = ratioFrom(await elemContrast(page, ".overview-hub.scoped .metric-value"));
    check("O4a metric-value AA (dark)", valDark !== null && valDark >= 4.5, `ratio=${valDark?.toFixed(2)}`);
    const subDark = ratioFrom(await elemContrast(page, ".overview-hub.scoped .metric-subtext"));
    check("O4b metric-subtext AA (dark)", subDark !== null && subDark >= 4.5, `ratio=${subDark?.toFixed(2)}`);
    const accSel = ".overview-hub.scoped .accent-cleared, .overview-hub.scoped .accent-failed, .overview-hub.scoped .accent-brass";
    const accDark = ratioFrom(await elemContrast(page, accSel));
    check("O4c status-accent text AA (dark)", accDark === null || accDark >= 4.5, `ratio=${accDark?.toFixed(2)}`);
    await setTheme(page, "light");
    const valLight = ratioFrom(await elemContrast(page, ".overview-hub.scoped .metric-value"));
    check("O4d metric-value AA (light)", valLight !== null && valLight >= 4.5, `ratio=${valLight?.toFixed(2)}`);
    const subLight = ratioFrom(await elemContrast(page, ".overview-hub.scoped .metric-subtext"));
    check("O4e metric-subtext AA (light)", subLight !== null && subLight >= 4.5, `ratio=${subLight?.toFixed(2)}`);
    const accLight = ratioFrom(await elemContrast(page, accSel));
    check("O4f status-accent text AA (light)", accLight === null || accLight >= 4.5, `ratio=${accLight?.toFixed(2)}`);
    await setTheme(page, "dark");

    // ---- O5: sparkline series colour (categorical spend=accent) if a sparkline rendered ----
    const spark = await page.locator(".overview-hub.scoped .sparkline-stroke.s-spend").count();
    if (spark >= 1) {
      const stroke = await page.evaluate(() => getComputedStyle(document.querySelector(".overview-hub.scoped .sparkline-stroke.s-spend")).stroke);
      // Aurora accent (dark) resolves to rgb(0, 229, 255); assert NOT the legacy brass
      check("O5 spend sparkline stroke re-themed to Aurora accent", /0,\s*229,\s*255/.test(stroke), `stroke=${stroke}`);
    } else {
      check("O5 spend sparkline (n/a — no ≥2-point series)", true, "skipped");
    }

    // ---- O6: no horizontal overflow @412 ----
    await page.setViewportSize({ width: 412, height: 900 });
    await page.waitForTimeout(500);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("O6 no horizontal overflow @412", noOverflow);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- O0: zero live writes (read-only surface) ----
    check("O0 ZERO live writes (read-only overview)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));

    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("O7 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`live writes observed: ${writes.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}

main();
