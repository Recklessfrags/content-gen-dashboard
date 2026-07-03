DIRECTION: RISOGRAPH / PRINT-ZINE

RATIONALE
This direction rejects the muted, frictionless aesthetic of modern SaaS in favor of a tactile, high-contrast "Print-Zine" identity. By utilizing visible halftone dot shadows, simulated CMYK/Riso misregistration on the wordmark, and flat, poster-like spot colors, it evokes the raw structural clarity of physical production ledgers and indie broadcast zines. It fits a money and brand control tool because its aggressive mono-spaced grids and high-ink visibility convey absolute data permanence and structural honesty—it feels like a binding physical document. The design feels "designed" and highly opinionated, bringing a "strange-broadcast HQ" energy without sacrificing legibility. The biggest risk is that the graphic intensity (halftones and heavy black/navy borders) may feel visually "loud" to users accustomed to low-contrast, soft-shadowed interfaces, requiring careful whitespace management as data density scales.

TOKENS
- Palette (Light - Native):
  - `--bg`: `#F4F1EB` (Off-white paper)
  - `--surface`: `#FFFFFF` (Pure white)
  - `--border`: `#0A1931` (Deep Navy ink)
  - `--text`: `#0A1931` (Deep Navy, 13:1 on bg)
  - `--text-dim`: `#4A5568` (Slate ink, 5.5:1 on bg)
  - `--accent`: `#FF5E00` (Fluo Orange spot color)
  - `--spot-cyan`: `#00A3DB` (Cyan spot color)
  - `--halftone-dot`: `rgba(10, 25, 49, 0.25)`
  - `--success`: `#008A4E` (4.5:1 on bg)
  - `--warn`: `#D97700` (4.5:1 on bg)
  - `--danger`: `#D91627` (5.5:1 on bg)
- Palette (Dark - Override):
  - `--bg`: `#080C16` (Deep black-navy)
  - `--surface`: `#121A2F` (Dark surface)
  - `--border`: `#2A3F6B` (Lighter navy ink)
  - `--text`: `#F4F1EB` (Off-white, 15:1 on bg)
  - `--text-dim`: `#9DA8C4` (Light slate, 6.5:1 on bg)
  - `--accent`: `#FF7B33` (Bright Fluo Orange)
  - `--spot-cyan`: `#00C2FF` (Bright Cyan)
  - `--halftone-dot`: `rgba(244, 241, 235, 0.15)`
  - `--success`: `#00D076` (11:1 on bg)
  - `--warn`: `#FFC433` (12:1 on bg)
  - `--danger`: `#FF4D5E` (6:1 on bg)
- Typography: Display: `'Arial Black', Impact, sans-serif` (Heavy, editorial ink). Body: `system-ui, -apple-system, sans-serif`. Mono: `'Space Mono', 'Courier New', Courier, monospace` (Raw, structural numerics).
- Spacing & Grid: Base 8px scale. 2px thick ink borders, exposed 2rem background grid.
- Radius & Elevation: 2px border-radius (simulates slight ink spread on a sharp cut). Elevation achieved via stationary halftone-dot drop shadows, not soft blurs.
- Texture Technique: Flat spot colors combined with SVG/CSS radial-gradient halftones and overprint offset effects (`text-shadow`).
- Motion: Snappy, physical card shifts on hover revealing more of the stationary halftone pattern behind it (`cubic-bezier(0.2, 0, 0, 1)`).

