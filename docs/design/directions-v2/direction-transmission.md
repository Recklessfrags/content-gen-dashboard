DIRECTION: TRANSMISSION

RATIONALE
This direction rejects the sterile, flat-gray SaaS aesthetic in favor of a "tactile editorial / strange-broadcast dossier" personality. It treats the Control Room as a physical operations desk—trustworthy enough to handle money and brand guidelines, but characterful enough to feel like an intelligence agency for internet oddities. By pairing warm, gritty textures (film grain + faint graph paper) with high-contrast editorial typography (heavy serif + strict monospace) and dimensional structural lines, the interface becomes a highly legible, opinionated environment. The biggest risk is that the strong stylistic borders and textures might feel visually heavier than a modern minimalist app, but this "raw structural clarity" ensures data is distinct and impossible to misread during high-stakes daily triage.

TOKENS
- **Palette (Warm Light - Native):**
  - `--bg`: `#F4F1EA` (Warm Oatmeal) | Ratio on text > 12:1
  - `--surface`: `#FCFBF9` (Bleached Paper) | Ratio on text > 14:1
  - `--border`: `#171614` (Deep Ink)
  - `--border-faint`: `#D4CDC1` (Faded Ledger Line)
  - `--text`: `#171614` (Deep Ink) | Ratio on bg > 12:1
  - `--text-dim`: `#59554D` (Typewriter Grey) | Ratio on bg > 5.5:1
  - `--accent`: `#D32F2F` (Signal Red) | Ratio on bg > 5:1
  - `--accent-dim`: `#FDEAEA` (Washed Red)
  - `--warn`: `#D97706` (Amber Ochre)
  - `--success`: `#3F6212` (Field Green)
- **Palette (Warm Dark - Override):**
  - `--bg`: `#151413` (Espresso) | Ratio on text > 11:1
  - `--surface`: `#1C1A18` (Dark Umber) | Ratio on text > 10:1
  - `--border`: `#E8E2D9` (Bone)
  - `--border-faint`: `#36332E` (Dim Brass)
  - `--text`: `#E8E2D9` (Bone) | Ratio on bg > 11:1
  - `--text-dim`: `#A39E93` (Tarnished Silver) | Ratio on bg > 5.5:1
  - `--accent`: `#EF4444` (Bright Signal Red) | Ratio on bg > 5.5:1
  - `--accent-dim`: `#3F1919` (Deep Rust)
  - `--warn`: `#F59E0B` (Bright Amber)
  - `--success`: `#84CC16` (Neon Moss)
- **Typography:**
  - Font Families: `Georgia, 'Times New Roman', serif` (Display/Titles), `system-ui, sans-serif` (Utility), `'Courier New', Courier, monospace` (Data/Numerics).
  - Scale: Expressive high contrast. H1 at 2rem (serif), Eyebrows at 0.75rem (mono, tracked out).
- **Structure:**
  - Spacing: Rigid 4px baseline grid (`0.5rem`, `1rem`, `1.5rem`).
  - Radius/Elevation: 0px (brutalist, sharp edges). Elevation via solid block shadows (e.g., `4px 4px 0 var(--border)`).
  - Texture: Global SVG `feTurbulence` noise blend + CSS linear-gradient graph paper background.
  - Motion: Instant, utilitarian snaps. Active states depress the solid shadows physically (`transform: translate(2px, 2px)`).

