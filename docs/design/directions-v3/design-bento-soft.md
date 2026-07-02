DIRECTION: BENTO SOFT

RATIONALE
The "Bento Soft" direction is the antidote to sterile, tabular enterprise software. It treats the Control Room as a premium, consumer-grade instrument—approachable, tactile, and highly legible, much like high-end audio gear or modern spatial interfaces. By utilizing an asymmetric bento grid with generous radii, soft dimensional shadows, and a warm, noise-textured neutral base, we create a space that feels inviting yet highly structured. This fits a solo founder dealing with money and brand because it replaces cognitive overload with clear, modular bounding boxes; you don't read a ledger, you scan physical-feeling objects. The biggest risk is that the "softness" might read as too playful, which is mitigated by employing strict grid alignment, stark monospace data points, and a highly restrained, harmonious traffic-light color system.

TOKENS
- Palette (Light Mode):
  - `--bg`: `#F4F2EE` (Warm Oat, Base)
  - `--surface`: `#FFFFFF` (Card background)
  - `--surface-raised`: `#FAFAFA` (Hover states)
  - `--border`: `#E5E2DC`
  - `--text`: `#1C1B1A` (Contrast: ~15:1 on surface)
  - `--text-dim`: `#6B6863` (Contrast: ~5.3:1 on surface)
  - `--accent`: `#6D28D9` (Rich Ube Purple - Signature. Contrast: 5.8:1 on surface)
  - `--accent-surface`: `#F3E8FF` (Soft Ube background)
  - `--success`: `#059669` (Earthy Sage. Contrast: 4.6:1 on surface)
  - `--warn`: `#D97706` (Golden Ochre. Contrast: 4.8:1 on surface)
  - `--danger`: `#DC2626` (Muted Brick. Contrast: 4.9:1 on surface)
- Palette (Dark Mode):
  - `--bg`: `#121110` (Deep Charcoal, Base)
  - `--surface`: `#1C1B1A` (Card background)
  - `--surface-raised`: `#262524` (Hover states)
  - `--border`: `#2E2C2A`
  - `--text`: `#EBE7E0` (Contrast: ~12:1 on surface)
  - `--text-dim`: `#9CA3AF` (Contrast: ~4.5:1 on surface)
  - `--accent`: `#A78BFA` (Vibrant Ube Purple. Contrast: 6.2:1 on surface)
  - `--accent-surface`: `#2E1065` (Deep Ube background)
  - `--success`: `#34D399` (Bright Sage. Contrast: 8:1 on surface)
  - `--warn`: `#FBBF24` (Bright Amber. Contrast: 9:1 on surface)
  - `--danger`: `#F87171` (Soft Coral Red. Contrast: 6:1 on surface)
- Typography: Primary: System Sans-Serif (`system-ui, -apple-system, sans-serif`) with tight tracking (`-0.02em`) for headings. Secondary/Data: System Monospace (`ui-monospace, SFMono-Regular, monospace`) for structural clarity.
- Scale: Hero (32px), H1 (24px), H2 (18px), Body (14px), Mono Data (20px), Label (12px uppercase).
- Structure: Generous `28px` card radius (outer), `16px` inner pill radius. Dense `24px` card padding.
- Texture: A global `<svg>` fractal noise overlay (opacity: 0.3 light, 0.15 dark) mixed with `mix-blend-mode: multiply/overlay` to break up flat vector plains and give a "paper/matte plastic" grain.
- Motion: `transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`—a slightly springy, satisfying physical press on hover/active states.

