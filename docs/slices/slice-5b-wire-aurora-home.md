# Slice 5b — "The Wire" (ideas) → Aurora-native home (BUILD-READY SPEC)

_2026-07-05. Operator GREENLIT (the write/money-path go-ahead is given). Scoped by a read-only survey agent
against the live code. This is the last buildable reachability gap before the legacy `.cr` shell can be
deleted (5g). **Money path** → governance L-2/L-4: two-lens review (Gemini cross-vendor + a fresh "suerta"
Claude reviewer) before it lands. Recommended to build in a FRESH session (money path + context weight,
rule 30)._

## Goal
Give ideas an Aurora-native home (no `.cr` shell), re-point "Log an idea →" there, and **reuse the enqueue
money path verbatim** (do not rewrite it). Author the new copy audit-clean (sentence case, no spy theming).

## The money path — REUSE VERBATIM, do not rewrite
`EnqueueIdeaPanel.tsx` performs **no Supabase writes itself** — it builds a `JobEnqueueInput` and calls
`onSubmit`. The writes live in ControlRoom:
- **`enqueueJob`** (`ControlRoom.tsx` ~1344–1378): `supabase.from("jobs").insert(buildJobInsert(input))`
  → **WRITE #1 `jobs`**; then `writeIdeaJobMap(...)`.
- **`writeIdeaJobMap`** (`ControlRoom.tsx` ~597–616): `supabase.from("idea_job_map").insert({idempotency_key,
  idea_id, channel})` → **WRITE #2 `idea_job_map`** (provenance; non-fatal on failure).
- Idempotency key computed client-side: `idempotencyKeyFor` (`src/lib/jobs.ts` ~184–211); payload via
  `buildJobInsert` (~213–243, sets `fact_approved:false`/`publish_approved:false`/`publish_only:false`;
  `spend_approved:false` so the worker parks for spend approval downstream — NOT in this panel).
- Duplicate: `error.code === "23505"` → `{kind:"duplicate"}` → "Already queued". Preserve.
- The `useIdeas` hook (`src/lib/hooks/useIdeas.ts`) owns all **`ideas`** writes: insert (`startIdeaInsert` ~70),
  status update (~157–171), field update `character_id`/`channel` (~173–189). Preserve the asymmetry
  (`character_id` persists `null` for empty; `channel` persists the raw string).
- **Casting gate is warn-only** (`ENFORCE_CASTING = false`, `EnqueueIdeaPanel.tsx:18`) — do not flip it.

## Build steps
1. **New component `src/components/aurora/IdeasHub.tsx`** — mirror `CharactersHub.tsx` (`"use client"`,
   export an `IdeaCardVM` view-model + `IdeasHubProps`). Render: the capture form (title / note / character
   select / channel select / submit) + the idea list (per-card: status segmented control, "Queue as run"
   button hidden when `used`, character tag select, channel tag select, failed-write retry/dismiss) +
   loading/error/empty states. Pass the `useIdeas` handlers in as props (exactly like `charactersHubProps`
   @ `ControlRoom.tsx` ~1731–1752): `addIdea`, `setIdeaStatus`, `setIdeaField`, `retryIdea`, `dismissIdea`,
   `openEnqueuePanel`, plus `ideas`/loading/error/`onBack`. Use canonical `STATUS_LABEL` (`types.ts:70`) for
   status labels (sentence case), not the legacy local `IDEA_STATUS_LABELS`.
2. **Route key** — add `"ideas"` to `HubKey` union (`src/lib/route.ts:1`) + `HUB_KEYS` (`:7`); update
   `src/lib/__tests__/route.test.ts`. New URL: `?hub=ideas`.
3. **ControlRoom dispatch branch** — add `!legacyShellOpen && scope.kind === "hub" && scope.hub === "ideas"`
   (model on the `characters` branch ~2316–2373) returning `<AuroraShell>…<IdeasHub {...ideasHubProps}/>…
   </AuroraShell>` with `{globalOverlays}`. Build `ideasHubProps` via `useMemo`.
4. **Re-point "Log an idea →"** (`ControlRoom.tsx` ~2150–2157): change
   `onClick={() => openLegacyConsole("wire")}` → `onClick={() => navigate({kind:"hub", hub:"ideas"})}`; drop
   the 2149 comment. Optionally add an "Ideas →" entry on `HubLanding`.
5. **⚠️ HIGHEST-RISK STEP — render `EnqueueIdeaPanel` in the Aurora path.** Today it renders ONLY in the
   legacy `.cr` shell (`ControlRoom.tsx` ~3832–3842). Relocate it into `globalOverlays` (~1815) — or into
   the new `ideas` branch — so `[Queue as run]` (which sets `activeEnqueueIdeaId`) actually shows the panel.
   If you skip this, "Queue as run" silently no-ops. `openEnqueuePanel`/`closeEnqueuePanel`/`activeEnqueueIdea`
   derivation + `onSubmit={enqueueJob}` are otherwise reusable as-is.

## Copy (author the new IdeasHub audit-clean; per `copy-audit-2026-07-05.md`)
`The Wire`→**Ideas** · `TRANSMITTING FREQUENCY · LOG NEW BEAT`→a plain section header (e.g. "Log an idea") ·
`LOG IT`/`TRANSMITTING...`→`Log idea`/`Logging…` · the "Dossier title (e.g. …)" placeholder→a plain example ·
`[TRANSMISSION FAILED - RETRY]`→plain retry · `Active/Draft Field Manuals`→`Active/Draft characters` ·
`Current Dossier`→`Current character`. In `EnqueueIdeaPanel`: `TRANSMIT ENQUEUE SIGNAL`→`Queue as run` ·
`TRANSMISSION FAILURE:`→plain error · `Read-only from The Wire`→`Read-only from the idea` · `TOPIC / FOOD`
eyebrows→`Topic` · de-jargon the Mad Dog brand warning. **Visible text only** — never touch `food`, the
`CHANNELS` enum values, or `status` enum strings (contract-bound). Note S1 (globals.css uppercase strip) is a
separate lane; author the new Aurora strings in sentence case regardless.

## Ratify (bespoke `scripts/ratify-5b-wire.mjs`, prod build + Chromium + Supabase bridge)
Intercept-and-abort **EVERY** table these surfaces write (ledger lesson — zero-writes is only as true as the
intercept list): **`jobs`**, **`idea_job_map`**, **`ideas`**. Assert:
- `?hub=ideas` renders in `AuroraShell`; capture form + idea list render; "Log an idea →" from the dossier
  editor navigates to `?hub=ideas` (not the legacy console).
- Logging an idea → exactly one intercepted `ideas` insert (payload = typed title/note/character/channel,
  status `backlog`); status/tag changes → the right `ideas` update; nothing leaks.
- `[Queue as run]` opens `EnqueueIdeaPanel` **in the Aurora path**; submit → exactly one intercepted `jobs`
  insert **+** one `idea_job_map` insert carrying the same `idempotency_key`; zero leaked; duplicate key →
  "Already queued" (no 2nd row).
- ZERO live writes; no app console errors (exclude env-only noise).

## Review (money path → two lenses, L-2/L-4)
Gemini cross-vendor + a fresh suerta (Opus) reviewer on the aggregate diff. Verify: the money path is reused
verbatim (jobs/idea_job_map/idempotency untouched); the EnqueueIdeaPanel-in-Aurora wiring is present (the #5
trap); the legacy `.cr` wire board is left intact (5g deletes it); copy edits touch visible text only.

## Copy-paste KICKOFF for the build session
```
Build sub-lane 5b per docs/slices/slice-5b-wire-aurora-home.md (operator-greenlit money path). Start fresh off
production claude/new-session-3l99vs; run npm ci first. Create src/components/aurora/IdeasHub.tsx (mirror
CharactersHub), add the "ideas" hub key (route.ts + route.test.ts), add the ControlRoom ?hub=ideas dispatch
branch + ideasHubProps, re-point "Log an idea →" to navigate to ?hub=ideas, and — CRITICAL — render
EnqueueIdeaPanel in the Aurora path (relocate from the legacy-only mount at ~3832 into globalOverlays) so
[Queue as run] works. REUSE the money path verbatim (enqueueJob / writeIdeaJobMap / buildJobInsert /
idempotencyKeyFor / useIdeas) — do not rewrite it. Author the new copy audit-clean (sentence case, no spy
theming; visible text only). Gates: tsc + tests + build. Two-lens review (Gemini + suerta) on the diff.
Ratify scripts/ratify-5b-wire.mjs intercepting jobs + idea_job_map + ideas (zero live writes). Squash-merge
via GitHub MCP into claude/new-session-3l99vs. QA creds (.env.local) are ephemeral — re-request; build with
.env.local PRESENT (NEXT_PUBLIC_* inline at build time). Keep chat terse (L-3).
```
