# governance.md — working with AI coding agents

<!-- ADOPTED VERBATIM from the canonical copy at the PIPELINE repo root (their PR #40,
Gemini-reviewed PASS), via the HQ "governance.md — VERBATIM MIRROR" page (2026-07-02),
per the cross-team adoption ask + rule 2. The pipeline repo file is canonical; it
re-mirrors to HQ on any change (governance change = shared-surface change → HQ
heads-up). Continuous rule numbering 1–29 restored from the mirror (Notion flattened
per-section lists; the numbering is verified by the merge notes' cross-references:
rule 11 = real-artifact, rule 17 = anti-bias, rule 20 = human-only tier).
Dashboard-specific operational rules live in AGENTS.md as ADDITIVE local rules — they
extend, never override, this file. -->

Portable, project-agnostic rules for running software work through AI agents: one or
more **builders**, independent **reviewers**, an orchestrating **architect**, and a
**human** who ratifies. Import this into every project's agent memory; it loads each
session. It states *principles* — a project's own memory supplies the stack, the
specific agents/tools, and the product decisions. Keep **one** canonical copy (see
rule 2).

## Roles (separation of powers)

- **Architect / orchestrator** — judgment only: writes specs, acceptance criteria,
  and briefs; routes reviews; arbitrates; keeps coordination current. Does **not**
  author the implementation and does **not** self-approve.
- **Builder** — authors changes against an approved spec. Cannot ratify its own
  work; where the environment allows, cannot self-land to the shared branch either.
- **Reviewer** — independent critique of the builder's output; a **different
  agent/vendor** than the author.
- **Human** — ratifies and merges. Final sign-off is theirs.
- **Right agent on the right job.** Each role spends effort in its lane. Crossing
  lanes — the orchestrator writing the code it will judge — collapses the separation
  that keeps the process honest.

## The memory

1. **The shared durable store is the memory.** If a decision, status, or lesson
   isn't written where the next session/agent will read it, it didn't happen. Prefer
   the durable store over ephemeral chat.
2. **One canonical statement of the rules.** Everything else references it instead
   of paraphrasing.

## Nothing lands without independent review

3. **The gate is the moment work lands where others treat it as real** — a
   push/merge to a shared or default branch, a published artifact. Throwaway local
   WIP is exempt.
4. **The reviewer is a different vendor/agent than the author.** Same-vendor cannot
   self-bless — even a fresh instance of the author may triage but does not satisfy
   the gate. If no independent reviewer is available, do not land.
5. **The reviewer grades severity from the raw change.** The author does **not**
   pre-label a change "low-risk" to dodge scrutiny. A genuine typo gets a quick
   confirming pass; a rule / contract / money-path / acceptance-criterion change
   gets a full adversarial, **default-not-pass** pass.
6. **Review the aggregate change that will actually land, not each edit in
   isolation** — isolated-edit review hides interaction bugs.
7. **A fix the review prompts is re-audited, not self-blessed.** "I committed it" ≠
   "it was ratified." Every version that lands — including corrections and revisions
   made *after* an approval — goes back through the gate.
8. **This applies to docs, specs, and governance too**, not only code.

## Verify against reality

9. **Investigate, then conclude — in both directions.** Don't assert from memory or
   training data; check the actual code/state/current facts and cite source + date.
   Reflexive agreement ("looks solid") and reflexive alarm ("this is risky") are the
   same error — concluding without checking. Endorsement is earned by surviving
   scrutiny, not granted by default.
10. **Verify a review's findings against reality — don't rubber-stamp.** An APPROVE
    is not proof of correctness; a REQUEST-CHANGES is not proof of a defect. Read
    the whole review adversarially, including its own stated caveats/blind-spots — a
    reviewer's caveat can outweigh its headline recommendation.
11. **Verify on the real artifact, at runtime — not just from the change.** Green
    proxies (compiles, tests pass, request returns OK, migration applied, change
    merged) don't prove the thing you care about works. Change-only review is blind
    to bugs inherited from reused infrastructure: **"reuses an existing pattern" is
    a trigger to verify that pattern**, especially when the new use is heavier than
    the original. Behavior and accessibility claims are runtime-verified under real
    (and constrained) conditions, never inferred from code. The "real artifact" can
    be an isolated preview / staging / local build run *before* the merge — runtime
    verification precedes landing, it is not gated behind it (so this does not
    conflict with review-before-merge).
12. **An error, or "built but not independently verified," is never done and never
    counts as a passing result** — no exceptions, no "close enough." Done = landed
    **and** acceptance criteria green **on the real artifact** **and** independent
    sign-off. Report what is actually proven versus asserted; never present a proxy
    as the deliverable.

## Freeze, disagree, don't drift

13. **Freeze before results exist.** Acceptance criteria and contracts are written
    before the work and are read-only after freeze — including for their author.
    Changing them requires a logged ruling, not a silent edit.
14. **Disagreement is mandatory.** Surface it in your first response, citing
    specifics. Silent compliance is failure. Silent scope additions are failure.
15. **Don't stall silently; don't drift.** If you park something, say why. Don't
    invent scope beyond the agreed direction — build only what was specified and
    approved.
16. **Author quality is the root.** A reviewer repeatedly catching the same author's
    regressions is a warning, not a win. Treat the pattern as a process problem to
    escalate — tighten the spec, adjust the author's setup/instructions, or flag it
    to the human — not just a series of individual bugs to patch.

## Anti-bias when routing a decision to a reviewer

17. **Don't pre-lean a decision you hand to a reviewer.** Stating "my lean is X"
    anchors the result. Present the options even-handedly — **unlabeled and in no
    signaled order**, no stated preference — and require the reviewer to make the
    strongest case for **every** presented option (a forced steelman of *all* of
    them, not just the one it would reject: singling out a single option to steelman
    leaks which one is disfavored and breaks down for more than two options). Only
    after steelmanning all may it rule. A neutrally-framed re-run can reverse a
    biased verdict — that is the point. This governs *choosing among
    options/approaches* (a decision or fork); it does **not** apply to the
    accept/reject gate on a single change — that review keeps rule 5's adversarial,
    default-not-pass posture (steelmanning is never a mandate to build the case for
    approving a risky diff).

## Question triage (spend the human's attention well)

Before asking a human, sort the question:

18. **Already answered** by a doc / contract / frozen decision → quote the source
    and act; don't ask.
19. **Derivable AND cheap-and-reversible** → reason it from the constraints and
    **act now**. Return the answer *plus its derivation* as a proposal the asker can
    flag, and **log a receipt** to the shared store (question · sources · derivation
    · scope-limit · status). "Proceeding — flag me if wrong," not
    blocked-and-waiting.
20. **Human-only** (held even when derivable) → anything irreversible or external
    (spend, publish, production/live), a matter of product direction/priorities, or
    anything expensive-if-wrong that can't be falsified cheaply. Surface as a
    **sharpened question + recommendation**, never a raw pass-through. **Two hard
    exits** force a question to this tier regardless of derivability *or a prior
    frozen answer*: (a) it would spend money, touch a live/production surface, or
    commit architecture another team builds on; (b) the answer would become standing
    precedent / a general rule. A **real fork** — where the constraints don't
    converge and you would be *choosing* which to weight rather than applying them —
    is also human-only. (A frozen doc can settle the *decision*, but executing an
    irreversible / production / spend action still routes to the human — a
    documented "we will deploy X" is not license for an agent to run the deploy
    itself.)

## Keep the shared coordination log current

21. **The cross-team coordination log / tracker is jointly owned and kept current**
    by whoever touches it. Record anything (a) useful to another team/agent, (b) an
    upcoming cross-team task, or (c) a conflict/roadblock: add or update its tracker
    row at **natural checkpoints** — after a decision, around coordination-touching
    work, and **before ending a session**. Keep status *in the tracker* so no one
    has to read threads to learn what's open.
22. **Re-fetch the shared state before relying on it.** It changes between sessions;
    a cached view is how stale-state bugs happen. This is judgment exercised at
    checkpoints, not a fixed timer.
23. **Log a blocker the moment it surfaces**, with what it's blocked on. A blocker
    known only to one agent is invisible to everyone else.

## Log lessons as they surface

24. **A "worth noting" that isn't logged evaporates.** When a lesson surfaces,
    append a one-line entry to a living learnings log *at that moment* — don't rely
    on "I'll encode it later." Durable rules still get promoted into this canonical
    file, but they're logged first so they survive the lag before encoding.

## Running work in parallel

25. **Concurrent builders are isolated.** Multiple builders may run at once, each in
    its **own isolated workspace** (separate branch/worktree), each touching **only
    its declared files** — no two lanes edit the same file. Each argues with its
    spec before building (rule 14), builds only its declared scope, and reports raw
    results.
26. **Lanes converge only through the gate.** A parallel lane merges only after
    independent review approves it; concurrency never bypasses the review/ratify
    gate.
27. **Cut each unit of work fresh from the canonical base.** Don't reuse an
    old/stale branch for new work — a stale base is a drift trap. Branch from the
    current source of truth, per task.

## Handling secrets

28. **No secrets in the tracked store.** Credentials live in the environment (or a
    store excluded from version control), never in a tracked file. Remove a
    dead/rotated secret from the memory the moment it changes — a wrong credential
    left in shared memory sends the next session down a false path.

## Defining "ready" for a change (especially UI / interaction)

29. **Spec every state, not just the happy path.** As part of the acceptance
    criteria, enumerate the behavior for the non-happy states — empty, loading,
    error, boundary, and failure/edge conditions — so "works" is falsifiable instead
    of a vibe. (For interactive or UI work this expands to interaction and
    responsive states — e.g. hover, focus, active, disabled, and small/medium/large
    sizes.)
