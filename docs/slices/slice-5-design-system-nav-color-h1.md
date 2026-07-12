# Slice #5 — design-system pass: mobile nav bar + button-color language + kill duplicate channel H1

_Author: Architect (Claude). Status: **BUILD (read-only UI/CSS, no data writes).** Owner-picked next
slice from the Sol audit (owner ratified "proceed with design slice" in chat). Read-only/design-system
class — no money/brand path. Cross-vendor (Gemini) review + a local-render visual check, then
problem-solver merge nod before prod._

## Why
The Sol audit's top design-system findings, bundled: (1) top-level nav is 4 cramped chips colliding
with the "Channels" heading and below tap-target size; (2) the button-color language has drifted —
non-destructive buttons render red because of a CSS fall-through; (3) the channel name renders **three
times** on the Guidelines tab (breadcrumb + hero + a redundant giant H2).

## Part A — persistent bottom mobile nav bar (replaces the heading chips)

**Current:** `ChannelsHub.tsx` renders 4 `btn-secondary` chips (Characters/Ideas/Runs/Review →) in
its `section-header` (lines ~71-90), plus a `New Channel` button. Navigation is the Aurora **scope**
system: `navigate({ kind: "hub", hub })` in `ControlRoom.tsx` (~915-932); hubs render inside
`AuroraShell` (`src/components/aurora/AuroraShell.tsx`: `<header className="app-header">` +
`<main>{children}</main>` inside `.app-container`).

**Build:**
1. **`AuroraShell.tsx`** — add an optional prop
   `nav?: { activeKey: "channels" | "characters" | "ideas" | "runs" | "review"; onNavigate: (key:
   "channels" | "characters" | "ideas" | "runs" | "review") => void }`. When present, render a
   `<nav className="app-nav-bar" aria-label="Primary">` as a **sibling of `<main>` inside
   `.app-container`**, with exactly these 5 items in order: **Channels, Characters, Ideas, Runs,
   Review**. Each item is a `<button type="button">` with a small inline SVG icon + a short text label,
   calling `onNavigate(key)`; set `aria-current="page"` on the active item (`activeKey === key`). Keep
   the existing header/mode-toggle/theme/avatar untouched.
2. **`ControlRoom.tsx`** — pass `nav` to `AuroraShell` (do this once at the `AuroraShell` render site
   so it appears on every hub/workspace): `activeKey` = `scope.kind === "workspace" ? "channels" :
   (scope.hub is one of the 5 ? scope.hub : "channels")` — i.e. a channel workspace and any non-bar hub
   (overview/actions) both highlight **Channels**. `onNavigate: (key) => navigate({ kind: "hub", hub:
   key })`.
3. **`ChannelsHub.tsx`** — **remove the 4 chip buttons** (Characters/Ideas/Runs/Review →) from the
   section-header; keep the `New Channel` button. Remove the now-unused
   `onOpenCharacters/onOpenIdeas/onOpenRuns/onOpenReview` props from `ChannelsHubProps` **and** their
   pass-through at the `HubLanding`/`ControlRoom` call sites (no dead props). The section-header
   collapses to just the title + `New Channel`.
4. **`aurora.css`** — `.aurora-app .app-nav-bar`: fixed to the viewport bottom, full width, `display:
   flex` with 5 equal-width items, glass background consistent with `.app-header`, top border, and
   **`padding-bottom: env(safe-area-inset-bottom)`**. Each item ≥ 44px tall (thumb target), icon above
   label, `--accent` (cyan) for the active item, dim for the rest. Add `padding-bottom` to
   `.aurora-app main` (≈ the bar height + safe-area) so content never hides behind the bar. Must not
   overflow horizontally at 393px. Keep it mobile-first; a max-width/centered treatment on large
   screens is fine but not required.

## Part B — restore the button-color language (cyan primary / outline secondary / red destructive-only)

**Root cause (verified):** `.aurora-app .btn` (aurora.css ~694-708) sets **layout only** — no
background/color — so a bare `className="btn"` inside `.aurora-app` falls through to the legacy
`globals.css .btn` (~162-165) which is **red `--stamp` #C8453B**. That reddens non-destructive
buttons: **"Create New"** (ControlRoom ~3160), **"View global cost center"** (ControlRoom ~3253), and
the **"Retry"** buttons (ControlRoom ~3008; ChannelProfilesPanel ~551/574).

**Build:**
1. **`aurora.css`** — give `.aurora-app .btn` a real **secondary/outline default** (transparent or
   `var(--surface-2)` bg, `var(--border-soft)` border, `var(--text-main)` text) — matching
   `btn-secondary` — so no bare `.btn` is ever accidentally red. This single rule de-reds Create New,
   View global cost center, and the Retry buttons at once. Do **not** change `btn-primary` /
   `action-button` (ink primary), `btn-secondary`, or `btn-new-channel`.
2. **Preserve real destructive red for destructive actions only.** `btn-danger` /
   `btn-danger-outline` (aurora.css ~752-766) already exist and are the destructive language; leave
   them as the red channel. Do **not** newly redden anything. (The channel **Delete** at
   ChannelProfilesPanel ~1059 stays as its current ghost styling — out of scope; it's the
   often-disabled fallback-profile delete.)
3. **"Legacy console"** (`HubLanding.tsx` ~58) is **not** red — it's `action-button` (ink primary),
   over-emphasized for a low-priority escape hatch. Demote it to **`btn-secondary`** so it stops
   competing with the primary "Review All" beside it. (Small, in the audit's spirit.)

## Part C — kill the duplicate channel H1 on the Guidelines tab

**Current:** on the Guidelines tab the channel name shows **three times** — breadcrumb
(`ControlRoom.tsx` ~2760), hero `<h1>` (~2769), and a redundant giant `<h2 id="channel-profile-title">`
inside `ChannelProfilesPanel.tsx` (~664-672), sized 2.5rem by `aurora.css` ~1344-1353.

**Build:** in `ChannelProfilesPanel.tsx`, when **scoped** (`scopedChannel` truthy — the Guidelines-tab
case), **do not render** the `dossier-head` channel-name `<h2>` and its `filecode`/`sub` siblings
(~660-675). The hero + breadcrumb already establish identity. Keep the editor body and its
"Settings that apply to every run on this channel." helper (move that helper to sit above the form if
it was under the removed header). The unscoped create surface (the `<h1>` branch) is unchanged. Remove
or leave the now-unused `.dossier-head h2` size rule — leaving it is fine (no scoped consumer).

## Gates / review
`tsc` · full `vitest` · `next build`. Cross-vendor (Gemini) review. **Plus a local-render visual
check** (this is a visible nav/layout change — screenshot home + a channel workspace at 393px to
confirm the bar renders, doesn't overlap content, and the chips are gone) before the merge nod. Commit
+ push to `claude/wire-aurora-home-5b-lleyyg`; problem-solver merge nod before prod.

## Explicitly NOT in scope
Overview/Action-Center/Cost-Center placement in the bar (bar is the 5 primary destinations only; those
stay reachable as they are), the RunsHub group-by-state collapse (separate deferred audit item),
restyling the channel Delete, any data write, any legacy `.cr` shell change.

## States enumerated (rule 29)
- Nav bar: active item = current hub; workspace + overview/actions → Channels active; tap = navigate;
  keyboard focus/hover states match existing buttons; 5 items never overflow 393px; content clears the
  bar (main padding-bottom); safe-area honored on notched devices.
- Buttons: bare `.btn` now reads secondary (not red); primary actions unchanged (ink); destructive
  classes (btn-danger*) unchanged and still available; no button newly red.
- Guidelines tab: channel name appears twice (breadcrumb + hero), not three times; editor unchanged;
  create surface (unscoped) still shows its H1.
