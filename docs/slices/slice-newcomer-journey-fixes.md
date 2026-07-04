# Slice — Newcomer-journey fixes (create-a-channel decoy + production readiness)

_Status: **SPEC — draft**, Architect (Claude), 2026-07-04. Source: the agentic first-time-operator
walkthrough ("AUDIT — Deep Sea," 2026-07-04) that drove a new niche channel start-to-finish. This slice
specs the two journey findings that are lane-sized; the small ones (#3 persona-from-concept, #5 no stub
character) shipped separately as direct fixes, and #2/#6 (legacy paradigm switch, duplicate casting
paths) fold into the legacy-shell retirement / casting re-theme already specced._

---

## 1. Finding #1 — the hub "New Channel" CTA is a decoy (highest priority)

**Current behavior (code-confirmed):** the Channels-hub primary CTA is wired
`onNewChannel: () => openLegacyConsole("channels")` (`ControlRoom.tsx`). That drops the operator into the
dense legacy console with the **existing** channel pre-selected in "EDITING ROW" mode — not a blank
new-channel form. A first-timer can start editing (and Save-overwriting) the live `default` channel
believing they're creating their own. This is a UI-induced near-miss on established data.

**Fix (two tiers):**
- **Immediate (low-risk):** point the hub CTA at a *start-new* action that lands on a **blank NEW ROW**
  (the legacy `ChannelProfilesPanel` already has a "+ New channel" that opens an unsaved new row) — never
  pre-selecting an existing channel. Confirm the panel opens with empty fields and the master list's
  existing rows are read-only until explicitly chosen. Relabel the CTA only if still ambiguous.
- **Durable (folds into the Aurora character-bench work):** an **Aurora-native "New channel" form**
  (modal or inline on the hub) that writes a fresh `channel_profiles` row without ever entering the legacy
  console — removing the paradigm switch (#2) at the same time.

**Gates (falsifiable, QA creds; intercept-and-abort):**
1. Clicking "+ New Channel" lands on a blank create form — no existing channel (esp. `default`) is
   pre-selected or shown in edit mode.
2. Completing it writes a **new** `channel_profiles` row (intercepted payload has a new codename), and
   **no PATCH/upsert targets `default`** at any point in the flow.
3. Abandoning the create writes nothing (mirror the #5 no-stub guarantee for channels if the immediate
   tier still eager-creates — prefer defer-to-save).

---

## 2. Finding #4 — no production-readiness model (dead-end after casting)

**Current behavior:** after locking a voice + visual, the operator lands on the Production tab's honest
"pending pipeline data" placeholder. There is no signal that the channel is (or isn't) production-ready
and no checklist of what remains. The journey has no closing confirmation.

**Fix:** a **per-channel readiness checklist**, read-derived from existing data (no new tables, no
fabricated production/cost numbers). Surface it on the Production tab (and optionally a compact form in
the workspace header). Items, each ✓/○ from live state:
- **Guidelines set** — `channel_profiles` has the core dials / a non-empty description.
- **Character assigned** — `channel_profiles.character_id` non-null (FK, Phase-2 Lane 1).
- **Voice locked** — the linked character's `voice_id` is non-null (`isCast`).
- **Visual locked** — the linked character's `reference_image_url` is non-null (`isVisuallyCast`).
- (Advisory) **Production** — remains DEFERRED with the honest data-blocked note already shipped.

Each unmet item links to the tab/action that satisfies it (Guidelines / Character). "Production-ready"
= all four met (production itself still gated on pipeline channel-tagging — the checklist is about the
dashboard-owned prerequisites, not a promise of runs).

**Gates:** readiness reflects live state exactly (e.g. the current `default`→Fine Print shows Voice ✓ /
Visual ○); no fabricated per-channel production or cost; AA at 412/mid/1440; each row's link reaches the
right surface; reachable + keyboard/focus.

**Effort:** Low–Medium — pure read-derived UI over `channel_profiles` + the resolved character; no
migration, no shared seam.

---

## 3. Folded elsewhere (not this slice)

- **#2 (every create path throws you into the legacy terminal console)** and **#6 (the legacy roster's
  own Casting/Visual buttons duplicate the inline workspace Casting Studio / Visual Identity)** — both are
  symptoms of the two-shell interim. They resolve when the **legacy roster is retired** by the global
  Aurora **character bench** (the prerequisite already tracked since Lane 5). The casting/visual
  duplication specifically closes once the bench re-homes character CRUD and the legacy savebar goes away.
- **Inline casting theme + labels** → `slice-casting-aurora-retheme.md`.
- **#3 (persona from concept), #5 (no stub character on create), inverted button colors on the inline
  "Currently cast" notice** → shipped as direct fixes (audit + walkthrough follow-ups).

---

## 4. Recommendation / sequencing

1. **#1 immediate tier** — small, high-safety (stops the overwrite-the-default footgun). Do next.
2. **#4 readiness checklist** — small, closes the journey's dead-end. Do next.
3. **#1 durable tier + #2/#6** — fold into the **Aurora character-bench / legacy-shell retirement** lane
   (the big one that also finishes what Lane 5 started). Spec that lane when prioritized.
