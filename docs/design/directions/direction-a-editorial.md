DIRECTION: ELEVATED EDITORIAL

RATIONALE:
This direction establishes a highly refined, trustworthy workspace for the solo operator by leveraging a high-contrast, warm-literary palette (warm cream-and-ink) and sharp editorial typography. By pairing an elegant serif typeface for structural headers with a high-readability sans-serif for interactive elements and metadata, the dashboard feels like a curated ledger or high-end financial dashboard rather than a generic SaaS app. This aesthetic reads as credible, precise, and serious—perfectly matching a workflow managing real capital and brand-sensitive automated content where hasty decisions carry legal and financial risk. The primary risk of this approach is that it could feel too passive or static if not balanced by clear interactive affordances and crisp, active states.

TOKENS:
- Palette: 
  - `--bg-canvas`: `#FDFCF7` (Alabaster cream; baseline page background)
  - `--bg-card`: `#FFFFFF` (Pure paper white for structured containers)
  - `--text-primary`: `#1C1B18` (Deep charcoal ink; contrast ratio 15.9:1 against cream, 16.5:1 against white)
  - `--text-secondary`: `#6B665F` (Muted warm taupe; contrast ratio 4.9:1 against cream, 5.1:1 against white)
  - `--accent`: `#8B4A30` (Rust terracotta; contrast ratio 5.2:1 against cream; used sparingly for primary alerts and active counts)
  - `--border`: `#E5E2D8` (Warm grey divider line)
  - `--border-focus`: `#1C1B18` (Sharp, high-contrast focus rings)
- Typography:
  - Headings (Serif): `Georgia, 'Times New Roman', serif` (Confident, authoritative, structured)
  - Body/UI (Sans): `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (Calm, highly legible, precise)
  - Scale: Heading 1 (1.875rem/30px), Heading 2 (1.25rem/20px), Body/UI (0.875rem/14px), Micro (0.75rem/12px)
- Spacing Rhythm: 4px base grid. Common steps: `8px` (compact label-to-value), `16px` (card padding), `24px` (container gaps), `48px` (major page margins).
- Radius & Elevation: Absolute precision. Very sharp corners (`--radius: 2px`). Zero heavy drop-shadows; separation is achieved cleanly through borders and flat structural depth.
- Motion: Snappy, natural transitions (`150ms cubic-bezier(0.16, 1, 0.3, 1)`) applied exclusively to focus states and action hover states; no playful bounces or decorative entries.

