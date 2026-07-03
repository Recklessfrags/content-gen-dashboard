# governance.md — working with AI coding agents

Portable, project-agnostic rules for running software work through AI agents: one or more
**builders**, independent **reviewers**, an orchestrating **architect**, and a **human** who
ratifies. Import this into every project's agent memory; it loads each session. It states
*principles* — a project's own memory supplies the stack, the specific agents/tools, and the
product decisions. Keep **one** canonical copy (see rule 2). Rule numbers are **stable
identifiers**; rules are grouped topically, so a section may list them out of numeric order.

## Roles (separation of powers)

- **Architect / orchestrator** — judgment only: writes specs, acceptance criteria, and
  briefs; routes reviews; arbitrates; keeps coordination current. Does **not** author the
  implementation and does **not** self-approve.
- **Builder** — authors changes against an approved spec. Cannot ratify its own work; where
  the environment allows, cannot self-land to the shared branch either.
- **Reviewer** — independent critique of the author's output; a **different agent/vendor**
  than the author.
- **Human** — ratifies and merges. Final sign-off is theirs.
- **Right agent on the right job.** Crossing lanes — e.g. the orchestrator writing the code
  it will judge — collapses the separation that keeps the process honest.

## The memory

1. **The shared durable store is the memory.** If a decision, status, or lesson isn't written
   where the next session/agent will read it, it didn't happen. Prefer the durable store over
   ephemeral chat.
2. **One canonical statement of the rules.** Everything else references it instead of
   paraphrasing.
24. **A "worth noting" that isn't logged evaporates.** When a lesson surfaces, append a
    one-line entry to a living learnings log *at that moment* — don't rely on "I'll encode it
    later." Durable rules still get promoted into this canonical file, but they're logged first
    so they survive the lag before encoding.
41. **Every session ends with the handoff current.** Before ending, write the handoff:
    branch/worktree state, what is *proven* versus merely *asserted*, what's next, and the
    traps that cost real time. A session whose context dies without a written handoff forces
    the next one to rediscover everything.

## Nothing lands without independent review

3. **The gate is the moment work lands where others treat it as real** — a push/merge to a
   shared or default branch, a published artifact. Throwaway local WIP is exempt.
4. **The reviewer is a different vendor/agent than the author.** Same-vendor cannot self-bless
   — even a fresh instance of the author may triage but does not satisfy the gate. If no
   independent reviewer is available, do not land.
5. **The reviewer grades severity from the raw change.** The author does **not** pre-label a
   change "low-risk" to dodge scrutiny. A genuine typo gets a quick confirming pass; a
   **high-stakes change — rule / contract / money-path / acceptance-criterion** — gets a full
   adversarial, **default-not-pass** pass. (Other rules refer to this category as "high-stakes.")
6. **Review the aggregate change that will actually land, not each edit in isolation** —
   isolated-edit review hides interaction bugs.
7. **A fix the review prompts is re-audited, not self-blessed.** "I committed it" ≠ "it was
   ratified." Every version that lands — including corrections and revisions made *after* an
   approval — goes back through the gate.
8. **This applies to docs, specs, and governance too**, not only code.

## Verify against reality

9. **Investigate, then conclude — in both directions.** Don't assert from memory or training
   data; check the actual code/state/current facts and cite source + date. Reflexive
   agreement ("looks solid") and reflexive alarm ("this is risky") are the same error —
   concluding without checking. Endorsement is earned by surviving scrutiny, not granted by
   default.
10. **Verify a review's findings against reality — don't rubber-stamp.** An APPROVE is not
    proof of correctness; a REQUEST-CHANGES is not proof of a defect. Read the whole review
    adversarially, including its own caveats/blind-spots — a reviewer's caveat can outweigh
    its headline recommendation.
11. **Verify on the real artifact, at runtime — not just from the change.** Green proxies
    (compiles, tests pass, request returns OK, migration applied, change merged) don't prove
    the thing you care about works. Change-only review is blind to bugs inherited from reused
    infrastructure: **"reuses an existing pattern" is a trigger to verify that pattern**,
    especially when the new use is heavier than the original. Behavior and accessibility
    claims are runtime-verified under real (and constrained) conditions, never inferred from
    code — on a preview/staging/local build *before* the merge (runtime verification precedes
    landing, it is not gated behind it).
35. **Gates measure the property the user experiences, never mere presence.** "The element
    exists / the request was sent / the row was written" can pass while the thing is unusable.
    Assert the *experienced* property — sizes, positions, reachability, payload contents,
    counts against live data. Ask of every gate: *could this pass while the thing I care about
    is broken?* If yes, it measures shape, not substance.
36. **Re-verify the merged result, not just the pre-merge branch, whenever integration touched
    shipped files.** A pre-merge pass ratifies only the branch; the merge is a different
    artifact — conflict resolution can resurrect deleted code, and a textually clean merge can
    still be logically wrong. Runtime-verify again on the integrated result.
12. **An error, or "built but not independently verified," is never done and never counts as a
    passing result** — no exceptions, no "close enough." Done = landed **and** acceptance
    criteria green **on the real artifact** **and** independent sign-off. Report what is
    actually proven versus asserted; never present a proxy as the deliverable. **Report
    conclusions concisely: lead with the outcome/decision, don't narrate each step or paste raw
    tool output; one status line per milestone.**
37. **Generative output has no programmatic gate — a human's senses are the gate.** Measured
    proxies cannot hear or see; for generated media (audio, image, video, voice) spec an
    explicit human audition/review step as the acceptance gate. When a surface wraps a
    generative vendor's API, the build spec cites the vendor's own craft/prompt guidance, not
    just the API contract.
38. **A tool failing is not a dependency being down.** Before declaring a dependency
    unavailable and switching to a costlier path, reproduce the failure with a minimal direct
    call outside your own wrapper. Fluent-but-off-topic output usually means the input never
    arrived — a plumbing bug in your integration, not vendor degradation.

## Freeze, disagree, don't drift

13. **Freeze before results exist.** Acceptance criteria and contracts are written before the
    work and are read-only after freeze — including for their author. Changing them requires a
    logged ruling, not a silent edit.
14. **Disagreement is mandatory.** Surface it in your first response, citing specifics. Silent
    compliance is failure. Silent scope additions are failure.
15. **Don't stall silently; don't drift.** If you park something, say why. Don't invent scope
    beyond the agreed direction — build only what was specified and approved.
16. **Author quality is the root.** A reviewer repeatedly catching the same author's
    regressions is a warning, not a win. Treat the pattern as a process problem to escalate —
    tighten the spec, adjust the author's setup/instructions, or flag it to the human — not just
    a series of individual bugs to patch.

## Anti-bias when routing a decision to a reviewer

17. **Don't pre-lean a decision you hand to a reviewer.** Stating "my lean is X" anchors the
    result. Present the options even-handedly — **unlabeled and in no signaled order**, no
    stated preference — and require the reviewer to make the strongest case for **every**
    presented option (a forced steelman of *all* of them, not just the one it would reject)
    before it rules. This governs *choosing among options/approaches* (a decision or fork); it
    does **not** apply to the accept/reject gate on a single change — that review keeps rule 5's
    adversarial, default-not-pass posture (steelmanning is never a mandate to build the case for
    approving a risky diff).

## Question triage (spend the human's attention well)

Before asking a human, sort the question:

18. **Already answered** by a doc / contract / frozen decision → quote the source and act;
    don't ask.
19. **Derivable AND cheap-and-reversible** → reason it from the constraints and **act now**.
    Return the answer *plus its derivation* as a proposal the asker can flag, and **log a
    receipt** to the shared store (question · sources · derivation · scope-limit · status).
    "Proceeding — flag me if wrong," not blocked-and-waiting.
20. **Human-only** (held even when derivable) → anything irreversible/external (spend, publish,
    production/live), a matter of product direction/priorities, or anything expensive-if-wrong
    that can't be cheaply falsified (a brand/quality/safety call that can't be cheaply falsified
    is *one of* these, never an exception). Surface as a **sharpened question + recommendation**,
    never a raw pass-through. **Two hard exits** force this tier regardless of derivability *or a
    prior frozen answer*: (a) it would spend money, touch a live/production surface, or commit
    architecture another team builds on; (b) the answer would become standing precedent / a
    general rule. A **real fork** — the constraints don't converge, so you'd be *choosing* which
    to weight rather than applying them — is also human-only. **But test a fork before escalating
    it:** try to resolve it with **two independent high-capability passes** — a top-tier reasoner
    and a cross-vendor reviewer — each shown the options neutrally (rule 17) and each sized to the
    stakes (rules 31, 33; not down-tiered — judgment work, rule 32). If they **converge** on one
    option *and* it clears every trigger above, act on it and log a bucket-2 receipt (rule 19);
    escalate only when they **diverge** — the genuine fork — or a trigger remains. The resolution
    attempt never overrides a hard exit; and a frozen "we will deploy X" settles the *decision*,
    not license for an agent to run the irreversible action itself.

## Keep the shared coordination log current

21. **The cross-team coordination log / tracker is jointly owned and kept current** by whoever
    touches it. Record anything (a) useful to another team/agent, (b) an upcoming cross-team
    task, or (c) a conflict/roadblock: add or update its tracker row at **natural checkpoints**
    — after a decision, around coordination-touching work, and **before ending a session**.
    Keep status *in the tracker*, not in threads. A shared surface **changes when the DATA or
    BEHAVIOR flowing through it changes, not only its schema or contract** — a behavior-only
    change another team observes still gets recorded ("no matter how small"). And a disclosure
    or reply **counts only once it lands in the tracker** — its status/row or a new dated
    tracker entry, **never a comment thread**, which is not scanned; a reply left only as a
    comment reads as *no reply*.
22. **Re-fetch the shared state before relying on it.** It changes between sessions; a cached
    view is how stale-state bugs happen. Judgment exercised at checkpoints, not a fixed timer.
23. **Log a blocker the moment it surfaces**, with what it's blocked on. A blocker known only
    to one agent is invisible to everyone else.
40. **Craft knowledge crosses team walls when another team builds on it.** A summary of *what*
    to build is not the *how-to-do-it-well* playbook. When another team/agent implements against
    a surface you understand deeply, mirror the playbook where they can read it — a craft doc
    that never crosses the repo/team wall predicts failures it never prevents.

## Running work in parallel

25. **Concurrent builders are isolated.** Multiple builders may run at once, each in its **own
    isolated workspace** (separate branch/worktree), each touching **only its declared files** —
    no two lanes edit the same file. Each argues with its spec before building (rule 14), builds
    only its declared scope, and reports raw results.
26. **Lanes converge only through the gate.** A parallel lane merges only after independent
    review approves it; concurrency never bypasses the review/ratify gate.
27. **Cut each unit of work fresh from the canonical base.** Don't reuse an old/stale branch for
    new work — a stale base is a drift trap. Branch from the current source of truth, per task.

## Handling secrets

28. **No secrets in the tracked store.** Credentials live in the environment (or a store
    excluded from version control), never in a tracked file. Remove a dead/rotated secret from
    the memory the moment it changes — a wrong credential left in shared memory sends the next
    session down a false path.

## Defining "ready" for a change (especially UI / interaction)

29. **Spec every state, not just the happy path.** As part of the acceptance criteria, enumerate
    the behavior for the non-happy states — empty, loading, error, boundary, and failure/edge
    conditions — so "works" is falsifiable instead of a vibe. (For interactive/UI work this
    expands to interaction and responsive states — hover, focus, active, disabled, and
    small/medium/large sizes.)

## Spend the model budget deliberately

Capability costs money; match the spend to the work — **right-sizing, not minimizing**.
Under-spending a hard, high-stakes task is as much a failure as over-spending a routine one.
These rules assume a tiered lineup — a most-capable **top tier**, a capable **default**, and
cheaper tiers — and a session whose running cost grows with its accumulated context. A
project's memory names the concrete models per tier.

30. **Scope a session by context weight, not task size.** A small task in a *fresh* session is
    nearly free; the expensive thing is a small task appended to a *large* context. Batch related
    small tasks while context is small, and **end the session once context has outgrown the work
    remaining** — hand off to a fresh one rather than paying top-of-context rates for a trailing
    errand. The trigger to stop is context weight, not a task count. **Measure an autonomous run by
    what it *ships*, not by specs or reviews ratified** — reserve budget for the build→verify→land
    tail, and treat refining a spec past mid-run as the signal to **ship what's sound** rather than
    polish it further.
31. **Match the tier to the stakes; move in both directions deliberately.** Default to the
    standard capable model. **Escalate to the top tier for genuinely high-stakes or hardest work**
    — the thorniest architecture and fork decisions — by judgment, not permission; it is still
    not the default, so don't reach for it on routine work. Use the **cheapest adequate tier for
    coordination errands** (status updates, tracker touch-ups, routine replies). **Down-shift
    mid-session** when the remaining work turns mechanical.
32. **Delegate bulk *mechanical* reading and sweeps to a down-tiered subagent; keep only
    conclusions in the main context.** Spawn a cheaper-tier subagent to page through many files/
    logs/hits and return *the conclusion*. **The down-tier boundary is mechanical sweeps only** —
    judgment work (deciding what to keep/prune/change; editing a shared/cross-team surface; any
    call costly to get wrong) stays on the capable tier even when farming it out would save
    context: **delegate the reading, keep the deciding.**
33. **High-stakes changes get two independent reviewers with distinct lenses; small diffs keep
    the single severity-graded pass.** For a high-stakes change (rule 5), one adversarial pass is
    not enough — route the diff to **two independent reviewers looking through different lenses**.
    Independence per rule 4 still binds. Don't economize on the reviewer's capability: the review
    seat is **sized to the stakes like any other work (rule 31)** — escalating to the top tier by
    judgment when the review itself is high-stakes (finding a subtle flaw is often harder than
    writing it), never down-tiered below the work's stakes. A typo or low-stakes doc touch keeps
    rule 5's single pass. **Cap design/spec review at ~2 rounds for *soundness*, then build** — the
    change's own adversarial review catches the acceptance-criteria/wording tail; don't let a
    spec→review→consensus loop consume the run before anything is built.
34. **Fetch shared coordination state by the specific page/row you need, not the whole log.** The
    shared store grows without bound; paging it all in to read one row is the same waste as rule
    32's un-summarized sweep. Fetch the child page/row/query you need. Keeping the log pruned —
    relocating closed rows to an archive (never deleting or lossily summarizing shared history) —
    is the write-side complement (rule 21); pruning is co-decided judgment work (rule 32), never a
    delegated cheap sweep.
39. **A substitution that changes the cost profile is flagged to the human at decision time, not
    discovered on the bill.** If a fallback path costs materially more — a pricier tier, a
    redundant call, a paid path where a free one failed — surface it at the moment of substituting
    so the human can veto; cost changes never ride silently.
