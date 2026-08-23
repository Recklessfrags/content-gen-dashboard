# Slice — HQ build tasks 1+2: render video player + `length_target` field hardening

_2026-07-14. Architect (Claude). Both tasks cleared to build by the problem-solver's delegated
GO on HQ (reels#88 `4964526693` + authoritative backlog `4964858225`): non-brand,
dashboard-only; merge on the problem-solver's GO once gate-green. One branch/PR, two
independent sections._

## A. Render `<video>` player — the watch-gate's UI (HIGH; HQ `4963951053`)

**Problem:** the dashboard tracks `ready_for_review` but has no way to WATCH the rendered
MP4 — the owner watches via raw storage URLs. Verified live 2026-07-14: renders live at
`render-assets/{episode_id}/mastered.mp4` in a **public** bucket; the public URL serves
`video/mp4` with HTTP range support (206) — streams in a plain `<video>`.

**Build:**
- **Superseded 2026-08-18:** the player now probes the public object with a cached
  `HEAD` request and renders no DOM when the object is absent or the probe fails.
- `src/lib/renderAssets.ts` — pure `renderVideoUrl(episodeId: string): string | null`
  building `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/render-assets/{episode_id}/mastered.mp4`
  (null on blank episodeId; URL-encode the path segment). Unit-tested.
- `src/components/aurora/RenderPlayer.tsx` — collapsed-by-default disclosure
  ("Watch render ▸"): the `<video controls playsInline preload="metadata">` element mounts
  ONLY after the operator opens it (an Action Center list must not load N videos on
  render). `max-width:100%`; absent renders do not mount the player.
  Accessible: the toggle is a real button with `aria-expanded`; keyboardable. Both themes,
  412/700/1440 (portrait 9:16 videos must not overflow the card — cap height, letterbox).
- **Mount points:** (1) Action Center job cards where `job.episode_id` is present (the
  approve-with-eyes-on-the-render moment); (2) RevealHub per-reveal cards (episode_id
  known). **NOT ReviewHub** — it is mock fixtures and the mock→real scoring flip is HELD
  (HQ `4964858225` item 4); do not imply a real calibration surface there.
- Public-URL note (constraint, in code where the URL is built): bucket is public per the
  HQ ruling; if the owner flips it private, swap to `createSignedUrl` (the
  `castingVisual.ts:101-103` pattern). No signed-URL plumbing now.
- Read-only; zero writes; no new deps.

## B. `length_target.short_s` — validate + explain (HQ `4964487945`)

**Reality check (2026-07-13/14):** the field ALREADY exists ("Short length (s)" in
`ChannelProfilesPanel`, saved as `length_target: {short_s: N}`), all 4 live channel rows
carry values (dark_history=100, others 70/75), and the pipeline now LIVE-READS it (word
bands, cut counts, durations — reels PR #102). Gaps vs the ask: no range validation and no
explanation of what the knob drives. A wrong value doesn't error pipeline-side — it
silently fail-safes to 70 — so the UI guard is the only visible feedback.

**Build:**
- Extract a pure validator into `src/lib/channelProfiles.ts` (e.g.
  `parseShortSeconds(raw: string): {ok:true; value:number|null} | {ok:false; error:string}`):
  empty → `null` (valid; field stays unset and the pipeline defaults to 70); otherwise must
  be a finite number with **0 < short_s ≤ 180**; out-of-range/NaN → a plain-English error
  naming the bound. Unit-tested (empty, 1, 70, 180, 0, -5, 181, "abc", "70.5" — decimals
  allowed if finite and in range). `formToInput` uses it; save is blocked with the error
  shown at the field, not a thrown generic.
- Helper copy under the input (pipeline-supplied, lightly edited): "Target video length in
  seconds — a live production knob. Drives the script word band (~×1.86 words/s), cut
  count, and render duration for this channel. Longer = harder retention and ~linearly
  higher cost. Leave blank for the default (70s). Must be 1–180."
- `inputMode="decimal"` on the input. No schema/contract change (column + shape already
  ratified; pipeline is the reader).

## Acceptance gates
1. `tsc` clean · `vitest` green including new tests (`renderVideoUrl`, `parseShortSeconds`)
   · `next build` clean.
2. Player: video element does NOT exist in the DOM until the disclosure is opened
   (test or measured); URL matches the verified live pattern; a bogus episode id renders
   nothing.
3. Field: save blocked with visible error for 0 / 181 / "abc"; empty saves `{}` unchanged;
   70 and 180 save. Helper copy present.
4. No new writes anywhere; no service-role; no signed-URL code.
5. Cross-vendor (Gemini) review of the aggregate diff; merge only on the problem-solver's
   GO posted after gate-green is reported on reels#88.

## Build notes (Codex)
Declared files: `src/lib/renderAssets.ts` (new) + test, `src/lib/channelProfiles.ts` + its
test file, `src/components/aurora/RenderPlayer.tsx` (new), `src/components/aurora/ActionCenter.tsx`,
`src/components/aurora/RevealHub.tsx`, `src/components/controlroom/ChannelProfilesPanel.tsx`,
`src/app/aurora.css` (player styles; scope `.aurora-app`). Argue with this spec before
building; if `job.episode_id` is not actually available where the Action Center card
renders, STOP and report. Do not edit `docs/HANDOFF.md`.
