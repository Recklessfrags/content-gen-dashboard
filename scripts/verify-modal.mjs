// Runtime/mobile verification for modal overlays. See docs/process/ui-runtime-verification.md.
//
//   CSS-level (deterministic, no auth/egress needed):
//     BASE_URL=http://localhost:3000 node scripts/verify-modal.mjs --css
//   Full E2E (envs where the browser can reach Supabase):
//     BASE_URL=https://<host> PW_EMAIL=… PW_PASSWORD=… node scripts/verify-modal.mjs
//
// Chromium: `npx playwright install`, or set PW_EXEC to a chromium binary.
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const CSS_MODE = process.argv.includes("--css");
const remote = !BASE.includes("localhost") && !BASE.includes("127.0.0.1");
let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log("PASS: " + m); };
const bad = (m) => { failed++; console.log("FAIL: " + m); };

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PW_EXEC || undefined,
  proxy: remote && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  args: remote && process.env.HTTPS_PROXY ? ["--ignore-certificate-errors"] : [],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  deviceScaleFactor: 2, ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

async function assertModal() {
  const m = await page.evaluate(() => {
    const panel = document.querySelector(".casting-panel");
    const layer = panel?.closest(".history-layer");
    const ls = layer ? getComputedStyle(layer) : null;
    const r = panel?.getBoundingClientRect();
    const probe = document.elementFromPoint(195, 820);
    const alpha = (c) => { const n = (c.match(/[\d.]+/g) || []).map(Number); return n.length >= 4 ? n[3] > 0 : n.length === 3; };
    return {
      pos: ls?.position, pe: ls?.pointerEvents, bg: ls?.backgroundColor, scrim: ls ? alpha(ls.backgroundColor) : false,
      rect: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      vw: innerWidth, vh: innerHeight, inPanel: !!(panel && probe && panel.contains(probe)), tag: probe?.tagName,
    };
  });
  console.log("metrics:", JSON.stringify(m));
  m.pos === "fixed" ? ok("layer position:fixed") : bad(`layer position=${m.pos}`);
  m.pe !== "none" ? ok("layer captures pointer events") : bad("layer pointer-events:none");
  m.scrim ? ok(`dimming scrim (${m.bg})`) : bad(`no scrim (${m.bg})`);
  m.rect && m.rect.h >= m.vh - 4 && m.rect.y <= 2 && m.rect.w >= m.vw - 4
    ? ok("panel covers full mobile viewport") : bad(`panel ${JSON.stringify(m.rect)} vs ${m.vw}x${m.vh}`);
  m.inPanel ? ok("bottom tap lands inside panel (no tap-through)") : bad(`bottom tap hit <${m.tag}> outside panel`);
}

try {
  if (CSS_MODE) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
    await page.evaluate(() => {
      const layer = document.createElement("div");
      layer.className = "history-layer"; layer.setAttribute("role", "presentation");
      layer.innerHTML = '<aside class="drilldown-panel casting-panel" role="dialog" aria-modal="true">' +
        '<div class="detail-cap"><h2>Casting Studio</h2></div><div class="drilldown-content" style="height:200%">body</div></aside>';
      document.body.appendChild(layer);
    });
    await page.waitForTimeout(250);
    await assertModal();
  } else {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
    await page.fill('input[name="email"]', process.env.PW_EMAIL || "");
    await page.fill('input[name="password"]', process.env.PW_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45000 });
    await page.waitForFunction(() => !document.body.innerText.includes("LOADING FIELD MANUALS"), { timeout: 30000 });
    let cast = page.getByRole("button", { name: /Cast a voice|Casting Studio/i });
    if (!(await cast.count())) {                       // pick a character via the switcher chip
      await page.locator("button.chip").first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator(".roster-pick, [data-character], .roster button").first().click().catch(() => {});
      cast = page.getByRole("button", { name: /Cast a voice|Casting Studio/i });
    }
    await cast.first().click({ timeout: 15000 });
    await page.waitForSelector(".casting-panel", { timeout: 15000 });
    await assertModal();
  }
} catch (e) {
  bad("ERROR: " + e.message);
} finally {
  await browser.close();
}
console.log(`\n${failed === 0 ? "OK" : "FAILED"} — ${pass} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
