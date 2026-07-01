#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import net from "node:net";
import { chromium } from "playwright";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const PORT = Number.parseInt(process.env.RATIFY_PORT || "3100", 10);
const BASE = (process.env.RATIFY_BASE || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const EXTERNAL_BASE = Boolean(process.env.RATIFY_BASE);
const OUT_DIR = resolve(ROOT, process.env.RATIFY_OUT || "ratify-out");
const EMAIL = process.env.RATIFY_EMAIL;
const PASSWORD = process.env.RATIFY_PASSWORD;
const MIN_PCARDS = Number.parseInt(process.env.RATIFY_MIN_PCARDS || "1", 10);
const LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage"];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = {
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
};
const NAV_VIEWS = ["Channels", "The Wire", "Queue", "Runs", "Overview", "Cost"];
const MOBILE_DATA_VIEW = "The Wire";
const VIEW_READY_TEXT = {
  Roster: ["Roster", "No characters yet", "Comms down"],
  Channels: ["Channels", "No channels yet", "Channel profiles offline"],
  "The Wire": ["The Wire", "Wire unavailable", "The wire's quiet"],
  Queue: ["Queue", "Comms Down", "The queue is clear"],
  Runs: ["Runs", "Runs unavailable", "No runs yet"],
  Overview: ["Overview"],
  Cost: ["Cost", "Cost Box Unavailable", "No Episodes Yet", "No Receipts Logged"],
};

let serverProcess = null;
let uncaughtException = null;

function loadDotEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  const loaded = {};

  if (!existsSync(envPath)) return loaded;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    loaded[match[1]] = value;
  }

  return loaded;
}

function requireConfig(dotEnv) {
  const missing = [];

  if (!EMAIL) missing.push("RATIFY_EMAIL");
  if (!PASSWORD) missing.push("RATIFY_PASSWORD");
  if (!dotEnv.NEXT_PUBLIC_SUPABASE_URL) missing.push(".env.local:NEXT_PUBLIC_SUPABASE_URL");
  if (!dotEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push(".env.local:NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!EXTERNAL_BASE && (!Number.isInteger(PORT) || PORT <= 0)) {
    missing.push("RATIFY_PORT must be a positive integer");
  }
  if (!Number.isInteger(MIN_PCARDS) || MIN_PCARDS < 0) {
    missing.push("RATIFY_MIN_PCARDS must be a non-negative integer");
  }

  if (missing.length > 0) {
    throw new Error(`Missing/invalid ratify config: ${missing.join(", ")}`);
  }
}

function runChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: options.env || process.env,
    stdio: options.stdio || "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }

  return result;
}

async function isPortFree(port) {
  return await new Promise((resolvePort) => {
    const server = net.createServer();

    server.once("error", () => resolvePort(false));
    server.once("listening", () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function ensurePortFree(port) {
  spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
  await sleep(500);

  if (!(await isPortFree(port))) {
    throw new Error(`RATIFY_PORT ${port} is still occupied after fuser -k ${port}/tcp`);
  }
}

function cleanupSync(reason = "cleanup") {
  if (!serverProcess || EXTERNAL_BASE) return;
  const pid = serverProcess.pid;
  serverProcess = null;

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // The process group may already be gone.
  }

  spawnSync("fuser", ["-k", `${PORT}/tcp`], { stdio: "ignore" });

  if (reason !== "exit") {
    console.log(`ratify: server teardown complete (${reason})`);
  }
}

async function cleanup(reason = "finally") {
  cleanupSync(reason);
  await sleep(500);
  spawnSync("fuser", ["-k", `${PORT}/tcp`], { stdio: "ignore" });
}

function installTeardownHandlers() {
  process.on("exit", () => cleanupSync("exit"));
  process.on("SIGINT", () => {
    cleanupSync("SIGINT");
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanupSync("SIGTERM");
    process.exit(143);
  });
  process.on("uncaughtException", (error) => {
    uncaughtException = error;
    console.error(error);
    cleanupSync("uncaughtException");
    process.exit(1);
  });
}

async function waitForReady(base) {
  const deadline = Date.now() + 60_000;
  let lastError = null;

  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) {
      throw new Error(`next start exited before readiness with code ${serverProcess.exitCode}`);
    }

    try {
      const response = await fetch(`${base}/login`, { redirect: "manual" });
      if (response.status > 0 && response.status < 500) return;
    } catch (error) {
      lastError = error;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${base}/login (${lastError?.message || "no response"})`);
}

async function startServer(env) {
  if (EXTERNAL_BASE) {
    console.log(`ratify: using external server ${BASE}`);
    return;
  }

  await ensurePortFree(PORT);

  if (!existsSync(join(ROOT, ".next"))) {
    console.log("ratify: .next missing; running npm run build");
    runChecked("npm", ["run", "build"], { env });
  }

  console.log(`ratify: starting production server on ${BASE}`);
  serverProcess = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
    cwd: ROOT,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  serverProcess.unref();

  await waitForReady(BASE);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  } catch (error) {
    const executablePath = findChromiumExecutable();
    if (!executablePath) {
      throw new Error(
        `Playwright could not resolve Chromium and no fallback was found under PLAYWRIGHT_BROWSERS_PATH: ${error.message}`,
      );
    }

    console.log(`ratify: using Chromium fallback ${executablePath}`);
    return await chromium.launch({
      executablePath,
      headless: true,
      args: LAUNCH_ARGS,
    });
  }
}

function findChromiumExecutable() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return null;

  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(path);
      } else if (
        entry.isFile() &&
        (entry.name === "chrome" || entry.name === "chromium" || entry.name === "chromium-browser")
      ) {
        return path;
      }
    }
  }

  return null;
}

async function installSupabaseBridge(context) {
  await context.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers["content-length"];

    const method = request.method();
    const body = method === "GET" || method === "HEAD" ? undefined : (request.postData() ?? undefined);

    try {
      const response = await fetch(request.url(), {
        method,
        headers,
        body,
        redirect: "manual",
      });
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) {
          responseHeaders[key] = value;
        }
      });

      await route.fulfill({
        status: response.status,
        headers: responseHeaders,
        body: Buffer.from(await response.arrayBuffer()),
      });
    } catch (error) {
      console.error(`ratify: supabase bridge failed ${request.url()}: ${error.message}`);
      await route.abort();
    }
  });
}

async function newContext(browser, options = {}) {
  const context = await browser.newContext(options);
  await installSupabaseBridge(context);
  return context;
}

function attachPageDiagnostics(page) {
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));

  return diagnostics;
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2_500);

  if (new URL(page.url()).pathname.endsWith("/login")) {
    const alert = await page.locator("[role=alert]").first().textContent().catch(() => "");
    throw new Error(`login-failed${alert ? `: ${alert.trim()}` : ""}`);
  }
}

async function waitForControlRoom(page) {
  await page.locator("#control-room-primary-view-panel").waitFor({ state: "visible", timeout: 45_000 });
  await page.locator('[role="tab"]').filter({ hasText: "Roster" }).waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(750);
}

async function awaitView(page, label) {
  const readyText = VIEW_READY_TEXT[label] || [label];
  const readyPattern = new RegExp(`^(${readyText.map(escapeRegExp).join("|")})$`);
  await page.getByRole("heading", { name: readyPattern }).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(750);
}

async function clickView(page, label) {
  const tab = page.locator('[role="tab"]').filter({ hasText: label }).first();
  await tab.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForFunction(
    (name) =>
      Array.from(document.querySelectorAll('[role="tab"]')).some(
        (tabEl) => tabEl.textContent?.includes(name) && tabEl.getAttribute("aria-selected") === "true",
      ),
    label,
  );
  await awaitView(page, label);
}

function markDiagnostics(diagnostics) {
  return {
    consoleStart: diagnostics.consoleErrors.length,
    pageErrorStart: diagnostics.pageErrors.length,
  };
}

async function recordView(page, diagnostics, marker, name, screenshotName) {
  const screenshot = join(OUT_DIR, screenshotName);

  await page.screenshot({ path: screenshot, fullPage: true });

  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    pcardCount: document.querySelectorAll(".pcard").length,
  }));

  return {
    name,
    screenshot,
    overflow: metrics.overflow,
    scrollWidth: metrics.scrollWidth,
    clientWidth: metrics.clientWidth,
    pcardCount: metrics.pcardCount,
    consoleErrors: diagnostics.consoleErrors.slice(marker.consoleStart),
    pageErrors: diagnostics.pageErrors.slice(marker.pageErrorStart),
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slug(label) {
  return label.toLowerCase().replaceAll(" ", "-");
}

async function walkDesktop(browser) {
  const context = await newContext(browser, { viewport: DESKTOP });
  const page = await context.newPage();
  const diagnostics = attachPageDiagnostics(page);
  const views = [];

  try {
    const rosterMarker = markDiagnostics(diagnostics);
    await login(page);
    await waitForControlRoom(page);
    views.push(
      await recordView(page, diagnostics, rosterMarker, "desktop:roster", "desktop-roster.png"),
    );

    for (const label of NAV_VIEWS) {
      const marker = markDiagnostics(diagnostics);
      await clickView(page, label);
      views.push(
        await recordView(
          page,
          diagnostics,
          marker,
          `desktop:${slug(label)}`,
          `desktop-${slug(label)}.png`,
        ),
      );
    }
  } finally {
    await context.close();
  }

  return views;
}

async function walkMobile(browser) {
  const context = await newContext(browser, MOBILE);
  const page = await context.newPage();
  const diagnostics = attachPageDiagnostics(page);
  const views = [];

  try {
    const rosterMarker = markDiagnostics(diagnostics);
    await login(page);
    await waitForControlRoom(page);
    views.push(
      await recordView(page, diagnostics, rosterMarker, "mobile:roster", "mobile-roster.png"),
    );

    const marker = markDiagnostics(diagnostics);
    await clickView(page, MOBILE_DATA_VIEW);
    views.push(
      await recordView(page, diagnostics, marker, "mobile:the-wire", "mobile-the-wire.png"),
    );
  } finally {
    await context.close();
  }

  return views;
}

function collectFailures(summary) {
  const failures = [];
  const roster = summary.views.find((view) => view.name === "desktop:roster");

  for (const view of summary.views) {
    if (view.overflow) {
      failures.push(
        `${view.name} has horizontal overflow (${view.scrollWidth} > ${view.clientWidth})`,
      );
    }
  }

  if (!roster || roster.pcardCount < MIN_PCARDS) {
    failures.push(`desktop:roster pcard count ${roster?.pcardCount ?? 0} < ${MIN_PCARDS}`);
  }

  return failures;
}

installTeardownHandlers();

try {
  const dotEnv = loadDotEnvLocal();
  const env = { ...process.env, ...dotEnv };
  requireConfig(dotEnv);
  mkdirSync(OUT_DIR, { recursive: true });

  await startServer(env);

  const browser = await launchBrowser();
  const summary = {
    ok: false,
    base: BASE,
    outDir: OUT_DIR,
    minPcards: MIN_PCARDS,
    views: [],
    failures: [],
  };

  try {
    summary.views.push(...(await walkDesktop(browser)));
    summary.views.push(...(await walkMobile(browser)));
  } finally {
    await browser.close();
  }

  summary.failures = collectFailures(summary);
  summary.ok = summary.failures.length === 0;
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
} catch (error) {
  if (error !== uncaughtException) {
    console.error(error);
  }
  console.log(
    JSON.stringify(
      {
        ok: false,
        base: BASE,
        outDir: OUT_DIR,
        minPcards: MIN_PCARDS,
        failures: [error.message],
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await cleanup("finally");
}
