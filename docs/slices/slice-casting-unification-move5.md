# Slice: SPEC A move 5 — unify casting into one flow (spec, not yet frozen)

From the 2026-08-07 close-out (⭐ SPEC A, move 5 — "own slice"), built **on top of** the
2026-08-09 close-out state: one approval queue on Home, `overview`/`reveal` retired,
workspace tabs = `character` + `guidelines` (`DEFAULT_TAB = "guidelines"`), global
Basic/Advanced toggle gone (each panel owns a local reveal). Folds in the three
FacelessReels-validated patterns named in
`reels-content-generation/docs/research/teardowns/fb-facelessreels-competitor-2026-08-11.md`
§UI/UX 1, 2, 4, plus the queued **required-field markers**, **channel-type demo gallery**
and **bring-your-own character image** items.

Dashboard-only. **No migration.** No new spend path. Builder = Codex; this doc is the
contract. D-2 stands: a focused control tool, not a kanban — this slice *removes*
places, it does not add a hub.

---

## 1. Diagnosis (what "scattered" means, concretely)

Casting a character today means finding **five** disconnected render sites, two of them
modal overlays, with no order and no completion signal:

| # | Surface | Anchor |
|---|---|---|
| 1 | `CharactersHub` grid (pick) | `src/components/ControlRoom.tsx:2387` (props `:1537`) |
| 2 | Dossier editor (create/edit bible + `CharacterGenerator`) | `ControlRoom.tsx:1975` (renderer), `:2430` (render site), `:2061-2071` (generator) |
| 3 | `CastingStudioPanel` **modal** (voice) | `ControlRoom.tsx:1889-1899`, trigger `:2194-2206` |
| 4 | `VisualIdentityPanel` **modal** (face) | `ControlRoom.tsx:1900-1909`, trigger `:2207-2220` |
| 5 | Same two panels **again, inline**, in the workspace Character tab | `ControlRoom.tsx:2654-2663` (visual), `:2667-2677` (voice) |
| 6 | Channel attach, buried in the Guidelines tab form | `ControlRoom.tsx:2790-2800` → `ChannelProfilesPanel.tsx:1002-1020` |

So the voice studio and the visual archive each have **two** render sites (modal +
inline) with different entry points, and the step that makes a character actually
*usable* — attaching it to a channel — lives in a different tab of a different object.
Nothing anywhere says which of these you still owe.

---

## 2. The one walked path

One route, four steps, no modal:

```
?hub=characters   ── the ONLY casting URL (unchanged; no route.ts edit) ──────────────
  Step 1 · Character   pick from the grid  ·or·  create (wizard-framed)
  Step 2 · Voice       preset gallery → Casting Card → audition → lock
  Step 3 · Face        reference image — REQUIRED only for visual-continuity channels
  Step 4 · Channel     attach to a channel (or "not yet")
```

- **Step rail** across the top: `Step N of 4` + step names, with a done/needed marker per
  step (FacelessReels pattern 2 — "one linear wizard with visible progress"). The rail is
  navigable: any completed step is clickable, later steps unlock as prerequisites land.
- **Step state is component state**, exactly like the existing `charactersBenchMode`
  (`ControlRoom.tsx:480`). **`src/lib/route.ts` is not touched** — no new hub, no new
  param, no route-test churn. `?hub=characters` deep links still land on step 1.
- **Channel context is carried in state, not the URL.** `parseScope` treats a `channel`
  param as a *workspace* scope (`route.ts:61-75`), so a `?hub=characters&channel=…` form
  is impossible by construction. Entering the flow from a channel workspace sets
  `castingFlowChannel` (same pattern as `castingSuggestedPersona`, `ControlRoom.tsx:812-816`).
- **Voice-only characters are never nagged for a face.** Step 3 is a *required* step only
  when the flow's channel context is visual-continuity (§5). For `weird_food` / Fine Print
  it renders as an explicitly optional step and the flow completes without it.

### Where the panels live now

The flow is a **thin shell** — a new `src/components/controlroom/CastingFlow.tsx` that owns
step state, the rail and the readiness strip, and renders the **existing** panels as step
bodies. No panel internals are copied, re-implemented or forked.

**`variant` prop lifecycle (build-order contract):** during move 5.1 the panels still carry
`variant` (the modal sites are alive), so `CastingFlow` passes `variant="inline"`. Move 5.3
deletes the modal paths, the `variant` prop from BOTH panels, **and the `variant="inline"`
prop at CastingFlow's call sites in the same commit** — after 5.3 the panels are
inline-only by construction and `tsc` stays clean at every commit boundary.

**Step 4 without a channel context (direct `?hub=characters` entry):** `castingFlowChannel`
is null on that path, and `ChannelProfilesPanel` is only valid with `scopedChannel`. Step 4
therefore renders in two modes: with a channel context → the scoped panel as specced; with
NONE → a lightweight **channel picker** (radio list built from the already-loaded
`channelProfiles` rows — no new fetch) whose selection sets `castingFlowChannel` and mounts
the scoped panel, plus a "Finish without attaching" affordance that completes the flow
(a character with no channel is a legal end state — attach later from the workspace).
`CastingFlow` seeds the step-4 panel's character select with the step-1 character so the
operator never re-picks it (the attach write path itself is untouched).

**Shell ↔ panel contract (the shell must KNOW when a step lands):** the re-homed panels
gain minimal, additive completion props — no behavior change for other callers:
- `CastingStudioPanel`: `onVoiceLocked?: (voiceId: string) => void`, fired after the
  existing lock write resolves → shell marks step 2 done and advances.
- `VisualIdentityPanel`: `onImageLocked?: () => void`, fired after the existing upload/lock
  resolves → shell marks step 3 done.
- `ChannelProfilesPanel`: `initialCharacterId?: string` (seeds the character select —
  the ledger row in §3 is amended accordingly) and `onSaved?: () => void`, fired after its
  existing save resolves → shell renders the flow's completion state ("Cast complete",
  chips recap, "Back to characters"), never stranding the operator on step 4.
- The step-4 channel picker keeps a "change channel ↩" affordance visible while the scoped
  panel is mounted on the null-context path (clears `castingFlowChannel` back to the
  picker without losing panel state elsewhere).
All callbacks are optional with no-op defaults, so every existing render site compiles
unchanged; the flow is their only consumer in this slice.

---

## 3. Component ledger — reused / re-homed / deleted

| Component | Verdict | What happens |
|---|---|---|
| `aurora/CharactersHub.tsx` | **reused as-is** | becomes step 1's body. Props unchanged (`ControlRoom.tsx:1537-1551`). The "Back to Channels" button stays. |
| `controlroom/CharacterGenerator.tsx` | **reused as-is** | stays inside the dossier editor (`ControlRoom.tsx:2061-2071`), now framed as step 1's "describe it and we'll draft it" affordance. No prop change. |
| dossier editor (`renderDossierEditor`, `ControlRoom.tsx:1975`) | **re-homed** | rendered as step 1's edit body instead of the `charactersBenchMode === "editor"` branch (`:2419-2432`). Same renderer, new host. |
| `controlroom/CastingStudioPanel.tsx` | **re-homed + trimmed** | body becomes step 2. Inline path (`:1545-1554`) is kept; the **modal path is deleted** (`:1556-1568`, `useScrollLock(!inline)` `:262`, the outer `useFocusTrap` `:293-301`, the `← Back` close button `:918-923`, the `variant` prop `:86`/`:166`/`:169`). Nested dialogs (save-template `:1303`, lock-confirm `:1361`) stay. |
| `controlroom/VisualIdentityPanel.tsx` | **re-homed + trimmed** | body becomes step 3. Inline path (`:392-398`) kept; **modal path deleted** (`:400-412`, `useScrollLock(!inline)` `:77`, `useFocusTrap` `:79-85`, close button `:242-252`, the `variant` prop `:29`/`:41`/`:43`). |
| `controlroom/ChannelProfilesPanel.tsx` | **reused, render-scoped** | gains `sections?: ("character")[]`, valid **only** with `scopedChannel`. Step 4 renders it with `sections={["character"]}` → only the Character & voice section (`:992-1020`). Save path untouched. |
| `ControlRoom.tsx:1889-1899` (casting modal site) | **DELETED** | with `castingOpen` (`:465`), `closeCasting` (`:818-821`), `castingTriggerRef` (`:518`) and the savebar trigger `:2194-2206`. |
| `ControlRoom.tsx:1900-1909` (visual modal site) | **DELETED** | with `visualCastingOpen` (`:467`), `closeVisualCasting` (`:1863-1865`), `visualCastingTriggerRef` (`:519`) and the savebar trigger `:2207-2220`. |
| `ControlRoom.tsx:2614-2679` (workspace inline stack) | **DELETED, replaced** | the Character tab renders a compact **cast status card** (avatar, codename, voice/face/attach chips from §5) + one primary "Open casting →" that enters the flow at the first unmet step with `castingFlowChannel = scope.channel`. The "Manage all characters →" link (`:2598-2611`) and the no-character empty state (`:2681-2749`) collapse into that one button. |
| `handleUseInCasting` (`ControlRoom.tsx:812-816`) | **rewired** | sets the character + suggested persona, then opens the flow at **step 2**, instead of `setCastingOpen(true)`. Callers unchanged (`:2365`, `:2798`). |
| `DossierVisualAttachment` (`ControlRoom.tsx:249`, render `:2009`) | **kept** | read-only thumbnail in the dossier header; not a casting entry point. |
| `lib/castBrief.ts`, `lib/castingPhrases.ts`, `lib/casting.ts`, `lib/castingVisual.ts`, `lib/voiceTemplates.ts` | **untouched** | |

Net: **six casting entry points → one**; two overlays retired; two `variant` branches deleted.

---

## 4. FacelessReels patterns, folded only where they fit

**Pattern 2 — linear wizard with visible progress** → the step rail above. Ours is 4 steps,
not 8, and the pro surfaces stay *inside* the steps rather than behind them (their trade is
depth-for-speed; ours is the opposite and D-2 says keep it).

**Pattern 4 — a fast default path for voice** → **preset-voice gallery at the top of step 2**.
This is the existing template drawer (`CastingStudioPanel.tsx:971-991`, trigger `:926-928`)
re-framed from an archive drawer into the step's first, always-visible choice:

- Cards = the operator's `voice_templates` rows (existing table, `dash_0004`) **plus** a
  curated starter set of 4–6 recipes shipped as a static constant
  `src/lib/castingPresets.ts`, with the human-owned content source of truth in
  `docs/design/casting-voice-presets.md` (same split as `castingPhrases.ts` ↔
  `docs/design/casting-phrase-bank.md`). Each card: name, **one-line personality**
  ("the deadpan explainer who never accuses"), and the recipe tags already rendered by
  `renderTemplateCard` (`:846-905`).
- "Use this voice" = the existing `handleApplyTemplate` (`:466-489`) — it **stages the
  recipe locally, spends nothing**. The audition and the lock stay exactly where they are:
  behind the existing capped `casting-proxy` design/create calls and the operator audition
  gate (a ruled decision, §5 of the 2026-07-02 lock list — do not weaken it).
- We deliberately do **not** copy their pre-rendered voice previews: that would mean
  generating and hosting sample audio (operator spend + storage). The drawer's existing
  honest notice ("previews unavailable — load profile to audition") is kept. See open
  question Q2.

**Pattern 1 — preview-first choices** → **`ChannelTypeGallery`** in the New-channel surface
(`ControlRoom.tsx:2340-2374`, above the `createOnly` `ChannelProfilesPanel` at `:2357-2370`),
per the handoff's 2026-08-07 note. Cards: type name, demo media, one-line "what it's good
for", "Use this type" → seeds `description` + `treatment` into the create form. **This is
where the walked path begins for a new channel, and it is the only thing in this slice that
touches channel creation** — it is not a new hub. Ships with poster images first; motion
clips only when hosted (Q3).

**Not adopted:** the "Series" autopilot object (enqueue-side, not move 5), auto-posting
(our approval gate is a feature), and their claim style. Recorded so a later session does
not read the teardown as a mandate.

---

## 5. The two-tier required-field model (handoff, 2026-08-07)

One pure module, `src/lib/castingReadiness.ts` — no I/O, fully unit-testable, and the
single source for every marker, chip and rail state:

```
requiredToSave(character)   → Name (codename) · Concept · bible-with-content (≥1 BIBLE_FIELD non-empty)
requiredToUse(character, attachedProfiles)
                            → locked voice (isCast, casting.ts:392)
                            → reference image (isVisuallyCast, castingVisual.ts:24)
                                 ONLY IF some attached profile requiresVisualContinuity
requiresVisualContinuity(profile)
                            → profile.treatment === "avatar"          → required
                            → profile.treatment === "motion_graphic"  → recommended (never blocking)
                            → "archival_documentary" | "live_demo" | null → not asked
```

`treatment` already exists on `channel_profiles` with exactly that closed vocabulary
(`channelProfiles.ts:41-47`) and is **dashboard-only — the pipeline never reads it**
(`channelFieldConsumption.ts:59-63`). That is why this costs **zero schema change**: the
visual-continuity question is answered by a field we already own. If a character is
attached to more than one channel, required = required by **any** attached channel; with no
channel attached, the face step is optional.

Surfacing rules:

1. Required-to-save fields carry a `Required` marker in the dossier editor; the bible
   fields carry a "needs at least one" hint on the group, not per field.
2. **Enforcement is create-only.** Save is disabled for an unsaved draft that fails
   `requiredToSave`; for an already-persisted character the marker is a nudge and Save
   stays enabled — existing rows (some pre-date the concept field) must never become
   unsavable.
3. Required-to-use renders as the rail's readiness strip: "Ready to use" badge, or a
   `Needed: …` list. A voice-only character on a `weird_food`-shaped channel shows
   **Ready to use** with no image on file — this is the anti-nag guarantee and it is a
   gate (§7 AC-4).
4. **Bring-your-own character image (queued item):** step 3's empty-state copy
   (`VisualIdentityPanel.tsx:277-299`) is reframed from "generate elsewhere, then upload"
   to welcome a selfie, a drawing or a generated render. Copy only. HEIC/HEIF is **not**
   added here — browsers cannot render a HEIC `createObjectURL` preview, so it needs a
   conversion step; see out-of-scope.

---

## 6. Build plan — cheapest first, one reviewed commit each

| Move | What | Depends on |
|---|---|---|
| **5.0** | `src/lib/castingReadiness.ts` + vitest. Pure functions only; **zero render change**. | — |
| **5.1** | `CastingFlow.tsx` shell: rail, step state, steps 1–3 hosting the existing inline panels; `?hub=characters` renders it. Modals still exist and still work → independently shippable. | 5.0 |
| **5.2** | Re-home the workspace Character tab to the cast status card + "Open casting →" (deletes `ControlRoom.tsx:2614-2679`, `:2681-2749`). | 5.1 |
| **5.3** | Delete both modal render sites + savebar triggers + the `variant="modal"` branches in both panels + now-dead state/refs. Pure deletion. | 5.1, 5.2 |
| **5.4** | Required-field markers + readiness strip wired from 5.0; BYO-image copy reframe. | 5.0, 5.1 |
| **5.5** | Voice preset gallery: drawer → first-class gallery, `castingPresets.ts` + `docs/design/casting-voice-presets.md`. | 5.1 |
| **5.6** | Step 4: `ChannelProfilesPanel` `sections` prop + attach step. | 5.1 |
| **5.7** | `ChannelTypeGallery` in the New-channel surface (poster cards; clips gated on Q3). May split off if assets are not ready — nothing else depends on it. | — |

Gates run on the real artifact after **every** move: `npx tsc --noEmit` clean · full vitest
green · `next build` green. Gemini cross-vendor review before merge, findings verified
against reality (the 2026-08-09 rule that earned its cost twice).

---

## 7. Acceptance criteria (falsifiable, measured on the real artifact)

Walks use the ratify harness (prod build, dedicated port, Supabase bridge, intercept-and-abort
for writes). **Each measures an experienced property — presence-only gates false-pass.**

- **AC-1 · one destination.** A walk that completes character → voice-lock (intercepted) →
  face-skip → attach (intercepted) asserts `location.search === "?hub=characters"` at every
  step boundary, and `document.querySelectorAll('[role="dialog"][aria-modal="true"]').length
  === 0` throughout except while the lock-confirm dialog is deliberately open.
- **AC-2 · the modals are gone, not hidden.** At no point in the walk does
  `.history-layer`, `.visual-studio-layer`, `.casting-panel` or `.visual-studio-modal`
  exist in the DOM;
  and the character savebar exposes no "Cast a voice"/"Cast visual" button (query by
  accessible name, not by class).
- **AC-3 · progress is real.** The rail reads `Step 1 of 4` on entry and `Step 2 of 4`
  after the first save **without a document navigation** (assert the same `performance`
  navigation id / no `load` event between the two reads). Clicking a completed step in the
  rail returns to it; clicking an unmet later step does nothing (assert `disabled` **and**
  that the step body did not change).
- **AC-4 · voice-only characters are never nagged.** Enter the flow with the live
  `weird_food` profile (`treatment = archival_documentary`) and a character with
  `reference_image_url = null`: the readiness strip shows **Ready to use**, the `Needed:`
  list contains no image entry, and step 3's heading carries the word "Optional".
  Mirror gate with an intercepted profile carrying `treatment = "avatar"`: the same
  character now shows the image under `Needed:` and the **Ready to use** badge is absent.
  Unit-level: `requiresVisualContinuity` truth table over all four `TREATMENT` values.
- **AC-5 · the preset gallery spends nothing.** Clicking a preset card changes the
  `#casting-description` textarea value (compare before/after; assert it contains the
  preset's signature phrase) while a request counter on `**/functions/v1/casting-proxy`
  reads **0**. The audition button remains the only thing that raises it.
- **AC-6 · caps unchanged.** Intercept-and-abort the design POST: payload has
  `action: "design"` and no new fields; the "casts left" readout still derives from the
  same `castsLeft` source, and `CASTING_DAILY_CAP` is still 25 (`casting.ts:33`).
  `character-proxy` and `channel-guideline-proxy` request counts over the whole walk: 0
  and 0 unless their own buttons are pressed.
- **AC-7 · attach writes exactly what it says.** Step 4 confirm issues **one**
  `channel_profiles` upsert; the captured payload has `character_id` = the picked id,
  `character` = its codename, and **every other field byte-equal to the row read before
  the walk**. Zero live writes (aborted).
- **AC-8 · no route surface change.** `git diff --stat src/lib/route.ts` is empty and the
  existing route tests pass unmodified.
- **AC-9 · no schema change.** `git status` shows no file under `supabase/migrations/`;
  the walk's network log contains no request to a table or column outside the current
  `database.types.ts`.
- **AC-10 · mobile.** At 412px the rail is reachable without horizontal scroll (measure
  `scrollWidth <= clientWidth` on the document), and the step's primary action's bounding
  box does not intersect the fixed savebar. Spot-check the known 481–620px coarse band
  (mobile batch-1 residual 1).
- **AC-11 · channel-type gallery.** "Use this type" sets the create form's description and
  `treatment` inputs to the card's values (read the input values, not the click); each
  card's media element has a `poster`, is `muted` and `playsInline`, and no card autoplays
  audio.
- **AC-12 · nothing regressed behind the flow.** Full vitest green including
  `ControlRoom.character-generator.test.tsx`, `CharacterGenerator.test.tsx`,
  `ChannelProfilesPanel.save.test.tsx`; `next build` green.

---

## 8. Constraints this slice holds

- **Zero schema changes.** Everything used already exists: `characters.voice_id` /
  `voice_recipe` / `reference_image_url` / `visual_style`, `channel_profiles.character_id` /
  `character` / `treatment`, `voice_templates` (`dash_0004`). **If any of Q2/Q3 is answered
  in a way that needs a table (pre-rendered preview audio, a `channel_types` reference
  table), that is a GATING item — stop and spec it separately; do not fold a migration into
  move 5.**
- **No new spend paths.** `casting-proxy` design/create/tts and `character-proxy` are called
  exactly as today, under the same per-user daily caps. Preset cards are local recipe
  application. Demo-gallery media is static/hosted, never generated on view.
- **Single-tenant now, multi-tenant friendly.** No new global singletons and no
  operator-specific assumptions: presets read `voice_templates` through the existing
  RLS-scoped query, curated presets are read-only content constants, readiness is computed
  per (character, its attached profiles) with no cross-user cache. New client-side storage:
  none beyond the existing character-id-keyed `cast_brief_*` / bracket keys.
- **Shared-surface caution.** Step 4 writes `channel_profiles` — through the *existing*
  `ChannelProfilesPanel` save, not a new write path, so no new RLS or contract surface.
  Standing delegation still reads "shared surfaces need a problem-solver GO"; see Q1.
- **D-2 / D-6.** The channel stays the root object; the flow is reached *from* a channel and
  ends by attaching *to* one. No board, no kanban, no new hub.

---

## 9. Explicitly out of scope

- The **"Series"/autopilot** object and any scheduled auto-enqueue (teardown §3) — enqueue
  side, product-direction call, not move 5.
- **Publishing / auto-posting / platform connections** — approval-gated by ruling.
- **Casting 2b in-dashboard visual candidate generation** — ruled Option 3 but deferred,
  provider fork still open (§4.B). Step 3 remains upload-only.
- **HEIC/HEIF upload** — needs a client-side conversion (no browser preview); its own tiny
  slice. Copy reframe only here.
- **Pre-rendered voice previews / demo-clip production** — operator spend + hosting (Q2/Q3).
- **`route.ts` changes, the `ControlRoom.tsx` split, per-user isolation (SPEC B),
  `ReviewHub`/scoring, the per-channel caption toggle, any pipeline change, any migration.**
- Re-opening ruled decisions: the Casting Card input model, the `eleven_ttv_v3` pin, the
  operator audition gate before lock, the static persona bank.

---

## 10. Open questions (architect / operator)

- **Q1 — merge gate.** Step 4 saves `channel_profiles` through the existing panel path.
  Does the standing self-merge delegation cover it (no new write path, no schema change),
  or does the shared-table rule still demand a problem-solver GO on the PR? *Recommendation:
  treat 5.6 alone as PS-GO, self-merge the rest.* **Architect.**
- **Q2 — preset voice previews.** FacelessReels' preset cards play audio; ours cannot
  without generating and hosting sample mp3s (one-time operator spend, plus a storage
  location and a "which voice" curation call). Ship text-only personality cards now and
  revisit? *Recommendation: yes, text-only now.* **Operator.**
- **Q3 — demo-clip hosting.** The handoff names existing prototype reels
  (`stickwick_procedural.mp4`, `datachan_sugar_ranking.mp4`, `sim_plinko_race.mp4`, …) as
  the seed content; they live in the pipeline repo. Commit them to the dashboard repo
  (bloat), or serve from the already-public `render-assets` bucket via the existing
  `renderVideoUrl` helper (`src/lib/renderAssets.ts`)? *Recommendation: bucket; 5.7 ships
  poster-only until the clips are uploaded.* **Operator.**
- **Q4 — channel-type list.** Which channel types get cards, and does each card's "Use this
  type" seed only `description` + `treatment`, or a fuller guideline preset? The former is
  zero-risk; the latter overlaps the existing generate-from-concept path
  (`ChannelProfilesPanel.tsx:897-910`). *Recommendation: description + treatment only.*
  **Operator.**
- **Q5 — visual-continuity vocabulary. ANSWERED (architect, verified against reality
  2026-08-11).** `treatment === "avatar"` is ACCEPTED as the gate, with the nuance on
  record: the pipeline reads NEITHER `treatment` NOR `characters.reference_image_url`
  (verified: zero matches in pipeline `src/`), so this predicate is a dashboard-only UX
  advisory over a field nothing downstream consumes yet. The apparent counterexample —
  dark_history/Mad Dog is a visual-continuity character (locked decision) but its
  `treatment` is `archival_documentary` — is NOT a defect: Mad Dog's continuity is
  pipeline-side (locked reference image + clip bank), not driven by the dashboard image,
  and dark_history renders have shipped with `reference_image_url = null`. When the
  pipeline gains a real visual-continuity flag (e.g. via the locked_character source-ladder
  contract), `requiresVisualContinuity` is the one place to re-point — and at that moment
  the Mad Dog case must be re-checked against the new signal.
