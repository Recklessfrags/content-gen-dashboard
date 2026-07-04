#!/usr/bin/env node
// Non-destructive full UI/UX audit crawler. Logs in with QA creds, then drives every
// Aurora + legacy surface at desktop (1440) and mobile (412) widths, capturing full-page
// screenshots + programmatic checks. The Supabase bridge FULFILLS every write (REST
// POST/PATCH/PUT/DELETE, edge functions, storage uploads) with a synthetic success so the
// UI proceeds through save/lock/delete flows but NOTHING is ever persisted — zero changes
// to real channels/characters.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.AUDIT_PORT || "4319", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = join(ROOT, "scratchpad-audit");
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const FAKE_AUDIO = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA";

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
const dot = loadDotEnvLocal();
const CREDS = { email: EMAIL || dot.RATIFY_EMAIL, password: PASSWORD || dot.RATIFY_PASSWORD };

const writeLog = [];
async function installBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (/\/functions\/v1\/casting-proxy/.test(url)) {
      let body = null; try { body = JSON.parse(request.postData() || "null"); } catch {}
      writeLog.push({ kind: "edge:casting-proxy", action: body?.action });
      let payload = { error: "audit-intercepted" };
      if (body?.action === "design") payload = { previews: [{ generated_voice_id: "audit_v1", audio_base_64: FAKE_AUDIO, media_type: "audio/mpeg" }], seed: 1 };
      else if (body?.action === "create") payload = { voice_id: "audit_created" };
      else if (body?.action === "tts") payload = { audio_base_64: FAKE_AUDIO, media_type: "audio/mpeg" };
      await route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      return;
    }
    if (/\/functions\/v1\//.test(url)) { // any other edge function
      writeLog.push({ kind: "edge:other", url });
      await route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: "{}" });
      return;
    }
    // storage uploads / writes
    if (/\/storage\/v1\//.test(url) && method !== "GET" && method !== "HEAD") {
      writeLog.push({ kind: "storage:write", method, url });
      await route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ Key: "audit/fake" }) });
      return;
    }
    // REST writes → synthetic success, zero persistence
    if (/\/rest\/v1\//.test(url) && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
      let body = null; try { body = JSON.parse(request.postData() || "null"); } catch {}
      const table = (url.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
      writeLog.push({ kind: "rest:write", method, table });
      await route.fulfill({ status: 200, headers: { "content-type": "application/json", "content-range": "0-0/*" }, body: "[]" });
      return;
    }
    // reads pass through
    const headers = { ...request.headers() };
    delete headers.host; delete headers["content-length"];
    const reqBody = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);
    try {
      const response = await fetch(url, { method, headers, body: reqBody, redirect: "manual" });
      const rh = {};
      response.headers.forEach((value, k) => { if (!["content-encoding", "content-length", "transfer-encoding"].includes(k)) rh[k] = value; });
      const buf = Buffer.from(await response.arrayBuffer());
      await route.fulfill({ status: response.status, headers: rh, body: buf });
    } catch (e) { await route.abort(); }
  });
}

let server;
async function startServer(env) {
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/login`, { redirect: "manual" }); if (r.status > 0) return; } catch {} await sleep(1000); }
  throw new Error("server did not start");
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[type=email]", CREDS.email);
  await page.fill("input[type=password]", CREDS.password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 45000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  if (new URL(page.url()).pathname.endsWith("/login")) throw new Error("login-failed");
}

const CHECK_JS = `(() => {
  const vw = window.innerWidth;
  const overflow = document.documentElement.scrollWidth - vw;
  // interactive tap targets under 40px (mobile concern)
  const interactives = Array.from(document.querySelectorAll('button,a,input,select,textarea,[role=tab],[role=button]'))
    .filter(el => { const s = getComputedStyle(el); return s.display!=='none' && s.visibility!=='hidden' && el.getClientRects().length; });
  const small = interactives.filter(el => { const r = el.getBoundingClientRect(); return (r.width>0&&r.height>0) && (r.height < 36 || r.width < 24); })
    .slice(0,12).map(el => ({ t: (el.innerText||el.getAttribute('aria-label')||el.tagName).slice(0,24).replace(/\\n/g,' '), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
  // contrast sample: headings, .text-body, buttons
  const parse = (c)=>{const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(n=>parseFloat(n.trim()));return {r:p[0],g:p[1],b:p[2],a:p[3]??1};};
  const lin=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
  const L=(c)=>0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);
  const effBg=(el)=>{let n=el;while(n){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0)return c;n=n.parentElement;}return {r:255,g:255,b:255,a:1};};
  const ratio=(el)=>{const fg=parse(getComputedStyle(el).color);const bg=effBg(el);if(!fg)return 21;const l1=L(fg),l2=L(bg);return Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100;};
  const sample=Array.from(document.querySelectorAll('h1,h2,h3,.text-body,.text-mono,.btn,.badge,.eyebrow,p,label'))
    .filter(el=>{const s=getComputedStyle(el);return s.display!=='none'&&el.getClientRects().length&&(el.innerText||'').trim().length>1;})
    .slice(0,60);
  const lowContrast=[];
  for(const el of sample){const r=ratio(el);const fs=parseFloat(getComputedStyle(el).fontSize);const bold=parseInt(getComputedStyle(el).fontWeight)>=700;const large=fs>=24||(fs>=18.66&&bold);const floor=large?3:4.5;if(r<floor)lowContrast.push({t:(el.innerText||'').trim().slice(0,30).replace(/\\n/g,' '),ratio:r,fs:Math.round(fs),floor});}
  return { vw, overflow, smallCount: small.length, small, lowContrast: lowContrast.slice(0,10) };
})()`;

async function main() {
  if (!CREDS.email || !CREDS.password) throw new Error("creds missing");
  mkdirSync(OUT, { recursive: true });
  await startServer({ NEXT_PUBLIC_SUPABASE_URL: dot.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: dot.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const report = [];

  const viewports = [ { name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 412, height: 915 } ];
  const routes = [
    { id: "login", url: `${BASE}/login`, noauth: true },
    { id: "hub-channels", url: `${BASE}/?hub=channels` },
    { id: "hub-actions", url: `${BASE}/?hub=actions` },
    { id: "hub-overview", url: `${BASE}/?hub=overview` },
    { id: "ws-production", url: `${BASE}/?channel=default&tab=production` },
    { id: "ws-character", url: `${BASE}/?channel=default&tab=character` },
    { id: "ws-guidelines", url: `${BASE}/?channel=default&tab=guidelines` },
    { id: "ws-cost", url: `${BASE}/?channel=default&tab=cost` },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    await installBridge(context);
    const page = await context.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() !== "error") return; const t = m.text(); if (/fonts\.googleapis|ERR_CONNECTION_RESET|Failed to load resource|status of 4|status of 5/.test(t)) return; errs.push(t.slice(0, 160)); });
    page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 160)));

    let loggedIn = false;
    for (const r of routes) {
      try {
        if (!r.noauth && !loggedIn) { await login(page); loggedIn = true; }
        const before = errs.length;
        await page.goto(r.url, { waitUntil: "networkidle" }).catch(() => {});
        await page.waitForTimeout(2200);
        const checks = await page.evaluate(CHECK_JS).catch((e) => ({ error: e.message }));
        const shot = join(OUT, `${r.id}.${vp.name}.png`);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
        report.push({ id: r.id, vp: vp.name, url: r.url, checks, newErrors: errs.slice(before) });
        console.log(`shot ${r.id} ${vp.name} — overflow=${checks.overflow} small=${checks.smallCount} lowContrast=${checks.lowContrast?.length ?? "?"} errs=${errs.length - before}`);
      } catch (e) { report.push({ id: r.id, vp: vp.name, error: e.message }); console.log(`FAIL ${r.id} ${vp.name}: ${e.message}`); }
    }

    // Legacy console flows (button-navigated). Best-effort.
    try {
      await page.goto(`${BASE}/?hub=channels`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const legacyBtn = page.getByRole("button", { name: /Legacy console/i }).first();
      if (await legacyBtn.count()) {
        await legacyBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: join(OUT, `legacy-roster.${vp.name}.png`), fullPage: true }).catch(() => {});
        const rosterChecks = await page.evaluate(CHECK_JS).catch(() => ({}));
        report.push({ id: "legacy-roster", vp: vp.name, checks: rosterChecks });
        console.log(`shot legacy-roster ${vp.name} — overflow=${rosterChecks.overflow} small=${rosterChecks.smallCount}`);
        // open the first character
        const card = page.locator(".char-card, .roster-card, [data-character-id], .cr-card").first();
        if (await card.count()) { await card.click().catch(() => {}); await page.waitForTimeout(1800);
          await page.screenshot({ path: join(OUT, `legacy-character.${vp.name}.png`), fullPage: true }).catch(() => {}); }
      }
    } catch (e) { console.log(`legacy flow ${vp.name}: ${e.message}`); }

    await context.close();
  }

  writeFileSync(join(OUT, "findings.json"), JSON.stringify({ writeLog, report }, null, 2));
  console.log(`\nwrites attempted (all intercepted, none persisted): ${writeLog.length}`);
  console.log(`report + screenshots in ${OUT}`);
  await browser.close().catch(() => {});
  server?.kill?.("SIGKILL");
}
main().catch((e) => { console.error(e); server?.kill?.("SIGKILL"); process.exit(1); });
