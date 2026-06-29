# Runtime / mobile verification gate (UI changes)

**Why this exists.** The Casting Studio shipped with a real bug — on mobile, every
overlay built on `.history-layer` (casting, enqueue, history) let taps fall
*through* to the page behind it (popping the keyboard), didn't dim/hide the
background, and let the page scroll behind the modal. **Four independent code
reviews missed it**, because:

1. **Diff-only review is blind to inherited bugs.** The broken overlay CSS
   (`.history-layer { position:absolute; pointer-events:none }`, no scrim) was
   *pre-existing shared infrastructure* the new panel reused — it wasn't in the
   diff, so "reuses the existing drawer pattern" read as safe.
2. **Focus-trap ≠ modal.** Reviewers verified the focus trap from the code and
   conflated it with modality. A focus trap only intercepts the **Tab key**; it
   does nothing for **touch taps**, a scrim, or scroll-lock.
3. **Nobody ran the app — least of all on a phone.** Every check was
   `tsc` / `build` / read-the-code. There was zero runtime, visual, or mobile
   verification in the loop.

## The gate (required for any UI / interaction change)

Before a UI change merges, **run it in a real browser at a mobile viewport
(~390px) and a desktop viewport**, and confirm the actual rendered behavior —
not just that the code looks right. At minimum, for overlays/dialogs/drawers:

- The overlay **covers** the viewport and **dims/hides** the background.
- Taps/clicks on the background do **not** reach page controls (no tap-through,
  no surprise keyboard on mobile).
- The body **does not scroll** behind the modal.
- It works at **mobile width**, not just desktop.
- Tap/click-to-close and focus behavior actually work.

**"Reuses an existing pattern" triggers verifying that pattern**, especially when
the new use is heavier than the original (an interactive form vs a read-only
drawer). **A11y/interaction claims are runtime-verified, never inferred from code.**
At least one reviewer (or the architect running the gate) must *run* a UI change,
not only read it.

## How to run it

`scripts/verify-modal.mjs` drives the app in headless Chromium at 390px. Two modes:

- **Full E2E** (envs where the browser can reach Supabase): logs in, opens the
  panel, asserts modal behavior + screenshots. Set `BASE_URL`, `PW_EMAIL`,
  `PW_PASSWORD`.
- **CSS-level** (`--css`, deterministic, no auth/egress needed): loads the real
  compiled stylesheet via `/login`, injects the overlay DOM, and measures
  computed styles at phone width. This is the layer that broke, so it's a strong
  check on its own.

```bash
npm i -D playwright-core           # Chromium: npx playwright install, or set PW_EXEC
# CSS-level (works even behind an egress proxy):
BASE_URL=http://localhost:3000 node scripts/verify-modal.mjs --css
# Full E2E:
BASE_URL=https://<preview-or-prod> PW_EMAIL=… PW_PASSWORD=… node scripts/verify-modal.mjs
```

Sandbox note: this repo's CI sandbox routes outbound HTTPS through a MITM egress
proxy. A headless browser can't reach **external** Supabase through it (CA-trust /
CONNECT limits), and Next's server `fetch` needs an undici proxy dispatcher
(`--require` a preload that calls `setGlobalDispatcher(new EnvHttpProxyAgent())`,
with `NODE_EXTRA_CA_CERTS` set) for server-side auth. In that sandbox use the
`--css` mode (it needs neither). In a normal dev/CI environment, the full E2E
mode runs end-to-end.

## The loop, updated

Architect (Claude, docs/coordination) → Designer (Gemini) → Builder (Codex) →
**independent review by the two models that did NOT build it** (no self-grading) →
**runtime/mobile verification gate (this doc)** → human ratification → merge.

## Tooling note: reach Gemini via REST, not the CLI

In this sandbox the `gemini` CLI returns persistent `503 "experiencing high
demand"` / hangs, regardless of model — which is easy to mistake for "Gemini is
down." It isn't: direct REST returns HTTP 200 on `models.list`,
`gemini-2.5-flash`, and `gemini-2.5-pro` (generateContent *and*
streamGenerateContent), "standard" tier, with the same key. The CLI is the
broken link — `GEMINI_API_KEY` here is an OAuth-style token (`AQ.…`, not an
`AIza…` AI Studio key), and the CLI routes it through a Code-Assist/OAuth backend
that 503s instead of the working `generativelanguage ?key=` path.

**Use `scripts/gemini.sh`** (curl → `generateContent`, which correctly uses the
egress proxy + CA) for Designer specs and Gemini reviews. Assemble the file/diff
context into the prompt, since REST has no autonomous file-reading.
