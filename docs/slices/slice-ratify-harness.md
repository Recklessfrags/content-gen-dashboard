# Slice — turnkey visual-QA "ratify" harness (`scripts/ratify.mjs`)

_Author: Architect (Claude). Status: spec frozen (v2 — corrected after a cross-vendor spec review
that caught 4 defects in v1: a pcards=0-still-exits-0 false pass, `finally`-only teardown that leaks
a `setsid` group on SIGINT, no pre-flight port-free (stale-server false readings), and no await
between click and screenshot (race)). Productionizes a **proven** ad-hoc reference the Architect ran
end-to-end 2026-07-01 (login + walk all views + screenshots against real Supabase with RLS)._

> Loop: Architect (spec, reviewed) → Codex (build) → Gemini + Architect review → human ratifies.
> The Architect VERIFIES by running the harness live against the app.

## What it does
Headless Chromium (pre-installed) drives the app as a real user — log in, click through every
view, screenshot desktop + mobile, assert layout — so UI ratification is one command, repeatable.

## Hard constraints (the whole reason this is non-trivial — bake ALL in)
1. **Production build only.** `next dev` renders **unstyled** in this sandbox → use
   `next build && next start`.
2. **Browser can't egress the sandbox proxy; Node can.** Run the app locally and **bridge** the
   browser's Supabase calls through Node `fetch` via `page.route('**/*.supabase.co/**', ...)`,
   forwarding headers (incl. the JWT) so RLS applies. Mandatory.
3. **Pre-flight port-free + dedicated port (prevents stale-server false readings).** Before
   spawning, **ensure `RATIFY_PORT` is free** (`fuser -k <PORT>/tcp` then re-check, or abort with a
   clear error if still occupied) — otherwise the readiness poll connects to a **stale** server and
   silently tests old code. Only after the port is confirmed free, spawn.
4. **Robust teardown (a `finally` block is NOT enough).** Spawn the server detached (own process
   group). Tear it down (kill the group + free the port) from **`finally` AND**
   `process.on('exit')`, `process.on('SIGINT')`, `process.on('SIGTERM')`, and
   `process.on('uncaughtException')` — because `finally` does NOT run on signals/aborts, and a
   detached group survives the parent, leaking `next start` and hogging the port.
5. **Await before every screenshot/assert (no races).** After each nav click, **await**
   `page.waitForLoadState('networkidle')` and the target view's key element being visible (plus a
   short settle) BEFORE screenshotting/asserting — never screenshot immediately after a click (you'd
   capture a skeleton or the prior view).
6. **Chromium binary:** try Playwright's default resolution first; fall back to an executable
   discovered under `PLAYWRIGHT_BROWSERS_PATH`. Launch args `['--no-sandbox','--disable-dev-shm-usage']`.
7. **No secrets in the repo.** Creds from env (`RATIFY_EMAIL`/`RATIFY_PASSWORD`); Supabase URL/anon
   from the app's `.env.local` (already gitignored). Screenshots to a **gitignored** dir.

## Required shape
- **`scripts/ratify.mjs`** (ESM, `node scripts/ratify.mjs`):
  - Env config: `RATIFY_BASE` (if set → use that already-running server; do NOT spawn/teardown),
    else spawn a prod server on `RATIFY_PORT` (default 3100) after the pre-flight port-free: build if
    `.next` missing, `next start -p PORT` detached, poll `/login` until ready. `RATIFY_EMAIL` /
    `RATIFY_PASSWORD` for login. `RATIFY_OUT` (default `ratify-out`). `RATIFY_MIN_PCARDS` (default 1).
  - Install the supabase.co bridge on every context.
  - `login(page)`: goto `/login`, fill email/password, submit, wait to leave `/login`; **if still on
    `/login` after the wait, treat as login failure**.
  - Desktop (1440×900): screenshot roster; then for each nav tab (`[role=tab]` by label: Channels,
    The Wire, Queue, Runs, Overview, Cost) click → await load/visible (constraint 5) → screenshot.
    Mobile (412×915): roster + one data view, same awaits.
  - Per view record: overflow (`documentElement.scrollWidth <= clientWidth`), `.pcard` count,
    pageerror/console errors. Print a JSON summary.
  - **Exit codes (ACs must fail on broken output):** exit **non-zero** if ANY of: login failed;
    any view has horizontal overflow; **the roster `.pcard` count is < `RATIFY_MIN_PCARDS`** (guards
    the empty-roster / auth-drop / stale-server failure the Architect hit — an empty roster on an
    account that has characters is a FAILURE, not a pass). Exit 0 only when all pass.
- **`package.json`**: add `playwright` devDependency + `"ratify": "node scripts/ratify.mjs"`.
  (Sandbox skips the browser download via `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` + `PLAYWRIGHT_BROWSERS_PATH`;
  do NOT run `playwright install`.)
- **`.gitignore`**: add `ratify-out/`.
- **`docs/ratify.md`**: ~15 lines — prereqs (`.env.local` public Supabase vars;
  `RATIFY_EMAIL`/`RATIFY_PASSWORD`), the one command, what it asserts + exit-code meaning, and the
  prod-build / bridge / pre-flight-port / signal-teardown rationale so constraints aren't re-learned.

## Scope
- **IN:** `scripts/ratify.mjs`, `package.json` (+ lock), `.gitignore`, `docs/ratify.md`.
- **OUT:** any app/src change; CI wiring; committing screenshots or creds.

## Gates (DONE)
1. `npm run build` still succeeds (harness doesn't touch the app).
2. The harness **runs live** (Architect verifies): logs in, walks all views with proper awaits,
   writes screenshots, prints the JSON summary, and **exits non-zero on login-fail OR overflow OR
   empty-roster**, 0 otherwise. Teardown leaves **no** leaked server and frees the port even on
   Ctrl-C. Pre-flight frees a stale port first.
3. `git diff --stat` touches only the declared files; NO screenshots/creds committed; NOT
   `docs/HANDOFF.md`.

## Builder notes (Codex)
Argue first if anything is wrong. Build only the declared files. You can't commit — leave edits in
the tree; the Architect reviews, runs it live, and commits. Do NOT edit `docs/HANDOFF.md`.

### Proven reference (the bridge + login + walk — productionize with the constraints above)
```js
import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', BASE=process.env.RAT_BASE;
const EMAIL=process.env.RAT_EMAIL, PASS=process.env.RAT_PASS, OUT=process.argv[2]||'.';
const browser=await chromium.launch({executablePath:EXE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function bridge(ctx){ await ctx.route('**/*.supabase.co/**', async route=>{
  const req=route.request(); const h={...req.headers()}; delete h['host']; delete h['content-length'];
  const m=req.method(); const body=(m==='GET'||m==='HEAD')?undefined:(req.postData()??undefined);
  try{ const r=await fetch(req.url(),{method:m,headers:h,body,redirect:'manual'});
    const buf=Buffer.from(await r.arrayBuffer()); const rh={};
    r.headers.forEach((v,k)=>{ if(!['content-encoding','content-length','transfer-encoding'].includes(k)) rh[k]=v; });
    await route.fulfill({status:r.status,headers:rh,body:buf});
  }catch(e){ await route.abort(); } }); }
async function login(page){ await page.goto(`${BASE}/login`,{waitUntil:'networkidle'});
  await page.fill('input[type=email]',EMAIL); await page.fill('input[type=password]',PASS);
  await page.click('button[type=submit]');
  await page.waitForURL(u=>!u.pathname.endsWith('/login'),{timeout:45000}).catch(()=>{});
  await page.waitForLoadState('networkidle').catch(()=>{}); await page.waitForTimeout(2500);
  // if still on /login -> throw login-failed (non-zero exit)
}
// nav walk: for each label -> page.locator('[role=tab]',{hasText:v}).click();
//   await page.waitForLoadState('networkidle'); await settle; screenshot fullPage; assert scrollWidth<=clientWidth
```
Server orchestration (replicate WITH pre-flight port-free + signal-handler teardown):
`.env.local` has the Supabase public vars; `npm run build`; free `RATIFY_PORT` (`fuser -k`);
`setsid`/detached `npm run start -- -p <PORT>`; poll `/login`; run; on finally+exit+SIGINT/SIGTERM
kill the group (`kill -- -PGID`) + `fuser -k <PORT>/tcp`.
```
