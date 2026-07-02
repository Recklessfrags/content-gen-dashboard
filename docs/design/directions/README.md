# Phase-1 visual directions — Step 1 exploration (operator pick pending)

_Author: Designer (Gemini, `gemini-3.1-pro-preview` for B/C, `gemini-3.5-flash` for A) against
`docs/design/phase1-visual-brief.md` Step 1, commissioned by the Architect 2026-07-02. These are
**direction-exploration artifacts** for the operator to pick from — NOT finished screens. The
chosen direction drives Step 2 (full design system + all Phase-1 screens)._

Per the operator ruling (2026-07-02): explore 2–3 distinct visual directions → operator picks →
full system built against the winner.

Each direction is a **self-contained HTML mockup** of the **Channels hub** (open directly in a
browser — no network needed; verified zero external refs) + a `.md` sidecar with the rationale +
token sketch. All three render honestly against the Phase-1 data reality (uncast states shown; no
fabricated per-channel analytics beyond active-jobs + spend; card thumbnails degrade to a
placeholder since `channel_profiles` has no thumbnail column).

| Dir | File | Feeling | Palette | Type | Risk |
| --- | --- | --- | --- | --- | --- |
| **A** | `direction-a-editorial.html` | Elevated editorial — warm cream/ink, structured, crafted, "curated ledger" | warm cream + ink + one warm accent (light) | system serif headings + system sans body | can read static/passive if active states are weak |
| **B** | `direction-b-console.html` | Clean modern control-room — neutral dark, systematic, calm | slate dark + restrained blue accent | clean system sans | may feel clinical / developer-centric for a media tool |
| **C** | `direction-c-operator.html` | High-contrast operator console — dense, terminal, status-driven | near-black + green/amber/red semantics | system sans + **mono numerics** | density/mono can feel technical/intimidating for a non-technical founder |

Rendered previews (desktop 1440 + mobile 412) were produced by the Architect for the operator
pick; the source of truth is the HTML.

**Next:** operator picks a direction → Architect briefs Gemini for Step 2 (design system spec +
component gallery + all Phase-1 screens against the winner) → Codex builds → Gemini + suerta review
→ browser-ratify (`slice-channel-first-phase1.md` §10 gates).
