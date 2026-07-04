#!/usr/bin/env node
// Bespoke ratify — Character bench SUB-LANE 2: Aurora dossier editor re-home (WRITE-PATH).
// Intercept-and-abort ALL character writes (characters UPDATE/INSERT + character_bible_revisions INSERT):
// they are captured + fulfilled synthetically, NEVER forwarded to Supabase => ZERO live writes.
// Live DB truth (2026-07-04): characters == 3 (Fine Print / Grandma Pearl / Mad Dog McGrath).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4316", 10);
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

const writes = { characters: [], revisions: [], other: [] };
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    // Intercept-and-abort character writes: capture + fulfill synthetic, DO NOT forward.
    if (isWrite && /\/rest\/v1\/characters(\?|$)/.test(url)) {
      writes.characters.push({ method, url, body: request.postData() });
      // draft-persist uses POST + Prefer: return=representation + .single(): return a synthetic row.
      const wantsRow = (request.headers()["prefer"] || "").includes("representation") || method === "POST";
      const synthetic = {
        id: "00000000-0000-0000-0000-0000000000ff", owner: "00000000-0000-0000-0000-000000000000",
        codename: "RATIFY DRAFT", concept: "", status: "draft", bible: {}, created_at: "2026-07-04T00:00:00Z",
        updated_at: "2026-07-04T00:00:00Z", voice_id: null, voice_settings: null, voice_recipe: null,
        reference_image_url: null, visual_style: null,
      };
      await route.fulfill({
        status: method === "POST" ? 201 : 200,
        headers: { "content-type": "application/json", "content-range": "0-0/1" },
        body: wantsRow ? JSON.stringify([synthetic]) : "",
      });
      return;
    }
    if (isWrite && /\/rest\/v1\/character_bible_revisions(\?|$)/.test(url)) {
      writes.revisions.push({ method, url, body: request.postData() });
      await route.fulfill({ status: 201, headers: { "content-type": "application/json" }, body: "[]" });
      return;
    }
    if (isWrite && /\/rest\/v1\//.test(url)) writes.other.push({ method, url });
    // Forward everything else (reads + non-character writes we still want to observe/flag).
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

async function gotoBench(page) {
  await page.goto(`${BASE}/?hub=characters`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
}
async function openEditor(page, codename) {
  await gotoBench(page);
  await page.locator(".channel-card", { hasText: codename }).first().click();
  await page.waitForTimeout(1200);
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

    // ---- C1: bench card -> Aurora editor inside AuroraShell (not legacy), fields populated ----
    await openEditor(page, "Fine Print");
    const bench = page.locator(".characters-bench.scoped");
    check("C1a Aurora editor renders (.characters-bench.scoped)", await bench.count() >= 1);
    check("C1b legacy .cr shell NOT rendered", (await page.locator(".cr .rail").count()) === 0);
    const dossier = page.locator(".characters-bench.scoped .dossier");
    check("C1c dossier section present", await dossier.count() >= 1);
    const codenameVal = await page.locator(".characters-bench.scoped .sheet input").first().inputValue().catch(() => "");
    check("C1d editor loaded the clicked character (Fine Print)", /Fine Print/.test(codenameVal), `codename="${codenameVal}"`);
    const bc = await page.locator(".characters-bench.scoped .breadcrumb").textContent().catch(() => "");
    check("C1e breadcrumb shows Characters / <codename>", /Characters/.test(bc) && /Fine Print/.test(bc), `"${bc}"`);

    // ---- C2: edit a field -> Save -> exactly ONE characters PATCH + ONE revisions INSERT, zero forwarded ----
    writes.characters.length = 0; writes.revisions.length = 0; writes.other.length = 0;
    const voice = page.locator(".characters-bench.scoped .sheet textarea").first();
    await voice.click();
    await voice.press("End");
    await voice.type(" [ratify-edit]");
    await page.waitForTimeout(300);
    const saveBtn = page.getByRole("button", { name: /Save dossier/i });
    check("C2a Save dossier enabled after edit (dirty)", await saveBtn.isEnabled().catch(() => false));
    await saveBtn.click();
    await page.waitForTimeout(1500);
    check("C2b exactly ONE characters write intercepted", writes.characters.length === 1, `n=${writes.characters.length} methods=${writes.characters.map((w) => w.method)}`);
    check("C2c exactly ONE character_bible_revisions write intercepted", writes.revisions.length === 1, `n=${writes.revisions.length}`);
    const payloadOk = writes.characters[0] && /ratify-edit/.test(writes.characters[0].body || "");
    check("C2d characters write payload carries the edited bible", !!payloadOk, (writes.characters[0]?.body || "").slice(0, 120));
    check("C2e no OTHER rest writes leaked", writes.other.length === 0, JSON.stringify(writes.other.slice(0, 3)));

    // ---- C4: dirty-guard fires exactly once on back-to-grid; KEEP EDITING preserves ----
    await openEditor(page, "Grandma Pearl");
    const ta = page.locator(".characters-bench.scoped .sheet textarea").first();
    await ta.click(); await ta.press("End"); await ta.type(" [dirty]");
    await page.waitForTimeout(200);
    await page.locator(".characters-bench.scoped .breadcrumb .breadcrumb-button").click();
    await page.waitForTimeout(500);
    const dlg = page.getByRole("alertdialog");
    check("C4a dirty back-to-grid raises DiscardChangesDialog", await dlg.count() >= 1);
    await page.getByRole("button", { name: /KEEP EDITING/i }).click();
    await page.waitForTimeout(400);
    check("C4b KEEP EDITING stays in editor + preserves buffer", (await page.locator(".characters-bench.scoped .dossier").count()) >= 1 && /\[dirty\]/.test(await ta.inputValue().catch(() => "")));
    await page.locator(".characters-bench.scoped .breadcrumb .breadcrumb-button").click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /DISCARD CHANGES/i }).click();
    await page.waitForTimeout(800);
    check("C4c DISCARD returns to the grid", (await page.locator('.channels-grid[aria-label="Characters"]').count()) >= 1);

    // ---- C3: "+ New character" -> in-memory draft editor, NO characters write before save ----
    writes.characters.length = 0;
    await gotoBench(page);
    await page.getByRole("button", { name: /New character/i }).first().click();
    await page.waitForTimeout(900);
    check("C3a New character opens the editor", (await page.locator(".characters-bench.scoped .dossier").count()) >= 1);
    check("C3b no characters write before first save (in-memory draft)", writes.characters.length === 0, `n=${writes.characters.length}`);
    // discard the draft: back to grid (no dirty since empty) — leave clean
    await page.locator(".characters-bench.scoped .breadcrumb .breadcrumb-button").click().catch(() => {});
    await page.waitForTimeout(500);

    // ---- C5 (B1 proof): Casting Studio + Visual Cast open on the Aurora editor ----
    await openEditor(page, "Fine Print");
    await page.getByRole("button", { name: /Casting Studio/i }).click();
    await page.waitForTimeout(900);
    const castingOpen = (await page.getByRole("dialog").count()) >= 1 || (await page.locator(".casting-modal, .casting").count()) >= 1;
    check("C5a Casting Studio opens on the Aurora editor (B1 fix)", castingOpen);
    // close (Escape) then Visual Cast
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    await page.getByRole("button", { name: /VISUAL CAST/i }).click();
    await page.waitForTimeout(900);
    const visualOpen = (await page.getByRole("dialog").count()) >= 1 || (await page.locator(".visual, .visual-identity").count()) >= 1;
    check("C5b Visual Cast opens on the Aurora editor (B1 fix)", visualOpen);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);

    // ---- C6 (B2 + re-point): Log an idea -> legacy wire; workspace Manage -> Aurora grid ----
    await openEditor(page, "Fine Print");
    await page.getByRole("button", { name: /Log an idea/i }).click();
    await page.waitForTimeout(1200);
    const wireLegacy = (await page.locator(".cr").count()) >= 1 && new URL(page.url()).searchParams.get("view") === "wire";
    check("C6a 'Log an idea ->' opens the legacy wire board for real (B2 fix)", wireLegacy, page.url());
    // workspace cast Character tab -> "Manage all characters ->" -> Aurora bench grid
    await page.goto(`${BASE}/?channel=default&tab=character`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const manage = page.getByRole("button", { name: /Manage all characters/i });
    if (await manage.count()) {
      await manage.first().click();
      await page.waitForTimeout(1000);
      check("C6b workspace 'Manage all characters ->' lands on the Aurora bench (not legacy)", new URL(page.url()).searchParams.get("hub") === "characters" && (await page.locator(".cr .rail").count()) === 0, page.url());
    } else check("C6b workspace 'Manage all characters ->' present", false, "button not found (cast state?)");

    // ---- C7 (B3 proof): savebar legible at 412px (opaque, not fixed with left:84px) + AA ----
    await openEditor(page, "Fine Print");
    await page.setViewportSize({ width: 412, height: 900 });
    await page.waitForTimeout(500);
    const sb = await page.evaluate(() => {
      const el = document.querySelector(".characters-bench.scoped .savebar");
      if (!el) return null;
      const cs = getComputedStyle(el);
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(",").map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
      return { position: cs.position, left: cs.left, bg: cs.backgroundColor, bgA: parse(cs.backgroundColor)?.a };
    });
    check("C7a savebar not fixed-with-rail-offset at 412 (B3 fix)", !!sb && sb.position !== "fixed", JSON.stringify(sb));
    check("C7b savebar has an opaque background at 412 (B3 fix)", !!sb && sb.bgA === 1, `bg=${sb?.bg}`);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check("C7c no horizontal overflow @412", noOverflow);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- CB4 (B4 regression proof): legacy roster "+ New character" draft SURVIVES ----
    writes.characters.length = 0;
    await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const legacyBtn = page.getByRole("button", { name: /Legacy console/i });
    if (await legacyBtn.count()) {
      await legacyBtn.first().click();
      await page.waitForTimeout(1500);
      const inLegacy = (await page.locator(".cr .rail").count()) >= 1;
      // legacy roster "+ New character" (aside addbtn or empty-state)
      const addNew = page.locator(".cr").getByRole("button", { name: /New character/i });
      if (inLegacy && (await addNew.count())) {
        await addNew.first().click();
        await page.waitForTimeout(1200);
        // the just-created draft must NOT vanish -> a dossier editor (not "No characters yet")
        const draftGone = (await page.locator(".cr").getByText(/No characters yet/i).count()) >= 1;
        const dossierUp = (await page.locator(".cr .dossier").count()) >= 1;
        check("CB4 legacy '+ New character' draft survives (not wiped by exit effects)", dossierUp && !draftGone, `dossier=${dossierUp} emptyState=${draftGone}`);
        check("CB4b legacy draft-create wrote nothing (in-memory)", writes.characters.length === 0, `n=${writes.characters.length}`);
      } else check("CB4 legacy '+ New character' reachable", false, `inLegacy=${inLegacy}`);
    } else check("CB4 Legacy console entry present on hub", false, "button not found");

    // ---- C0: zero live writes overall ----
    check("C0 ZERO live character writes forwarded (all intercepted)", writes.other.length === 0);

    // ---- console errors (env-only fonts CDN / login abort excluded) ----
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("C8 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
