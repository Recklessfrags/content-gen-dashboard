#!/usr/bin/env node
// Bespoke ratify — Character bench SUB-LANE 1: Aurora "Characters" read surface (?hub=characters).
// Live DB truth (verified 2026-07-04): characters == 3 rows — "Fine Print", "Grandma Pearl",
// "Mad Dog McGrath"; ALL voice-cast (voice_id set → isCast=true); NONE visually-cast
// (reference_image_url null → isVisuallyCast=false); no persisted draft rows.
// Read-only surface: zero live writes expected (no intercept needed — nothing writes).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4315", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const LIVE_CODENAMES = ["Fine Print", "Grandma Pearl", "Mad Dog McGrath"];

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

let liveWrites = 0;
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const method = request.method();
    // Read-only surface: flag any write verb as a violation, but still forward reads.
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && /\/rest\/v1\//.test(request.url())) {
      liveWrites += 1;
      console.error(`UNEXPECTED WRITE ${method} ${request.url()}`);
    }
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers["content-length"];
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

// crude relative-luminance contrast from two "rgb(a)" strings composited on a base
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

async function benchLocator(page) {
  await page.goto(`${BASE}/?hub=characters`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  return page;
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

    // ---- B1: ?hub=characters renders the Aurora bench (not legacy, not redirected) ----
    await benchLocator(page);
    const url1 = new URL(page.url());
    check("BR-1a URL stays ?hub=characters (no redirect)", url1.searchParams.get("hub") === "characters", url1.search);
    const title = await page.locator("#characters-hub-title").textContent().catch(() => "");
    check("BR-1b Aurora Characters bench heading renders", /Characters/.test(title || ""), `"${title}"`);
    const legacy = await page.locator(".cr .rail").count();
    check("BR-1c legacy .cr shell NOT rendered on the bench", legacy === 0, `railNodes=${legacy}`);
    const inShell = await page.locator(".aurora-app").count();
    check("BR-1d rendered inside AuroraShell", inShell >= 1);

    // ---- B2: card count == live rows; codenames present; no phantom draft ----
    const cards = page.locator('.channels-grid[aria-label="Characters"] .channel-card[role="button"]');
    const cardCount = await cards.count();
    check("BR-2a card count == live characters (3)", cardCount === LIVE_CODENAMES.length, `cards=${cardCount}`);
    let codenamesOk = true;
    for (const cn of LIVE_CODENAMES) {
      const n = await page.locator('.channel-card', { hasText: cn }).count();
      if (n < 1) codenamesOk = false;
    }
    check("BR-2b all live codenames render as cards", codenamesOk, LIVE_CODENAMES.join(", "));
    const phantom = await page.locator('.channel-card', { hasText: /Untitled Character/i }).count();
    check("BR-2c no phantom 'Untitled Character' draft card", phantom === 0, `n=${phantom}`);

    // ---- B3: voice/visual status chips == isCast/isVisuallyCast truth ----
    const voiceCast = await page.getByText("Voice: Cast", { exact: true }).count();
    const voiceUncast = await page.getByText("Voice: Uncast", { exact: true }).count();
    const visualCast = await page.getByText("Visual: Cast", { exact: true }).count();
    const visualUncast = await page.getByText("Visual: Uncast", { exact: true }).count();
    check("BR-3a Voice chip == isCast truth (3 Cast, 0 Uncast)", voiceCast === 3 && voiceUncast === 0, `cast=${voiceCast} uncast=${voiceUncast}`);
    check("BR-3b Visual chip == isVisuallyCast truth (0 Cast, 3 Uncast)", visualCast === 0 && visualUncast === 3, `cast=${visualCast} uncast=${visualUncast}`);

    // ---- B7 (focus-visible + AA sample + responsive, dark & light) ----
    // focus-visible ring on a card (keyboard)
    await cards.first().focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab"); // land focus on first card via keyboard for :focus-visible
    const focusRing = await page.evaluate(() => {
      const el = document.querySelector('.channels-grid[aria-label="Characters"] .channel-card');
      if (!el) return null;
      el.focus();
      const cs = getComputedStyle(el);
      return { outline: cs.outlineStyle, width: cs.outlineWidth, box: cs.boxShadow };
    });
    check("BR-7a card exposes a focus indicator", !!focusRing && (focusRing.outline !== "none" || (focusRing.box && focusRing.box !== "none")), JSON.stringify(focusRing));

    // AA contrast sample of a status chip — composite the FULL translucent stack
    // (chip bg + any translucent ancestors) over the first fully-opaque ancestor,
    // then ratio the (opaque) text color against that effective background.
    async function chipContrast() {
      return page.evaluate(() => {
        const chip = document.querySelector('.channels-grid[aria-label="Characters"] .status-chip');
        if (!chip) return null;
        const theme = document.documentElement.getAttribute("data-theme") || "dark";
        const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
        const layers = [];
        let n = chip;
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
        return { color: getComputedStyle(chip).color, effBg: `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})` };
      });
    }
    const cDark = await chipContrast();
    if (cDark) {
      const effBg = parseRGB(cDark.effBg);
      const txt = comp(parseRGB(cDark.color), effBg);
      const rr = ratio(txt, effBg);
      check("BR-7b status chip text AA (dark, ratio>=4.5)", rr >= 4.5, `ratio=${rr.toFixed(2)} ${cDark.color} on ${cDark.effBg}`);
    } else check("BR-7b status chip text AA (dark)", false, "no chip");

    // no horizontal overflow at 1440 dark
    const noOverflow1440 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("BR-7c no horizontal overflow @1440 dark", noOverflow1440);

    // light theme — flip data-theme on the AuroraShell div (CSS keys off the attribute;
    // this element sits nearer the chip than <html>, so it is the one that wins)
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      const shell = document.querySelector("[data-aurora-shell]");
      if (shell) shell.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(400);
    const cLight = await chipContrast();
    if (cLight) {
      const effBg = parseRGB(cLight.effBg);
      const txt = comp(parseRGB(cLight.color), effBg);
      const rr = ratio(txt, effBg);
      check("BR-7d status chip text AA (light, ratio>=4.5)", rr >= 4.5, `ratio=${rr.toFixed(2)} ${cLight.color} on ${cLight.effBg}`);
    } else check("BR-7d status chip text AA (light)", false, "no chip");

    // 412px mobile — cards render, no horizontal overflow
    await page.setViewportSize({ width: 412, height: 900 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      const shell = document.querySelector("[data-aurora-shell]");
      if (shell) shell.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(500);
    const cards412 = await page.locator('.channels-grid[aria-label="Characters"] .channel-card').count();
    const noOverflow412 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("BR-7e cards render + no h-overflow @412", cards412 === LIVE_CODENAMES.length && noOverflow412, `cards=${cards412} noOverflow=${noOverflow412}`);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- B5: entry button from Channels hub + Back ----
    await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const entry = page.getByRole("button", { name: /Characters/ });
    check("BR-5a 'Characters ->' entry button present on Channels hub", await entry.count() >= 1);
    await entry.first().click();
    await page.waitForTimeout(1000);
    check("BR-5b entry button navigates to ?hub=characters", new URL(page.url()).searchParams.get("hub") === "characters", page.url());
    await page.getByRole("button", { name: /Back to Channels/i }).click();
    await page.waitForTimeout(1000);
    check("BR-5c 'Back to Channels' returns to ?hub=channels", new URL(page.url()).searchParams.get("hub") === "channels", page.url());

    // ---- B4: card activation (click) opens legacy roster with THAT character selected ----
    await benchLocator(page);
    await page.locator('.channel-card', { hasText: "Fine Print" }).first().click();
    await page.waitForTimeout(1500);
    const railAfterClick = await page.locator(".cr .rail").count();
    const activePcard = await page.locator(".roster .pcard.on .codename").textContent().catch(() => "");
    check("BR-4a click opens legacy roster", railAfterClick >= 1, `railNodes=${railAfterClick}`);
    check("BR-4b roster opens on the CLICKED character (Fine Print)", /Fine Print/.test(activePcard || ""), `active="${activePcard}"`);

    // keyboard activation (Enter) on a different card
    await benchLocator(page);
    const target = page.locator('.channel-card', { hasText: "Grandma Pearl" }).first();
    await target.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const activePcard2 = await page.locator(".roster .pcard.on .codename").textContent().catch(() => "");
    check("BR-4c Enter-key activation opens the focused character (Grandma Pearl)", /Grandma Pearl/.test(activePcard2 || ""), `active="${activePcard2}"`);

    // ---- read-only invariant ----
    check("BR-0 zero live writes (read-only surface)", liveWrites === 0, `writes=${liveWrites}`);

    // ---- console errors (env-only fonts CDN / login abort excluded) ----
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("BR-9 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
