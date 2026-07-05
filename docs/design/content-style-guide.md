# Content style guide + audit rubric — Reels Content Control Room

_Status: **v1 — evidence-based draft**, 2026-07-05. Built from a deep-research synthesis of
established content-design authorities (adversarially verified: 25 claims, 25 confirmed, 0 refuted).
This is the authoritative reference the **site-wide copy audit** scores against. Sources are cited inline
and listed in §9._

> **Audience of the product:** a small number of **expert internal operators** running an AI
> content-generation pipeline (channels · characters/casting · ideas · job queue · runs · cost).
> The guide is written for that reality — terse and efficient, but **not cryptic, not themed**.

---

## 0. The one-line finding

Established authorities converge: **plain, scannable, front-loaded language wins even for expert
operators.** Expertise does **not** create a preference for dense, jargon-heavy, or themed prose — NN/g's
repeated, study-backed finding is that "even highly educated readers crave succinct information that is
easy to scan, just like everyone else." [NN/g plain-language-experts]. So: **keep the tool terse and
efficient, but strip the terminal/spy/military theming and the internal system-jargon, front-load
meaning, and standardize on sentence case with one term per concept.**

---

## 1. Voice & tone (for an expert internal tool)

| # | Principle | Evidence |
|---|---|---|
| **V1** | **Plain and scannable beats dense — even here.** Experts are busy, distracted, and scanning on screens; complexity is not a courtesy to them. | NN/g *Plain Language Is for Everyone, Even Experts*; UX-writing FAQ; 2024 ACM CHI study |
| **V2** | **Jargon is allowed ONLY when it's the operators' *own* shared vocabulary** — verified by how they actually talk, not assumed — and only their **domain** language, never **internal system/implementation** jargon. | NN/g plain-language-experts + complex-apps heuristic ("speak the users' language… rather than internal jargon"); Polaris ("some jargon is okay, as long as it's what actual merchants say") |
| **V3** | **No decorative theming.** Field-manual / dossier / "The Wire" / "TRANSMITTING FREQUENCY" / "NEW ROW" metaphors are fluff. "Avoid distractions like fluffy metaphors"; "more important to be clear than entertaining." | Mailchimp; Polaris ("use plain language") |
| **V4** | **Prefer clarity over cleverness or brand voice.** Read it aloud; if it sounds like backend docs or a spy movie, rewrite it. | Microsoft ("write like you speak… read your text aloud"); Mailchimp |

**What this means for our current copy (the offenders):**
- ✅ Keep genuine domain terms operators use: *channel, character, voice, casting, queue, run, episode, cost.*
- ❌ Kill internal system-jargon in operator-facing copy: **`ADR-005`**, **"claim discipline gates Tier-1
  levers"**, **"arousal ceiling gates Tier-2"**, **`fact_first` / `conservative`** as bare enum tokens.
  Either rename to a plain concept or **demote to progressive-disclosure detail** (tooltip / "Details").
- ❌ Kill the theming: **"field manual", "dossier", "The Wire", "NEW ROW", "TRANSMITTING FREQUENCY",
  "roster"** → plain equivalents (*character, character profile, ideas, new channel, …*).
- ⚠️ Jargon that *might* be real operator vocabulary (**"treatment", "packaging", "source ladder"**) is an
  **open question** — confirm with the actual operators before keeping (see §8).

---

## 2. Microcopy patterns, per element

_"Microcopy" = copy shorter than three sentences; it is read more often than any other copy, so it must be
tight and meaning-first. [NN/g *3 Is of Microcopy*]_

| Element | Rule | Do | Don't |
|---|---|---|---|
| **Field label** | Persistent, sentence case, noun phrase, **one term per concept**. Never replace with placeholder-only. | `Channel concept` | `CHANNEL` / `CONCEPT` header **then** `CHANNEL CONCEPT` label (redundant); ALL-CAPS mono label; placeholder-as-label |
| **Button / CTA** | **Verb-first**, specific, sentence case; must read as an action. | `Generate from concept`, `Save channel`, `Delete channel` | header-styled non-buttons; `Submit`; `OK`; a section-header that's secretly clickable |
| **Helper / hint text** | Below the field, plain, terse; explain format or *why*. | (under a field) `Seeds guideline auto-generation. You can edit everything after.` | right-aligned floating `Optional` / `Primary key`; walls of prose |
| **Placeholder** | Example input only, never the label, never instructions. | `e.g. weird_food` | using it instead of a label |
| **Section header** | **Literal** — describe the content; sentence case; not themed/cutesy. | `Character & voice`, `Engagement dials` | `TRANSMITTING FREQUENCY`; `FIELD MANUAL` |
| **Empty state** | Say what the surface is **and** the first action to fill it. | `No characters yet. Create your first character to get started.` + button | `NO DOSSIERS ON FILE` |
| **Error / status** | Plain language, **no error codes**, name the problem **and** offer a fix; front-load. | `Couldn't reach the database. Check your connection and retry.` | `Invalid ID`; raw `error.message`; `Comms down` |
| **Confirmation (destructive)** | Name the exact consequence in plain words; verb-first confirm button. | `Delete channel "Animal channel"? Jobs already routed keep working via the default profile.` → `Delete channel` | `Are you sure?` → `Yes` / `OK` |
| **Toast / notification** | Short, past-tense result of the action. | `Channel "weird_food" created.` | `TRANSMISSION COMPLETE` |

CTA specifics (verb-first, descriptive): "Start sentences with verbs so they feel like actionable
instructions"; "button copy should always include verbs… use sentence case." [Polaris; Mailchimp]

---

## 3. Capitalization & terminology

| # | Rule | Evidence |
|---|---|---|
| **C1** | **House convention = sentence case, everywhere** (headings, labels, buttons, nav). Capitalize only the first word + proper nouns. The app has no title-case global-nav need, so sentence case is the single convention — no exceptions to litigate. | Microsoft ("Default to sentence-style capitalization… Never Use Title Capitalization"); Mailchimp; GOV.UK (sentence case everywhere) |
| **C2** | **No ALL-CAPS decoration.** Block capitals hurt scannability/legibility and are not part of any standard casing convention. Reserve caps for genuine acronyms only. | Microsoft; Mailchimp ("don't capitalize random words"); GOV.UK ("don't use block capitals for large amounts of text") |
| **C3** | **Monospace is for code, not chrome.** Use the mono font only for genuine IDs / enum values / code (`weird_food`, `job_rerun_…`), never for decorative labels or body copy. | (house rule; supports C2 legibility) |
| **C4** | **One term per concept — no synonyms.** Maintain a glossary (§7). The same thing must have the same name on every screen. | Polaris/Mailchimp consistency; NN/g match-real-world |

Our current violations: ALL-CAPS mono labels throughout; `CONCEPT` vs `CHANNEL CONCEPT`; lowercase enum
values (`archival documentary`) beside ALL-CAPS labels; synonym sprawl (`field manual` / `dossier` /
`character bible`; `roster` / `characters`).

---

## 4. Scannability & progressive disclosure

- **Front-load meaning.** Lead with the most important words; make choices and next steps obvious.
  [Microsoft: "Lead with what's most important. Front-load keywords for scanning."]
- **Don't dump enforced/complex settings as a wall.** The "Engagement dials · ACTIVE — ENFORCED
  PIPELINE-SIDE" block is a wall of implementation prose. Pattern: a **short plain lead** ("These dials are
  enforced by the pipeline when a job starts.") + **progressive disclosure** ("Details" / tooltip) for the
  ADR/Tier mechanics. [NN/g microcopy + reduce-cognitive-load]
- **Headings must summarize their content**, not tease it. [NN/g: clear/informative headings beat vague or
  cutesy ones.]

---

## 5. Copy accessibility (non-negotiable)

| # | Rule | Standard |
|---|---|---|
| **A1** | **Descriptive link/button text** — never "Click here", "Learn more", "Get started", "Read this". Text must make sense out of context. | WCAG 2.4.4 Link Purpose; NN/g "4 Ss" (specific, sincere, substantial, succinct); Mailchimp |
| **A2** | **Every field has a persistent, programmatically-associated label** (`<label for>`); placeholders never substitute. | W3C WAI Forms; NN/g placeholders-harmful |
| **A3** | **Plain language for destructive/critical actions** — name the consequence; don't hide it behind jargon or a bare "Yes". | NN/g confirmation-dialog |
| **A4** | **Critical messages ~7th–8th grade reading level**, no error codes (minimize / on-demand). Audience-specific jargon the operators genuinely share is allowed; implementation jargon is not. | NN/g error-message rubric; plainlanguage.gov |

---

## 6. The audit rubric (scorable, screen-by-screen)

Adapted from **NN/g's error-message scoring rubric** — the one citable, scorable model in this space — which
grades across dimensions with a **1–4 scale mapped to A–D grades**. [NN/g *A Rubric for Scoring the Quality
of Error Messages*]. We generalize its mechanics from errors to all copy, across three dimensions.

**Score each screen on each category, 1–4:**

> **4 Excellent** — fully meets the rule, no issues · **3 Good** — minor slip · **2 Fair** — noticeable
> problem · **1 Poor** — fails the rule.

### Dimension I — Clarity (is it understandable?)
- **I.1 Plain language** — no unexplained internal/implementation jargon; no theming/metaphor; reads aloud cleanly.
- **I.2 Jargon fit** — any domain term is one operators actually use (else it's a violation).
- **I.3 Reading level & density** — critical/error copy ~7–8th grade; no walls of prose; front-loaded.

### Dimension II — Consistency (does it match the system?)
- **II.1 Capitalization** — sentence case; no ALL-CAPS decoration; no random mid-string caps.
- **II.2 One term per concept** — matches the glossary; no synonyms for the same thing.
- **II.3 Element conventions** — labels/buttons/headers/errors follow §2 patterns.

### Dimension III — Action & Accessibility (can they act?)
- **III.1 Action-orientation** — CTAs are verb-first and specific; the primary action is obvious.
- **III.2 Descriptive link/button text** — passes WCAG 2.4.4; no "click here"/"learn more".
- **III.3 Labels & errors** — persistent associated labels; errors name problem + fix, no raw codes; destructive actions state the consequence.

**Grade:** average the 9 category scores per screen →
**A 4.0–3.3 · B 3.2–2.5 · C 2.4–1.6 · D ≤ 1.5.**

**Severity (per finding, to prioritize fixes):**
- **Blocker** — accessibility failure (A1–A4), an illegible/contrast-failing string, or a destructive/critical
  action whose consequence is unclear.
- **Major** — jargon/theming that blocks comprehension; inconsistent terminology for the same concept; a
  CTA with no affordance.
- **Minor** — casing/monospace decoration; redundant labels; right-aligned hint floats.
- **Nit** — small polish (article in link text, trailing punctuation).

**Output of the audit:** one row per screen — `screen | I.1..III.3 scores | grade | ranked findings
(severity + before→after)`.

---

## 7. Terminology glossary (one term per concept — fill in during the audit)

| Concept | ✅ Canonical term | ❌ Do not use |
|---|---|---|
| A content stream | **channel** | — |
| A recurring on-camera persona | **character** | field manual, dossier, roster entry |
| The character's written spec | **character profile** (or **bible** — pick one) | dossier, field manual |
| Captured content idea | **idea** | the wire, beat, transmission |
| A queued/executed generation | **run** / **job** (pick one per surface) | — |
| Voice setup | **voice casting** | — |
| _…extend during the audit…_ | | |

---

## 8. Decisions the operator must make (open questions from the research)

1. **Shared vocabulary check.** Are `treatment`, `packaging`, `source ladder`, `arousal ceiling`, `claim
   discipline` words the operators actually use — or internal jargon to rename? (The jargon rule hinges on
   *evidence*, not assumption.)
2. **`ADR-005` and internal codenames** in operator-facing copy: **drop, rename, or demote** to a tooltip?
   What plain concept does each stand for?
3. **Casing convention:** confirm **sentence case everywhere** (this guide's recommendation) as the house rule.
4. **Rubric thresholds:** confirm the A–D bands and severity mapping above, and whether destructive-action
   copy is weighted heavier than helper text.

---

## 9. Sources (primary unless noted)

- NN/g — *Plain Language Is for Everyone, Even Experts* · *UX Writing FAQs* · *UX Writing Study Guide* ·
  *Usability Heuristics for Complex Applications* · *The 3 Is of Microcopy* · *Placeholders in Form Fields
  Are Harmful* · *A Rubric for Scoring the Quality of Error Messages* · *Error-Message Guidelines* ·
  *Confirmation Dialogs* · *"Learn More" Links* / *"Get Started"*.
- Microsoft **Writing Style Guide** — Top 10 tips (sentence case; front-loading; avoid jargon).
- **Mailchimp** Content Style Guide (plain language; sentence case; verb-first buttons; descriptive links).
- **Shopify Polaris** — Content fundamentals / product content (plain language; 7th-grade; action-oriented).
- **GOV.UK** style guide A–Z (sentence case everywhere; no block capitals).
- **W3C WAI** — Forms/Labels tutorial · **WCAG 2.2** Understanding 2.4.4 Link Purpose.
- **plainlanguage.gov** — Federal Plain Language Guidelines.

_Caveats (from the research): the capitalization sources are not perfectly unanimous (Microsoft bans title
case broadly; Mailchimp allows it for global nav) — this guide resolves that by choosing sentence-case
everywhere. NN/g's rubric is officially scoped to error messages; generalizing it to all copy is an
intended, reasonable extension. GOV.UK/Material/Apple/Atlassian were targeted but their specific claims
didn't clear verification in this batch, so the synthesis leans on NN/g, Microsoft, Mailchimp, Polaris._
