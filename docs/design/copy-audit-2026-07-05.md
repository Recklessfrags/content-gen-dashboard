# Site-wide copy audit — 2026-07-05

_Scored against `docs/design/content-style-guide.md` by a 5-way parallel audit (channels · characters ·
casting+queue · dashboards · legacy shell). This is the prioritized remediation backlog. Decisions applied:
rename jargon in **visible text only** (DB columns / enums / pipeline-contract fields untouched); demote
code refs (ADR-005, E1, Tier-1/2, fact_first) to a "Details"/tooltip; sentence case everywhere; weight
destructive/critical copy heavier._

## Verdict

**Every surface grades C or low-B — none reach A/B+, none fail to D.** The pattern is uniform: the app is
**functionally clear but stylistically half-migrated** — action-orientation and descriptive buttons pass
almost everywhere (III.1/III.2 ≈ 3), while **plain-language (I.1) and capitalization (II.1) fail almost
everywhere** (≈ 1–2). Two things cause most of the damage:

1. **One CSS rule forces ALL-CAPS mono on every label** (highest-leverage single fix).
2. **Implementation tokens + spy/terminal theming leak into user copy**, including the app's
   highest-stakes money/destructive confirmations.

| Surface | Grade | Worst offense |
|---|---|---|
| Dossier editor _(shared: legacy + Aurora bench)_ | **C (1.67)** | `dossier`/`field manual`/`manual`/`bible` sprawl; `UNPERSISTED CHANGES IN BUFFER`; two destructive dialogs bury the consequence |
| Legacy **Wire** (ideas) | **C− (1.8)** | `TRANSMITTING FREQUENCY · LOG NEW BEAT`, spy placeholders, `Active/Draft Field Manuals` |
| Cost Center | **C (2.0)** | `[LIMIT EXCEEDED]` badge; raw `error.message`; `SYSTEM REGULATION` wall |
| QueueActionDialog _(money)_ | **C (2.0)** | `fact_approved=true`/`spend_approved=true` tokens + ALL-CAPS on the highest-stakes screen |
| Casting Studio _(money)_ | **C (2.0)** | Lock never states "creates a paid voice + deletes the old one"; raw `model_id`/`guidance_scale` |
| Legacy Queue | **C (2.0)** | "dispatch a target run… engage the worker engines"; misleading spend-approval default |
| Channel form | **C (2.11)** | `ADR-005`/`Tier-1/2`/`fact_first` wall; 5 jargon dials; ALL-CAPS mono labels |
| Enqueue idea | **C (2.1)** | `TRANSMIT ENQUEUE SIGNAL`; `The Wire`; spy brand warning |
| Legacy Roster | **C (2.1)** | (shares the dossier editor) |
| ActionCenter _(money)_ | **C (2.2)** | Same spend/fact tokens; `Transmitting…` labels |
| Compare dialog | **C (2.22)** | `Dossier Revision Comparison`; `[ MODIFIED ]` chips |
| Overview | **C (2.33)** | `Roster Dossier`, `The Wire Queue`, `Sentinel Pass Rate` metric labels |
| Visual identity | **C (2.4)** | `ARCHIVE CORRUPTED` alarmism; `dossier` |
| Characters hub | **C (2.44)** | empty state has no first action; `persona`/`field manual` sprawl; raw error |
| History drawer | **C (2.44)** | `codename`/`bible`/`dossier`/`manual` for one concept |
| Channels hub | **C (2.44)** | error dumps raw string, no retry; `Root Objects & Production Lines` |
| Rail nav (legacy) | **B− (2.6)** | `The Wire`, `Roster`, `CONTROL·ROOM` |
| Runs (legacy) | **B− (2.6)** | leaks `Supabase` in the empty state |
| Channel workspace | **B (2.67)** | `E1 Persona Advisory`; `Phase 3` leak; `dossier`↔`bible` |
| Hub landing | **B (2.78)** | `// ACTION CENTER` code-comment eyebrows |

**Site-wide ≈ C (2.2).**

---

## Two systemic fixes that clear most findings at once

### S1 — Strip the ALL-CAPS-mono label styling (one CSS change, app-wide)
`globals.css` sets `text-transform:uppercase` (+ monospace) on `.eyebrow`, `.filecode`, `.col-head h2`,
`.navbtn` (~lines 22/29/39/51). **Every label authored in sentence case still renders ALL-CAPS mono.** This
is the single largest cluster of II.1/C2 violations across *every* surface. Fix the CSS (remove the
uppercase transform; reserve monospace for genuine IDs/enums) and the bulk of the casing findings vanish
without touching a single string. **Do this first** — it also de-risks the individual string edits (they'll
render as written).

### S2 — Display-label rename map (visible text only; DB/enums/pipeline untouched)
| Current label | → New label | Underlying (unchanged) |
|---|---|---|
| Treatment | **Style** | `treatment` enum |
| Packaging / Title style + Thumbnail style | **Title & thumbnail** | `packaging` jsonb |
| Source ladder | **Footage sources** | `source_ladder` |
| Arousal ceiling | **Intensity limit** | `engagement_posture.arousal_ceiling` |
| Claim discipline | **Fact-check strictness** | `engagement_posture.claim_discipline` |
| Codename | **Name** | `codename` field/prop |
| dossier / field manual / manual / bible | **character profile** (pick one, use everywhere) | `bible`, `character_bible_revisions` |
| roster / persona | **character(s)** | — |
| The Wire | **Ideas** | — |
| TOPIC / FOOD | **Topic** | `food` column |
| ADR-005 / E1 / Tier-1/Tier-2 / fact_first / conservative / Phase 3 | demote to **"Details"/tooltip** | contract values |

---

## P0 — Blockers (money · destructive · accessibility). Fix at the source; several are shared components.

> **Shared-component leverage:** `renderDossierEditor` (ControlRoom) renders in **both** the legacy roster
> **and** the Aurora characters bench → its fixes land in both. The park/approval copy in
> `QueueActionDialog` also drives the Aurora **ActionCenter** → fix once, both correct.

1. **Money confirmations — strip contract tokens, state the plain consequence.**
   `QueueActionDialog.tsx` + `ActionCenter.tsx` (+ legacy queue park dialogs `ControlRoom.tsx:3515-3595`):
   - Fact approve → drop `fact_approved=true`: *"Approve the flagged claims for "{topic}". This starts a fresh
     run marked fact-approved; the paused version is kept as an audit record."*
   - Spend approve → drop `spend_approved=true`, name the cost: *"Approve extra spend for "{topic}". This
     re-runs the script live and will incur cost — you're approving the plan, not a saved render. A spending
     cap still applies."*
   - **Misleading default (weighted Blocker):** the "unresolved park" dialog admits it may not be a spend
     hold, yet the only/default button authorizes spend. Make **"Open run details"** the default; demote
     spend-approve to a secondary/destructive-styled action.
   - Publish → fix the contradiction ("posts" but "nothing posts"): *"Approving publishes the reviewed video
     as-is (no re-render, no extra cost). Publishing isn't connected yet, so nothing will actually post."*
   - Kill `TRANSMITTING…` progress labels → `Approving…` / `Publishing…`.
2. **Casting lock confirmation must state the consequence** (`CastingStudioPanel.tsx` ~1276-1332): it creates
   a **paid** voice and **permanently deletes the current one** — say so at the point of action. Confirm
   button → "Cast & lock voice". Hide raw `model_id`/`guidance_scale`/`seed` behind a plain summary.
3. **Restore & Discard dialogs** (shared dossier editor, `ControlRoom.tsx:374-441`): replace "Confirm
   Restore" / "Are you sure…? → Yes, Restore Draft" and "UNSAVED CHANGES IN BUFFER" with verb-first, plain
   confirms that name the consequence: *"Restore the version from {date}? This replaces your current unsaved
   edits."* → **Restore version**; *"Discard unsaved changes?"* → **Discard changes**.
4. **Raw `error.message` in critical errors (A4)** — appears in Cost, Channels hub, Characters hub, History
   drawer, and 5 legacy load errors. Pattern everywhere: plain sentence + fix, demote the raw string to a
   `<details>`: *"Couldn't load {X}. Check your connection and retry."* Add the missing **Retry** button on
   the Channels-hub error state.
5. **Cost `[LIMIT EXCEEDED]` badge** → **"Over target"**; and the channel-form **`ADR-005`/Tier/`fact_first`
   dials wall** + **`Store channel-level treatment… ADR-005 intent`** description → short plain lead +
   Details (see S2).

---

## P1 — High-leverage (do with S1/S2)
- Apply the **S2 rename map** across all surfaces (display labels only).
- **One term per concept** (S2): retire `dossier`/`field manual`/`manual`/`bible` → *character profile*;
  `roster`/`persona` → *character*; keep `run`/`episode` distinct but consistent per surface.
- **Empty states need a first action:** Characters hub and Overview describe the void but offer no CTA →
  add *"Create your first character"* button / link.
- **`Primary key` / `Root Objects & Production Lines` / `E1 Persona Advisory` / `Persona engine` /
  `Phase 3` / `channel scope column` / `Supabase`** — remove internal-model/roadmap/plumbing leaks.

## P2 — Theming cleanup (mostly legacy, some Aurora)
Kill the vocabulary the guide names: **The Wire · TRANSMITTING FREQUENCY / transmit · Comms down ·
dispatch a target / engage the worker engines · interrogating pipeline · archive / records / purge / stamp /
file · declassifying operations · Sentinel · Roster Dossier · ARCHIVE CORRUPTED**. Most of the Wire/Queue/
rail theming **disappears when the legacy `.cr` shell is deleted** (sub-lane 5g) — but the **dossier
editor** and **ActionCenter** copy survive into Aurora, so fix those regardless.

## P3 — Minor / Nit
Sentence-case remaining title-case strings (falls out of S1 for label elements; a handful are literal
strings — buttons/headers like "New Channel", "Active Jobs", "Save dossier", "Retry Connection"); make
placeholders examples not instructions (`No local target set…` → `e.g. 50.00`); spell out abbreviations
(`eps`→episodes); don't ship roadmap tags as UI (`Runs & cost - Phase 3`).

---

## What's already exemplary (leave alone)
- `ChannelProfilesPanel` **delete confirmation** ("Delete channel "{name}"? Jobs already routed keep working
  via the default profile.") — matches the guide's model destructive-confirm verbatim.
- The **created toast** (`Channel "{x}" created.`) — sentence case, past-tense result.
- Verb-first CTAs throughout (`Generate from concept`, `Save channel`, `Manage all characters →`).
- `JOB_STATUS_LABELS` (`src/lib/jobs.ts`) — already clean sentence case; only the legacy `.toUpperCase()`
  wrapper corrupts it on screen.

## Sequencing recommendation
**S1 (CSS uppercase) → P0 (money/destructive/errors, at the shared sources) → S2 + P1 (rename map + one-term)
→ P2 (theming; largely absorbed by the sub-lane-5g shell deletion) → P3.** S1 + P0 alone lift most surfaces
from C toward B and remove every Blocker; they're also the lowest-risk (CSS + confirmation wording), so
they're the right first remediation lane.
