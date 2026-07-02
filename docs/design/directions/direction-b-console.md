DIRECTION: CLEAN MODERN CONTROL-ROOM

RATIONALE
This direction channels the quiet confidence of top-tier developer tools and modern SaaS platforms. It is designed for a non-technical founder who needs to feel like an operator in control of a precise, high-stakes system, rather than someone playing with a toy. By using a dark, neutral canvas with a restrained blue accent, it reduces visual fatigue and clearly highlights actionable items (like pending approvals or uncast warnings) without inducing panic. The biggest risk is that it might feel slightly too clinical or "developer-centric" for a media company, potentially lacking organic warmth.

TOKENS
- Palette: 
  - Background: `#0f172a` (Slate 900)
  - Surface: `#1e293b` (Slate 800)
  - Border: `#334155` (Slate 700)
  - Primary Text: `#f8fafc` (Slate 50) — Contrast on Surface: ~13.9:1 (AA passes)
  - Secondary Text: `#94a3b8` (Slate 400) — Contrast on Surface: ~5.3:1 (AA passes)
  - Accent/Primary Button: `#2563eb` (Blue 600) with `#ffffff` text — Contrast: ~5.5:1 (AA passes)
  - Warning/Uncast: `#f59e0b` (Amber 500)
- Typography: System sans-serif stack (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`). Clean, utilitarian hierarchy scaling from 12px (xs) to 20px (xl), utilizing font-weight (400, 500, 600) for distinction rather than color.
- Spacing: Strict 4px baseline grid. Internal card padding is 20px (`--space-5`); grid gap is 16px (`--space-4`).
- Radius/Elevation: Sharp but safe `--radius-md` (6px) for cards, `--radius-full` for badges. Flat design relying on borders for containment, no heavy drop shadows. 
- Motion: Instantaneous by default. Minor interactive elements (hover states, focus rings) use a strict 150ms ease-out transition.

