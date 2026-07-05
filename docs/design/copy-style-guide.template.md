# Copy style guide + audit rubric — TEMPLATE (blank canvas)

_Reusable, project-agnostic template. Copy this file into any project, then **fill every `<PLACEHOLDER>`**
and the fill-in tables (§7–§9). The **principles (§1–§5) and the scoring rubric (§6) are portable — keep
them as-is**; they're grounded in established content-design authorities (cited in §10), not any one
product. Delete this italic note and the `> HOW TO USE` block when you instantiate._

> **HOW TO USE**
> 1. Fill §0.1 (product + audience) — this is the single biggest lever; the whole guide bends to it.
> 2. Keep §1–§6 verbatim. Only tune the **examples** in §2 to your product's surfaces.
> 3. Fill §7 (glossary), §8 (your current-copy offenders), §9 (decisions) as you go.
> 4. Run the §6 rubric screen-by-screen to produce a scored audit + prioritized backlog.

---

## 0. The one-line finding (portable — keep)

Established authorities converge: **plain, scannable, front-loaded language wins — even for expert users.**
Expertise does **not** create a preference for dense, jargon-heavy, or themed prose — NN/g's repeated,
study-backed finding is that "even highly educated readers crave succinct information that is easy to scan,
just like everyone else." So: **be terse and efficient, but not cryptic and not themed; front-load
meaning; standardize on sentence case with one term per concept.**

### 0.1 This product (FILL IN)
- **Product:** `<product name — what it is in one line>`
- **Audience:** `<who uses it — e.g. general public / expert internal operators / developers>`
- **Register:** `<terse-and-efficient | conversational | formal>` — _experts still want plain + scannable; register ≠ density._
- **Known problems to fix:** `<one-line summary of what a reviewer/audit flagged — jargon, theming, inconsistency, …>`

---

## 1. Voice & tone (portable principles — keep; tune the "apply" line)

| # | Principle | Evidence |
|---|---|---|
| **V1** | **Plain and scannable beats dense — even for experts.** Users are busy, distracted, scanning on screens. | NN/g *Plain Language Is for Everyone, Even Experts*; UX-writing FAQ |
| **V2** | **Jargon is allowed ONLY when it's the audience's *own* shared vocabulary** — verified by how they actually talk, not assumed — and only their **domain** language, never **internal system/implementation** jargon. | NN/g plain-language-experts + complex-apps heuristic; Polaris |
| **V3** | **No decorative theming / fluffy metaphors.** Clarity over cleverness or brand voice. | Mailchimp; Polaris |
| **V4** | **Write like you speak; read it aloud.** If it sounds like backend docs or a costume, rewrite it. | Microsoft; Mailchimp |

**Apply to `<product>`:** keep the genuine domain terms the audience uses (`<list them>`); kill internal
system-jargon and codenames (`<list>`) — rename or demote to progressive disclosure; kill any theming
(`<list>`).

---

## 2. Microcopy patterns, per element (portable — keep; swap the example strings)

_"Microcopy" = copy under three sentences; it's read more than any other copy, so it must be tight and
meaning-first. [NN/g *3 Is of Microcopy*]_

| Element | Rule | Do | Don't |
|---|---|---|---|
| **Field label** | Persistent, sentence case, noun phrase, **one term per concept**. Never placeholder-only. | `<Field name>` | ALL-CAPS label; redundant header+label; placeholder-as-label |
| **Button / CTA** | **Verb-first**, specific, sentence case; reads as an action. | `<Verb + object>` | header-styled non-buttons; `Submit`; `OK` |
| **Helper / hint text** | Below the field, plain, terse; explain format or *why*. | `<why/format>` | right-aligned floating hints; walls of prose |
| **Placeholder** | Example input only — never label, never instructions. | `e.g. <example>` | using it instead of a label |
| **Section header** | **Literal** — describe the content; sentence case; not themed. | `<What's in it>` | cutesy/themed headers |
| **Empty state** | Say what the surface is **and** the first action. | `No <things> yet. <Verb> your first <thing>.` + button | `NO <THINGS> ON FILE` |
| **Error / status** | Plain language, **no error codes**, name the problem **and** offer a fix; front-load. | `Couldn't <do X>. <Fix>.` | raw `error.message`; `Invalid ID` |
| **Confirmation (destructive)** | Name the exact consequence; verb-first confirm button. | `Delete <thing>? <consequence>.` → `Delete <thing>` | `Are you sure?` → `Yes` |
| **Toast / notification** | Short, past-tense result. | `<Thing> <verb-ed>.` | themed status shouts |

CTAs: verb-first, descriptive, sentence case. [Polaris; Mailchimp]

---

## 3. Capitalization & terminology (portable — keep)

| # | Rule | Evidence |
|---|---|---|
| **C1** | **Pick ONE house casing convention. Recommended: sentence case everywhere** (first word + proper nouns only). | Microsoft; Mailchimp; GOV.UK |
| **C2** | **No ALL-CAPS decoration** (hurts scannability/legibility; reserve caps for acronyms). | Microsoft; Mailchimp; GOV.UK |
| **C3** | **Monospace is for code, not chrome** — IDs / enum values / code only, never decorative labels or body. | house rule |
| **C4** | **One term per concept — no synonyms.** Maintain the §7 glossary; same thing, same name everywhere. | Polaris/Mailchimp; NN/g match-real-world |

---

## 4. Scannability & progressive disclosure (portable — keep)

- **Front-load meaning** — lead with the most important words; make next steps obvious. [Microsoft]
- **Don't dump complex/enforced settings as a wall** — short plain lead + progressive disclosure ("Details"/
  tooltip) for the mechanics. [NN/g microcopy + reduce-cognitive-load]
- **Headings summarize their content**, not tease it. [NN/g]

---

## 5. Copy accessibility (portable — keep; non-negotiable)

| # | Rule | Standard |
|---|---|---|
| **A1** | **Descriptive link/button text** — never "Click here", "Learn more", "Get started". Makes sense out of context. | WCAG 2.4.4; NN/g "4 Ss" |
| **A2** | **Every field has a persistent, associated label** (`<label for>`); placeholders never substitute. | W3C WAI; NN/g |
| **A3** | **Plain language for destructive/critical actions** — name the consequence; no bare "Yes". | NN/g confirmation-dialog |
| **A4** | **Critical messages ~7–8th grade**, no error codes; audience-shared jargon OK, implementation jargon not. | NN/g rubric; plainlanguage.gov |

---

## 6. The audit rubric (portable — keep; scorable, screen-by-screen)

Adapted from **NN/g's error-message scoring rubric** (the citable scorable model), generalized from errors
to all copy across three dimensions. **Score each screen on each category, 1–4:**

> **4 Excellent** — meets the rule, no issues · **3 Good** — minor slip · **2 Fair** — noticeable problem ·
> **1 Poor** — fails the rule.

**Dimension I — Clarity**
- **I.1 Plain language** — no unexplained internal/implementation jargon; no theming; reads aloud cleanly.
- **I.2 Jargon fit** — any domain term is one the audience actually uses.
- **I.3 Reading level & density** — critical/error copy ~7–8th grade; no walls; front-loaded.

**Dimension II — Consistency**
- **II.1 Capitalization** — matches the house convention; no ALL-CAPS decoration.
- **II.2 One term per concept** — matches the glossary; no synonyms.
- **II.3 Element conventions** — labels/buttons/headers/errors follow §2.

**Dimension III — Action & Accessibility**
- **III.1 Action-orientation** — CTAs verb-first and specific; primary action obvious.
- **III.2 Descriptive link/button text** — passes WCAG 2.4.4.
- **III.3 Labels & errors** — persistent associated labels; errors name problem + fix, no codes; destructive actions state the consequence.

**Grade:** average the 9 scores per screen → **A 4.0–3.3 · B 3.2–2.5 · C 2.4–1.6 · D ≤ 1.5.**

**Severity (per finding):**
- **Blocker** — accessibility failure (A1–A4), illegible string, or an unclear destructive/critical action.
- **Major** — jargon/theming that blocks comprehension; inconsistent terminology; a CTA with no affordance.
- **Minor** — casing/monospace decoration; redundant labels; hint floats.
- **Nit** — small polish.

**Audit output:** one row per screen — `screen | I.1..III.3 | grade | ranked findings (severity + before→after)`.

---

## 7. Terminology glossary — one term per concept (FILL IN)

| Concept | ✅ Canonical term | ❌ Do not use |
|---|---|---|
| `<concept>` | `<term>` | `<synonyms to retire>` |

---

## 8. Current-copy offenders → fix (FILL IN during the audit)

| Location | Current | Problem (rule #) | Recommended |
|---|---|---|---|
| `<screen · element>` | `<current string>` | `<V2 / C2 / A1 …>` | `<rewrite>` |

---

## 9. Decisions the owner must make (FILL IN — from the research)

1. **Shared-vocabulary check** — which domain terms does the audience *actually* use (keep) vs. internal jargon (rename)? _(Needs the real users, not assumption.)_
2. **Internal codenames** in user-facing copy — drop, rename, or demote to tooltip? What plain concept does each stand for?
3. **Casing convention** — confirm the house rule (recommended: sentence case everywhere).
4. **Rubric thresholds** — confirm A–D bands + severity mapping; weight destructive-action copy heavier than helper text?

---

## 10. Sources (portable — keep)

- NN/g — *Plain Language Is for Everyone, Even Experts* · *UX Writing FAQs* · *UX Writing Study Guide* ·
  *Usability Heuristics for Complex Applications* · *The 3 Is of Microcopy* · *Placeholders in Form Fields
  Are Harmful* · *A Rubric for Scoring the Quality of Error Messages* · *Error-Message Guidelines* ·
  *Confirmation Dialogs* · *"Learn More" Links* / *"Get Started"*.
- Microsoft **Writing Style Guide** (Top 10 tips). · **Mailchimp** Content Style Guide. · **Shopify Polaris**
  content fundamentals. · **GOV.UK** style guide A–Z. · **W3C WAI** Forms/Labels · **WCAG 2.2** 2.4.4. ·
  **plainlanguage.gov** Federal Plain Language Guidelines.

_Method note: verified via a fan-out deep-research pass (25 claims, adversarially cross-checked, all
confirmed). Capitalization sources differ slightly (Microsoft bans title case; Mailchimp allows it for
global nav) — hence "pick one house convention" (C1). NN/g's rubric is officially scoped to error
messages; generalizing it to all copy is an intended, reasonable extension._
