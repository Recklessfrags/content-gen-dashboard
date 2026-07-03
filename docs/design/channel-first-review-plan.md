# Channel-first — review & risk plan (Phases 1–3)

_Status: **process plan** (Architect, 2026-07-02), operator-directed ("dangers + pipeline
cooperation in this build → thorough reviews, higher-thinking reviews for certain tasks").
Binds the review staffing + model tier for the channel-first initiative. Canonical rules:
`governance.md` (esp. 4, 14, 22, 24, 30–34), `AGENTS.md` L-2/L-4/L-5. This plan does not
override governance; it right-sizes the review gate per task per rule 33._

---

## 1. Principle

**Right-size, don't minimize (rule 30).** Two distinct review lenses are the floor on anything
touching a **migration, a money path, or a shared cross-team contract** (L-4): **Gemini
(cross-vendor anchor — ALWAYS required, rule 4)** + **suerta (independent Claude, L-2)**. For the
**highest-stakes tasks**, the suerta seat is **escalated from Opus (default) to Fable-5 (top
tier)** per L-5 — this is what "higher-thinking reviews for certain tasks" means here. Pure-visual
/ IA re-parenting of non-money surfaces uses the default tier (no escalation).

Escalation is **by task, not by phase** — a phase mixes low- and high-stakes work.

---

## 2. Danger surface (what can actually go wrong)

| # | Danger | Phase | Class |
| --- | --- | --- | --- |
| D-a | **Money path:** Action Center inline approve/reject wrongly triggers **spend** or **publish** (or bypasses the double-gate). | 1 | money |
| D-b | **Shared-contract migration:** altering/dropping `channel_profiles.character` (pipeline worker may read it) or adding the `character_id` FK unsafely on the **live shared DB**. | 2 | migration + cross-team contract |
| D-c | **Cross-team threading:** building the job→episode join before the pipeline emits the correlation key → silently wrong/lossy threading presented as real. | 3 | cross-team contract |
| D-d | **Idempotency-map migration:** the dashboard-owned `idempotency_key ↔ ideas.id` map (a `dash_*` migration) mis-keyed → wrong idea→job attribution. | 3 | migration |
| D-e | **Channel-scoping dishonesty:** a per-channel Runs/Cost view that shows global-or-empty data as if scoped (episodes has no channel column). | 1 | correctness/trust |
| D-f | **Regression / "nothing lost":** the full visual rebuild + monolith split drops a capability or ships broken past green gates (ledger: #46/#47). | 1 | regression |
| D-g | **State leak:** Fork-A components leak one channel's data into another (not cleanly `channelId`-prop-driven). | 1 | correctness |

---

## 3. Cross-team (pipeline) cooperation protocol

The pipeline is a **separate repo/workforce, out of this session's GitHub scope.** Coordination is
via the HQ 📮 Coordination Log (child pages, rule 34). Hard gates:

1. **Before ANY shared-seam migration (D-b):** file an **HQ heads-up** and **confirm whether the
   pipeline worker reads `channel_profiles.character`** (grep-verified answer from the pipeline,
   not an assumption — rule 33 / the Correction-2 lesson). Expand/contract only: add nullable
   `character_id` + backfill, **keep `character` live** until the worker is confirmed migrated
   off, THEN drop. Never a column swap.
2. **Before building Phase-3 job→episode threading (D-c):** **fresh-fetch the HQ ask** "Dashboard →
   Pipeline — ASK: emit a job↔episode correlation key" (filed 2026-07-02) and check its status
   (L-1 — never claim a cross-team state from a cached view). If not landed: ship **only** the
   honest deferred state (slice §4); do **not** build the heuristic (it's Phase 3, and even then
   labeled "matched approximately").
   - **UPDATE 2026-07-03 — Pipeline ANSWERED: FEASIBLE, QUEUED (not started).** Agreed key =
     additive nullable **`episodes.correlation_key`**; the worker echoes the job's
     `idempotency_key` onto it at `begin_episode` (chosen over `job_id→episode_id` because the
     worker carries `idempotency_key` end-to-end and it survives resumes). Read-only for us;
     legacy/absent rows fall back to today's `food`+`character_id`+window match. **owner-to-act =
     OPERATOR to sequence** (shared-`episodes`-schema migration + live-worker write; pipeline won't
     start unprompted). Non-blocking — ship best-effort meanwhile; pipeline posts a
     migration/worker-write heads-up when it lands. **Phase-3 join chain becomes:** `ideas.id` ↔
     `idempotency_key` (our dashboard-owned map) ↔ `episodes.correlation_key` (pipeline echo).
3. **Live migration apply (Supabase MCP):** HQ heads-up → apply → verify structure → negative
   contract tests → **VALIDATE as a separate step.** Never fold apply+validate.
4. **Casting-proxy edge function** (if touched): redeploy via Supabase MCP, keep `verify_jwt:true`
   — it's shared/live, not branch-scoped.

---

## 4. Review gate by task (staffing + model tier)

Legend: **G** = Gemini cross-vendor (rule 4, always). **S(Opus)** = suerta default. **S(Fable-5)**
= suerta escalated to top tier. **HQ** = cross-team heads-up/verify. **Ratify** = browser gates on
the real artifact (slice §10), re-walked after any merge conflict resolution.

| Task | Dangers | Spec review | Build review | Extra |
| --- | --- | --- | --- | --- |
| Design system + hub + workspace shell + re-parenting **non-money** surfaces (Character/Guidelines/Cost-global/Overview/Ideas) | D-e, D-f, D-g | G (done) | **G + S(Opus)** | Ratify |
| **Action Center** (money-path inline approve/publish) | **D-a**, D-g | G (done) | **G + S(Fable-5)** ⬆ | Ratify: assert intercepted payloads + double-gate intact |
| **Phase 2 — `character_id` FK migration** (expand) | **D-b** | **G + S(Fable-5)** ⬆ | **G + S(Fable-5)** ⬆ | **HQ before touch** (confirm worker consumption); Supabase gated apply + VALIDATE |
| Phase 2 — casting de-modaled Character surface | (UI) | G | G + S(Opus) | Ratify |
| **Phase 3 — idempotency-map migration (D-d)** | **D-d** | **G + S(Fable-5)** ⬆ | **G + S(Fable-5)** ⬆ | Supabase gated apply + VALIDATE |
| **Phase 3 — job→episode join** | **D-c** | G + S(Fable-5) ⬆ | G + S(Fable-5) ⬆ | **HQ ask gate** (verify correlation key landed); else deferred-only |
| Phase 3 — Production thread UI + onboarding routing | D-e | G | G + S(Opus) | Ratify |

**Author-side top-tier consult (L-5):** the Architect may run the hardest *design* forks on
Fable-5 too — the Phase-2 expand/contract sequencing and the URL-routing/App-Router state model
are the candidates — before writing the builder block, not just at review time.

---

## 5. Non-negotiable review disciplines (all tasks)

- **Adversarial, not confirmatory:** reviewers are prompted to *find the break*, and their
  verdicts are **verified against reality** like any reviewer's (the gemini.sh empty-prompt and
  the #46/#47 dead-code lessons — a green verdict on a broken artifact is the failure mode).
- **Floor ≠ done:** every gate asks "could this pass while the thing I care about is broken?"
  Gates measure the **experienced property** (payloads, reachability, scoping counts, contrast),
  never mere presence.
- **suerta is additive, never a substitute** for the cross-vendor seat (rule 4 stands; suerta is
  same-vendor).
- **Re-walk the merged result** after any conflict resolution.
- **Generative quality has no programmatic gate** — not in scope here, but the visual "first-class"
  bar is partly taste → the **operator's eye is a gate** on the design-system output.

---

## 6. What this changes in the specs

- `slice-channel-first-phase1.md` §11 already flags a suerta pass; this plan **sets its tier**:
  **S(Fable-5)** for the Action Center slice, **S(Opus)** for the rest of Phase 1.
- Phase 2/3 slices (not yet written) inherit the §3 cross-team gates and §4 tiers by reference.
