# Typography / theme uniformity sweep — 2026-07-05

_Companion to the copy audit. Checks whether the Aurora shell reads as ONE visual system. Verdict: **it
doesn't yet** — the re-homed surfaces leak the legacy "terminal" type system. One scoped CSS fix (S1)
resolves the bulk of it. Legacy `.cr` shell is out of scope (it's being deleted in sub-lane 5g)._

## The core finding — two type systems, and Aurora leaks the legacy one

| | Legacy (`globals.css`) | Aurora (`aurora.css`) |
|---|---|---|
| Display font | `--display: 'Oswald'` | `--font-sans` (system stack) |
| Micro-labels | `--mono: 'JetBrains Mono'` + `text-transform: uppercase` + `letter-spacing:.1em` | sans, sentence case |
| Colors | `--paper-dim` / `--ink` / `--brass` (parchment) | `--text-*` / `--surface-*` / `--accent` |

The offending **label classes** — `.eyebrow` (globals.css:22), `.filecode` (:77), `.navbtn span` (:39),
`.col-head h2` (:50), `.count` (:52), `.metric-eyebrow` (:1601), and field `label` — all hard-set
**monospace + UPPERCASE + parchment color**. They are **global** classes, and the Aurora re-home skins
reuse them. My scoped re-skins (sub-lanes 2 / 3a / 5d / 5e) **recolored** these to Aurora tokens but did
**not** reset `font-family` or `text-transform` — so those surfaces render JetBrains-Mono ALL-CAPS labels
(the "raw terminal" look), while the native Aurora surfaces render clean sans sentence-case. That
inconsistency is the half-migration a reviewer sees.

## Surface-by-surface

**✅ Native Aurora — consistent (leave):** `HubLanding`, `ChannelsHub`, `CharactersHub`, `ActionCenter` —
use `.text-display` / Aurora `.btn` / Aurora tokens. (Their only issue is the *deliberate* `// EYEBROW`
`.text-mono` labels, which the copy audit flags separately — that's Aurora's own mono, not the legacy leak.)

**⚠️ Re-homed — leak legacy typography (fix):**
- **Channel form + workspace Guidelines** (`.channel-profiles.scoped`) — `.eyebrow` field labels + `.filecode`
  (`CHANNEL PROFILE` / `NEW ROW`) render mono ALL-CAPS. _This is the exact surface Gemini flagged._
- **Characters bench + dossier editor** (`.characters-bench.scoped` + `renderDossierEditor`) — `.eyebrow`,
  `.filecode` (`FILE · {ID}`), field labels, `.count`.
- **System Overview** (`.overview-hub.scoped`) — `.metric-eyebrow`, `.eyebrow` labels (I recolored, didn't
  de-mono/de-caps).
- **Cost Center** (`.cost-center.scoped`) — `.metric-eyebrow`, `.budget-target-label`, `.count`.
- **Casting / Visual panels** — their own ALL-CAPS mono eyebrows + bracket-chrome (`[ … ]`).

## Secondary consistency nits (from Gemini + the copy audit)
- **Off-brand accent border:** the engagement-dials block carries a cyan/magenta left border that reads like
  a leftover `<blockquote>`/debug rule — doesn't match Aurora.
- **Flat field surfaces:** form inputs/dropdowns render as flat dark voids rather than Aurora "glassy"
  surfaces on some scoped forms; verify the scoped `.field` inputs use `--surface-*` + border consistently.
- **Bracket chrome:** `[ VISUAL CAST ]`, `[ PURGE ]`, `[ MODIFIED ]` etc. — decorative brackets are a legacy
  affordance; Aurora buttons/chips shouldn't wear them.

## The fix — S1 (scoped, low-risk)
Add an Aurora-scoped reset so the leaked label classes inherit the Aurora type system **only inside
`.aurora-app`** (the legacy `.cr` shell keeps its terminal look until 5g deletes it — same scoping
discipline as sub-lanes 3/5d/5e):

```css
.aurora-app .eyebrow,
.aurora-app .filecode,
.aurora-app .metric-eyebrow,
.aurora-app .col-head h2,
.aurora-app .count,
.aurora-app .channel-profiles.scoped .field label,
.aurora-app .characters-bench.scoped .field label {
  font-family: var(--font-sans);
  text-transform: none;
  letter-spacing: normal;
}
```

This flips every re-homed surface from "terminal" to Aurora typography in one place, and de-risks the copy
edits (labels then render as written). AA is unaffected (color already Aurora); re-ratify for overflow +
that no native Aurora surface regresses. Pair this with copy-audit **S1** (same root) and land them together.

**Sequencing:** land this scoped typography reset **with** the copy P0 blockers as one "S1 + P0" remediation
lane — they touch the same surfaces and the same root cause.
