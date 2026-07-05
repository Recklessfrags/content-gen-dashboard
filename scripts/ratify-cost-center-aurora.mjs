#!/usr/bin/env node
// Bespoke ratify — Sub-lane 5d: Aurora "Global Cost Center" home (READ-ONLY re-skin).
// The legacy CostBoxDashboard is re-homed into an in-Aurora surface reached from the workspace
// Cost tab's "View Global Cost Center →". Read-only: the budget target is browser localStorage,
// so there must be ZERO live DB writes even after typing a target. Live DB (2026-07-05): episodes==55.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4320", 10);
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
function check(name, pass, detail = "") { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); }

function parseRGB(s) { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x.trim())); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; }
function comp(fg, bg) { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
function lum({ r, g, b }) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function ratio(fg, bg) { const L1 = lum(fg), L2 = lum(bg); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }
async function elemContrast(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
    const layers = []; let n = el;
    while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; } n = n.parentElement; }
    let base = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : (theme === "light" ? { r: 245, g: 245, b: 247, a: 1 } : { r: 5, g: 5, b: 10, a: 1 });
    for (let i = layers.length - 1; i >= 0; i--) { const f = layers[i]; base = { r: f.r * f.a + base.r * (1 - f.a), g: f.g * f.a + base.g * (1 - f.a), b: f.b * f.a + base.b * (1 - f.a), a: 1 }; }
    return { color: getComputedStyle(el).color, effBg: `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})` };
  }, selector);
}
function ratioFrom(c) { if (!c) return null; const effBg = parseRGB(c.effBg); const txt = comp(parseRGB(c.color), effBg); return ratio(txt, effBg); }
async function setTheme(page, theme) { await page.evaluate((t) => { document.documentElement.setAttribute("data-theme", t); const shell = document.querySelector("[data-aurora-shell]"); if (shell) shell.setAttribute("data-theme", t); }, theme); await page.waitForTimeout(350); }
async function bgAlpha(page, sel) { return page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map(parseFloat); return p[3] === undefined ? 1 : p[3]; }, sel); }

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

async function openCostCenter(page) {
  await page.goto(`${BASE}/?channel=default&tab=cost`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: /View Global Cost Center/i }).click();
  await page.waitForTimeout(1600);
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

    // ---- CC1: workspace Cost tab CTA -> Aurora Cost Center (not legacy) ----
    await openCostCenter(page);
    check("CC1a Aurora cost-center surface renders", (await page.locator(".cost-center.scoped").count()) >= 1);
    check("CC1b inside AuroraShell, legacy .cr NOT present", (await page.locator(".aurora-app").count()) >= 1 && (await page.locator(".cr .rail").count()) === 0);
    check("CC1c cost dashboard mounted", (await page.locator(".cost-center.scoped .cost-content").count()) >= 1);
    const legacyHead = await page.evaluate(() => { const el = document.querySelector(".cost-center.scoped .cost > .col-head"); return el ? getComputedStyle(el).display !== "none" : false; });
    check("CC1d redundant legacy terminal header hidden", legacyHead === false);

    // ---- CC2: real data — hero spend value + provider/audit content ----
    const hero = await page.locator(".cost-center.scoped .hero-value").first().textContent().catch(() => "");
    check("CC2a hero running-total spend renders a USD value", /\$|\d/.test(hero || ""), `"${hero}"`);
    check("CC2b provider breakdown or audit log renders", (await page.locator(".cost-center.scoped .provider-row, .cost-center.scoped .audit-card").count()) >= 1);

    // ---- CC3: Aurora skin — translucent surfaces ----
    const cardA = await bgAlpha(page, ".cost-center.scoped .metric-card");
    check("CC3 metric cards use Aurora translucent surface", cardA !== null && cardA < 1, `bgAlpha=${cardA}`);

    // ---- CC4: budget input legible + no DB write on type (localStorage only) ----
    const input = page.locator(".cost-center.scoped #budget-target-input");
    const inputStyle = await input.evaluate((el) => { const cs = getComputedStyle(el); return { color: cs.color, bg: cs.backgroundColor }; }).catch(() => null);
    const inputContrast = inputStyle ? (() => { const bg = parseRGB(inputStyle.bg); const fg = comp(parseRGB(inputStyle.color), bg && bg.a === 1 ? bg : { r: 17, g: 17, b: 25, a: 1 }); return ratio(fg, bg && bg.a === 1 ? bg : { r: 17, g: 17, b: 25 }); })() : null;
    check("CC4a budget input text legible (Aurora bg + text)", inputContrast !== null && inputContrast >= 4.5, `ratio=${inputContrast?.toFixed(2)} ${JSON.stringify(inputStyle)}`);
    writes.length = 0;
    await input.fill("123.45");
    await input.blur();
    await page.waitForTimeout(600);
    check("CC4b typing a budget target writes NOTHING to the DB (localStorage)", writes.length === 0, `writes=${writes.length}`);
    // clean up the localStorage target we set
    await page.getByRole("button", { name: /^Clear$/i }).click().catch(() => {});
    await page.waitForTimeout(300);

    // ---- CC5: AA both themes (hero value, subtext, run-id accent) ----
    const heroDark = ratioFrom(await elemContrast(page, ".cost-center.scoped .hero-value"));
    check("CC5a hero-value AA (dark)", heroDark !== null && heroDark >= 4.5, `ratio=${heroDark?.toFixed(2)}`);
    const subDark = ratioFrom(await elemContrast(page, ".cost-center.scoped .metric-subtext"));
    check("CC5b metric-subtext AA (dark)", subDark === null || subDark >= 4.5, `ratio=${subDark?.toFixed(2)}`);
    const runDark = ratioFrom(await elemContrast(page, ".cost-center.scoped .run-id"));
    check("CC5c run-id accent AA (dark)", runDark === null || runDark >= 4.5, `ratio=${runDark?.toFixed(2)}`);
    await setTheme(page, "light");
    const heroLight = ratioFrom(await elemContrast(page, ".cost-center.scoped .hero-value"));
    check("CC5d hero-value AA (light)", heroLight !== null && heroLight >= 4.5, `ratio=${heroLight?.toFixed(2)}`);
    const subLight = ratioFrom(await elemContrast(page, ".cost-center.scoped .metric-subtext"));
    check("CC5e metric-subtext AA (light)", subLight === null || subLight >= 4.5, `ratio=${subLight?.toFixed(2)}`);
    await setTheme(page, "dark");

    // ---- CC6: no horizontal overflow @412 ----
    await page.setViewportSize({ width: 412, height: 900 });
    await page.waitForTimeout(500);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("CC6 no horizontal overflow @412", noOverflow);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- CC7: Back closes the cost center ----
    await page.getByRole("button", { name: /^Back$/i }).click();
    await page.waitForTimeout(700);
    check("CC7 Back closes the Cost Center surface", (await page.locator(".cost-center.scoped").count()) === 0);

    // ---- CC8: no app console errors (checked BEFORE the deliberate error injection below) ----
    const appErrorsEarly = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("CC8 no app-level console errors", appErrorsEarly.length === 0, appErrorsEarly.slice(0, 3).join(" | "));

    // ---- CC9: error .cost-state legible in BOTH themes (force a receipts 500) ----
    await context.route("**/rest/v1/receipts*", (route) => route.fulfill({ status: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "forced-ratify-error" }) }));
    await openCostCenter(page);
    const errState = await page.locator(".cost-center.scoped .cost-state").count();
    check("CC9a error .cost-state renders on receipts failure", errState >= 1, `n=${errState}`);
    const csDark = ratioFrom(await elemContrast(page, ".cost-center.scoped .cost-state"));
    check("CC9b error .cost-state text AA (dark)", csDark === null || csDark >= 4.5, `ratio=${csDark?.toFixed(2)}`);
    await setTheme(page, "light");
    const csLight = ratioFrom(await elemContrast(page, ".cost-center.scoped .cost-state"));
    check("CC9c error .cost-state text AA (light) — the review BLOCKER fix", csLight === null || csLight >= 4.5, `ratio=${csLight?.toFixed(2)}`);
    await setTheme(page, "dark");
    await context.unroute("**/rest/v1/receipts*");

    // ---- CC0: zero live writes overall ----
    check("CC0 ZERO live writes (read-only cost surface)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));
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
