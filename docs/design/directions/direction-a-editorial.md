DIRECTION: ELEVATED EDITORIAL

### RATIONALE
The "Elevated Editorial" direction positions this Control Room not as a standard, busy software dashboard, but as a prestigious production office. It uses a sophisticated system serif for prominent titles and crisp system sans-serif for numbers and metadata, evoking the confidence and precision of an established print masthead or high-end curatorial institution. This tone reassures the solo operator that their capital approvals and brand standards are handled with structural gravitas and dignity rather than casual, gamified interfaces. The biggest risk of this direction is that it could feel too passive or slow if the typographical hierarchy lacks clear interactive cues; we mitigate this with a sharp, warm rust accent color and structured structural divisions that focus attention directly on high-importance actions.

**TOKENS**
- **Palette (Light - Native)**:
  - `--bg-base`: `#FAF8F5` (Warm cream. Contrast vs primary text: 17.5:1)
  - `--bg-surface`: `#FFFFFF` (Pure white. Contrast vs primary text: 19.5:1)
  - `--border-color`: `#E6DFD5` (Soft warm clay border)
  - `--text-primary`: `#1A1917` (Rich carbon ink)
  - `--text-secondary`: `#6E675F` (Muted warm graphite. Contrast vs surface: 4.8:1)
  - `--accent`: `#B84A39` (Restrained warm rust. Contrast vs surface: 5.2:1)
- **Palette (Dark)**:
  - `--bg-base`: `#141312` (Deep warm coal. Contrast vs primary text: 16.8:1)
  - `--bg-surface`: `#1D1C1A` (Lighter warm coal. Contrast vs primary text: 14.5:1)
  - `--border-color`: `#33302B` (Soft dark-brown border)
  - `--text-primary`: `#F4EFEA` (Warm ivory)
  - `--text-secondary`: `#A39B93` (Warm muted gray. Contrast vs surface: 5.1:1)
  - `--accent`: `#E27D60` (Softer terracotta. Contrast vs surface: 5.4:1)
- **Typography**: Headings: `Georgia, 'Times New Roman', serif` (elegant weight hierarchy). Body/UI: `system-ui, -apple-system, sans-serif` (highly legible).
- **Spacing**: Derived from an `8px` grid (8px, 16px, 24px, 48px, 72px) for structured, generous breathing room.
- **Radius & Elevation**: `0px` to `4px` maximum radius (sharp, crafted corners). Elevation is flat, relying instead on clean, deliberate border rules to separate contexts.
- **Motion**: Subtle CSS transition on theme switch and hover states (`150ms cubic-bezier(0.4, 0, 0.2, 1)`). Respects `prefers-reduced-motion` by disabling transitions when requested.

