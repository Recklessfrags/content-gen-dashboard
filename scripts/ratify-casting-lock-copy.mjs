#!/usr/bin/env node
// Bespoke ratify — P0 copy: casting lock consequence (CastingStudioPanel).
// COPY + CSS only. The lock dialog itself is money-gated (it only opens once an
// audition candidate exists in the bracket, which requires PAID voice generation),
// so we do NOT open it live — that would incur cost and risk a real write. Instead:
//   Runtime (safe, read-only): open the Casting Studio for a cast character, verify
//     the panel renders, the "Currently cast" note carries the new plain-English
//     consequence copy, ZERO live writes, no app console errors.
//   Built bundle (deterministic): assert the shipped client chunks contain the new
//     lock-dialog copy and NO longer contain the old jargon / raw generation tokens.
// Live DB truth (2026-07-05): "Fine Print" is cast (voice_id not null).
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "4327", 10);
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;

const NEW_STRINGS = ["Cast this voice?", "Cast & lock voice", "This saves the voice", "Voice settings", "permanently deleted"];
const OLD_STRINGS = ["CONFIRM AUDITIONED WINNER", "AUDITION SCRIPT", "CONFIRM LOCK", "model_id: ", "guidance_scale: "];

function loadDotEnvLocal() {
  const envPath = join(ROOT, ".env.local"); const loaded = {};
  if (!existsSync(envPath)) return loaded;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (!m) continue;
    let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    loaded[m[1]] = v;
  }
  return loaded;
}
const results = [];
function check(name, pass, detail = "") { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); }

function readChunks() {
  const dir = join(ROOT, ".next/static/chunks");
  const out = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".js")) out.push(readFileSync(p, "utf8")); } };
  walk(dir);
  return out.join("\n");
}

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

async function main() {
  // ---- Built-bundle assertions (deterministic, no network) ----
  const bundle = readChunks();
  const missingNew = NEW_STRINGS.filter((s) => !bundle.includes(s));
  const leakedOld = OLD_STRINGS.filter((s) => bundle.includes(s));
  check("B1 bundle ships new lock copy", missingNew.length === 0, `missing=${JSON.stringify(missingNew)}`);
  check("B2 bundle free of old jargon / raw generation tokens", leakedOld.length === 0, `leaked=${JSON.stringify(leakedOld)}`);

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
    // open the cast character's editor, then the Casting Studio
    await page.goto(`${BASE}/?hub=characters`, { waitUntil: "networkidle" }); await page.waitForTimeout(1600);
    await page.locator(".channel-card", { hasText: "Fine Print" }).first().click(); await page.waitForTimeout(1400);
    await page.getByRole("button", { name: /Casting Studio/i }).click(); await page.waitForTimeout(1600);

    const panel = page.locator(".casting-panel, .casting-inline").first();
    check("R1 casting studio panel renders", (await panel.count()) > 0);
    const note = (await panel.locator(".chip", { hasText: /Currently cast/i }).first().textContent().catch(() => "")) || "";
    check(
      "R2 'Currently cast' note carries new consequence copy",
      /Currently cast/.test(note) && /permanently deleted/.test(note) && !/live locked voice/.test(note) && !/Locking a new winner/.test(note),
      note.trim().slice(0, 110),
    );

    check("R3 ZERO live writes (read-only casting-studio open)", writes.length === 0, JSON.stringify(writes.slice(0, 3)));
    const appErrors = consoleErrors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_CERT_AUTHORITY_INVALID|Failed to load resource.*login|net::ERR_ABORTED.*auth/i.test(e));
    check("R4 no app-level console errors", appErrors.length === 0, appErrors.slice(0, 3).join(" | "));
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
