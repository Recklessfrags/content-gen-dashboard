#!/usr/bin/env node
// Bespoke ratify — Character bench SUB-LANE 3: Aurora re-skin of History / Compare / Restore.
// CHROME-ONLY change (aurora.css). Verifies the three overlays render Aurora-skinned inside the
// scoped bench, AA both themes, scoping (legacy .cr untouched), reduced-motion, and ZERO live writes
// (the Supabase bridge intercept-and-aborts any characters / character_bible_revisions write — Restore
// only loads the revision into the editor buffer; we never Save, so nothing should ever be attempted).
// Live DB truth (2026-07-05): characters == 3; Fine Print carries 1 character_bible_revisions row.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4317", 10);
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

// ---- AA helpers (composite a translucent stack over the first opaque ancestor) ----
function parseRGB(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
}
function comp(fg, bg) {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
function lum({ r, g, b }) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bg) {
  const L1 = lum(fg), L2 = lum(bg);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// Composite the FULL translucent stack of an element's text-on-bg, returning {color, effBg}.
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
    for (let i = layers.length - 1; i >= 0; i--) {
      const f = layers[i];
      base = { r: f.r * f.a + base.r * (1 - f.a), g: f.g * f.a + base.g * (1 - f.a), b: f.b * f.a + base.b * (1 - f.a), a: 1 };
    }
    return { color: getComputedStyle(el).color, effBg: `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})` };
  }, selector);
}
function ratioFrom(c) {
  if (!c) return null;
  const effBg = parseRGB(c.effBg);
  const txt = comp(parseRGB(c.color), effBg);
  return ratio(txt, effBg);
}
async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    const shell = document.querySelector("[data-aurora-shell]");
    if (shell) shell.setAttribute("data-theme", t);
  }, theme);
  await page.waitForTimeout(350);
}

// ---- Supabase bridge: intercept-and-abort ALL character writes => ZERO live writes ----
const writes = { characters: [], revisions: [], other: [] };
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (isWrite && /\/rest\/v1\/characters(\?|$)/.test(url)) {
      writes.characters.push({ method, url, body: request.postData() });
      await route.fulfill({ status: 200, headers: { "content-type": "application/json", "content-range": "0-0/1" }, body: "[]" });
      return;
    }
    if (isWrite && /\/rest\/v1\/character_bible_revisions(\?|$)/.test(url)) {
      writes.revisions.push({ method, url, body: request.postData() });
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }
    if (isWrite && /\/rest\/v1\//.test(url)) writes.other.push({ method, url });
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers["content-length"];
    const body = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(url, { method, headers, body, redirect: "manual" });
      const rh = {};
      response.headers.forEach((value, key) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) rh[key] = value;
      });
      await route.fulfill({ status: response.status, headers: rh, body: Buffer.from(await response.arrayBuffer()) });
    } catch (error) {
      console.error(`bridge failed ${url}: ${error.message}`);
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

async function openEditor(page, codename) {
  await page.goto(`${BASE}/?hub=characters`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.locator(".channel-card", { hasText: codename }).first().click();
  await page.waitForTimeout(1200);
}
async function openHistory(page) {
  await page.locator(".characters-bench.scoped .history-trigger").first().click();
  await page.waitForTimeout(1200);
}

// blur present on the frosted backdrop layer
async function backdropBlur(page, layerSel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return cs.backdropFilter || cs.webkitBackdropFilter || "none";
  }, layerSel);
}
// computed background alpha of an element (Aurora surfaces are translucent < 1; legacy --ink is solid = 1)
async function bgAlpha(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map(parseFloat);
    return p[3] === undefined ? 1 : p[3];
  }, sel);
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

    // ---- H1: History drawer opens Aurora-skinned inside the scoped bench (not legacy) ----
    await openEditor(page, "Fine Print");
    check("H1a Aurora editor renders (.characters-bench.scoped)", (await page.locator(".characters-bench.scoped .dossier").count()) >= 1);
    check("H1b legacy .cr shell NOT rendered", (await page.locator(".cr .rail").count()) === 0);
    await openHistory(page);
    const drawer = page.locator(".characters-bench.scoped .history-drawer");
    check("H1c History drawer renders inside the scoped Aurora bench", (await drawer.count()) >= 1);
    const hlBlur = await backdropBlur(page, ".characters-bench.scoped .history-layer");
    check("H1d history-layer has frosted Aurora backdrop (blur)", !!hlBlur && /blur/.test(hlBlur), `backdrop-filter="${hlBlur}"`);
    const drawerA = await bgAlpha(page, ".characters-bench.scoped .history-drawer");
    check("H1e drawer uses Aurora translucent surface (not legacy solid --ink)", drawerA !== null && drawerA < 1, `bgAlpha=${drawerA}`);
    // heading is sans (no terminal uppercase transform)
    const headTransform = await page.evaluate(() => {
      const h = document.querySelector(".characters-bench.scoped .history-head h2");
      return h ? getComputedStyle(h).textTransform : null;
    });
    check("H1f history heading de-militarised (text-transform none)", headTransform === "none", `textTransform=${headTransform}`);

    // ---- H2: revision card + latest badge; AA of latest badge (dark) ----
    check("H2a revision card renders (Fine Print has 1 revision)", (await page.locator(".characters-bench.scoped .revision-card").count()) >= 1);
    check("H2b latest badge present", (await page.locator(".characters-bench.scoped .chip.latest-badge").count()) >= 1);
    const badgeDark = ratioFrom(await elemContrast(page, ".characters-bench.scoped .chip.latest-badge"));
    check("H2c latest-badge AA (dark, >=4.5)", badgeDark !== null && badgeDark >= 4.5, `ratio=${badgeDark?.toFixed(2)}`);
    const bodyDark = ratioFrom(await elemContrast(page, ".characters-bench.scoped .revision-diff"));
    check("H2d revision body text AA (dark, >=4.5)", bodyDark !== null && bodyDark >= 4.5, `ratio=${bodyDark?.toFixed(2)}`);

    // ---- H3: light-theme AA (flip data-theme on the shell) ----
    await setTheme(page, "light");
    const badgeLight = ratioFrom(await elemContrast(page, ".characters-bench.scoped .chip.latest-badge"));
    check("H3a latest-badge AA (light, >=4.5)", badgeLight !== null && badgeLight >= 4.5, `ratio=${badgeLight?.toFixed(2)}`);
    const bodyLight = ratioFrom(await elemContrast(page, ".characters-bench.scoped .revision-diff"));
    check("H3b revision body text AA (light, >=4.5)", bodyLight !== null && bodyLight >= 4.5, `ratio=${bodyLight?.toFixed(2)}`);
    await setTheme(page, "dark");

    // ---- H4: Compare dialog opens Aurora-skinned; diff renders ----
    // the Compare button's accessible name is its aria-label ("Compare current bible to revision from …")
    await page.locator(".characters-bench.scoped .revision-card").getByRole("button", { name: /Compare current bible/i }).first().click();
    await page.waitForTimeout(1000);
    const compare = page.locator(".characters-bench.scoped .compare-dialog");
    check("H4a Compare dialog renders inside the scoped bench", (await compare.count()) >= 1);
    const cmpBlur = await backdropBlur(page, ".characters-bench.scoped .compare-layer");
    check("H4b compare-layer has frosted Aurora backdrop (blur)", !!cmpBlur && /blur/.test(cmpBlur), `backdrop-filter="${cmpBlur}"`);
    const cmpA = await bgAlpha(page, ".characters-bench.scoped .compare-dialog");
    check("H4c compare dialog uses Aurora translucent surface", cmpA !== null && cmpA < 1, `bgAlpha=${cmpA}`);
    check("H4d compare fields render", (await page.locator(".characters-bench.scoped .compare-field").count()) >= 1);
    // back to history
    await page.getByRole("button", { name: /BACK TO HISTORY/i }).click();
    await page.waitForTimeout(700);

    // ---- H5: Restore confirm opens Aurora-skinned; Cancel (no write) ----
    await page.locator(".characters-bench.scoped .revision-card").getByRole("button", { name: /^Restore$/i }).first().click();
    await page.waitForTimeout(800);
    const restore = page.locator(".characters-bench.scoped .restore-dialog");
    check("H5a Restore confirm renders inside the scoped bench", (await restore.count()) >= 1);
    const rA = await bgAlpha(page, ".characters-bench.scoped .restore-dialog");
    check("H5b restore dialog uses Aurora translucent surface", rA !== null && rA < 1, `bgAlpha=${rA}`);
    await page.getByRole("button", { name: /^Cancel$/i }).click();
    await page.waitForTimeout(500);

    // ---- H6: no horizontal overflow @412 with the drawer open ----
    await page.setViewportSize({ width: 412, height: 900 });
    await page.waitForTimeout(500);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("H6 no horizontal overflow @412 (history drawer open)", noOverflow);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- H7: reduced-motion zeroes the drawer entrance animation ----
    await page.emulateMedia({ reducedMotion: "reduce" });
    // close + reopen history so the animation rule is re-evaluated under reduced-motion
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await openHistory(page);
    const anim = await page.evaluate(() => {
      const el = document.querySelector(".characters-bench.scoped .history-drawer");
      return el ? getComputedStyle(el).animationName : null;
    });
    check("H7 reduced-motion => drawer animation none", anim === "none", `animationName=${anim}`);
    await page.emulateMedia({ reducedMotion: null });

    // ---- H0: ZERO live writes (nothing forwarded, nothing even attempted — we never Saved) ----
    check("H0a zero characters writes attempted (no Save)", writes.characters.length === 0, `n=${writes.characters.length}`);
    check("H0b zero revisions writes attempted", writes.revisions.length === 0, `n=${writes.revisions.length}`);
    check("H0c ZERO other live rest writes leaked", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));

    // ---- console errors (env-only noise excluded) ----
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("H8 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
  } catch (err) {
    check("RATIFY-RAN", false, err.message);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} gates PASS ====`);
  console.log(`writes intercepted: characters=${writes.characters.length} revisions=${writes.revisions.length} other(forwarded)=${writes.other.length}`);
  if (failed.length) { console.log("FAILURES:"); failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); process.exit(1); }
}

main();
