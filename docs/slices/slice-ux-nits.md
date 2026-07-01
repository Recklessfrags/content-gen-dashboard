# Slice — two UX nits (login email-retention + mobile CAST overlap)

_Author: Architect (Claude). Status: spec frozen (v2 — corrected after a cross-vendor spec
review that caught 4 defects in v1: a `display:none` false-pass AC, a 481–880px breakpoint gap,
`defaultValue` not re-applying to a mounted input, and "and/or" ambiguity). Behavior-preserving
except the two specific fixes._

> Loop: Architect (spec, reviewed) → Codex (build) → Gemini + Architect review → human ratifies.
> The Architect verifies with the ratify harness (mobile CAST clearance; login email retained).

## Fix 1 — Login preserves the email on a failed attempt
**Bug:** on a failed sign-in the EMAIL field clears (uncontrolled form + `useActionState` resets
inputs on the error re-render), forcing a full re-type.

**Files:** `src/app/login/page.tsx` only (`actions.ts` unchanged).

**Change (concrete — no options):**
- `page.tsx`: make the **email input CONTROLLED** — add `const [email, setEmail] = useState("")`
  in `LoginForm`, and on the email `<input>` set `value={email}` +
  `onChange={(e) => setEmail(e.target.value)}`. A controlled input's value is React state, which is
  **not** cleared by the post-action form reset (unlike an uncontrolled input), so the typed email
  persists across **any number** of failed attempts (including consecutive same-email retries) with
  no `key`/remount trickery and no `defaultValue` (which does not reliably re-apply to a mounted
  input). The controlled value still submits in `formData`, so the server action is unchanged.
  This means **`actions.ts` does NOT need to change** for retention — leave `AuthState` /
  `signIn` exactly as-is (still returns `{ error }`, still `redirect("/")` on success). Never
  touch the password field's value (never echo/persist a password).
- **Password field:** DELETE the `placeholder="••••••••"` attribute entirely (it reads like a
  pre-filled value). Leave the email placeholder as-is.

**Preserve verbatim:** the success redirect, `required`, `role="alert"`/`aria-live` error display,
`autoComplete` values, the disabled-while-pending button.

## Fix 2 — CAST stamp must not overlap the HISTORY button on narrow screens
**Bug:** `.casting-stamp` is `position:absolute; top:22px; right:30px; transform:rotate(7deg)`.
A tablet query (`881–1024px`) repositions it, but there is **NO rule below 881px**, so on every
width from ~360px up to 880px the rotated stamp collides with the `.history-trigger` (HISTORY) /
`FILE ·` row at the top of the dossier (verified at 412px).

**File:** `src/app/globals.css` only.

**Change (concrete):**
- Add a media query **`@media (max-width:880px)`** (dovetails the existing `881–1024px` block — so
  there is **no gap** between 481–880px). In it, reposition `.casting-stamp` so it **structurally
  clears** the header: move it BELOW the `FILE ·`/HISTORY row rather than on top of it — e.g.
  `.casting-stamp{ top:auto; bottom:auto; position:static; align-self:flex-end; transform:rotate(7deg) scale(.8); transform-origin:center; margin:2px 4px 0 auto; }`
  OR keep it absolute but push it clear of the history row (e.g. `top:56px; right:14px; transform:rotate(7deg) scale(.72)`), whichever the builder confirms via the harness leaves **zero overlap** with `.history-trigger` at 360/412/600/800px. Pick ONE approach and make it clean.
- **The stamp MUST remain VISIBLE** — `display:none` / `visibility:hidden` / `opacity:0` are
  FORBIDDEN (hiding it is not a fix).
- Desktop (>880px) appearance is unchanged. Do NOT affect `.casting-stamp.is-cast` (color rule) or
  the static `.casting-candidate-head .casting-stamp` (Casting Studio).

## Scope
- **IN:** `src/app/login/page.tsx`, `src/app/globals.css` (+ this spec). (`actions.ts` unchanged.)
- **OUT:** any other file; any change beyond the two fixes.

## Gates (DONE — ACs must fail on broken output)
1. `npx tsc --noEmit` clean; `npm test` green; `npm run build` succeeds.
2. **Login:** success still redirects; a failed login shows the error AND the email input still
   contains the submitted email (retained, not blank); password is never echoed; password
   placeholder gone.
3. **CAST stamp (harness-verified at 360/412/600/800px):** the stamp is **rendered and visible**
   (computed `display!=none`, `opacity>0`) AND its bounding box does **not** intersect the
   `.history-trigger` bounding box; desktop (≥881px) unchanged; no new horizontal overflow.
4. `git diff --stat` touches only `page.tsx` + `globals.css` (+ this spec). NOT `docs/HANDOFF.md`.

## Builder notes (Codex)
Argue first if any step is wrong. Build only the declared files. You can't commit — leave edits in
the tree; the Architect reviews + runs the harness + commits. Do NOT edit `docs/HANDOFF.md`.
