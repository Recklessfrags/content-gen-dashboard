# Visual directions — v2 (character-forward, research-driven)

_Round 2, after the operator flagged the v1 set (`../directions/`) as dry/stale/bland/generic.
Grounded in `../design-research-2026.md` (2026 anti-generic playbook: texture, editorial-bold
typography, raw structural clarity, bento, function-first depth, signature > neutral). These are
deliberately **opinionated** — each has a point of view, not "restrained/clean" as the whole idea._

Each is a **self-contained** HTML mock of the **Channels hub** (open directly — no network;
verified zero external refs, incl. inline SVG grain), a `.md` sidecar (rationale + tokens), and
ships **both light + dark** (semantic tokens + `[data-theme]` header toggle; both verified
first-class @1440). Honest to the data model (uncast states shown; no fabricated per-channel
analytics beyond active-jobs + spend; thumbnail-or-placeholder).

| Dir | File | Native | Point of view | Signature moves | Risk |
| --- | --- | --- | --- | --- | --- |
| **D1 — Transmission** | `direction-transmission.html` | warm light (+ warm dark) | Analog-broadcast / tactile editorial — the old dossier personality done first-class | SVG grain, grid-paper canvas, "FILE REF / NO. 01" index cards, mono dot-leaders, rotated `PENDING CAST` / `APPROVED` stamps, candy-stripe priority banner, serif display | texture must stay legible + fast; can read "busy" if overdone |
| **D2 — Marquee** | `direction-marquee.html` | dark (+ light) | Oversized editorial type as the interface — a confident content-brand cockpit | full-bleed red `AWAITING ACTION` band, giant serif `CHANNELS` headline, strict hairline column grid, mono labels, high type-scale contrast | big type eats vertical space; must keep the daily scan dense/fast |
| **D3 — Signal** | `direction-signal.html` | dark (+ day-shift light) | Cinematic operator deck with a pulse — mission control that's alive | amber priority glow + pulse dot, cyan telemetry accent, glowing active-card edges, `CH::01` tags, mono numerics, function-first depth (no glass mush) | keep it credible, not sci-fi; glow must reinforce hierarchy |

**Known mock nits (not direction flaws):** the theme-toggle button *label* doesn't update on click
in D1 (theme still switches correctly); D3's "NEW CHANNEL" label overlaps its "+" glyph. Both are
trivial build-time fixes, not reasons to rule a direction out.

**How to judge:** open each `.html`, flip the toggle, resize to a phone width. Pick the one whose
*point of view* is right — the chosen direction becomes the full Phase-1 design system
(`../phase1-visual-brief.md` Step 2) and every screen is built against it. Mixing is fine (e.g.
"D3's structure with D1's texture") — tell me.
