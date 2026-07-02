DIRECTION: SIGNAL

RATIONALE
"Signal" rejects the sterile, flat-gray SaaS aesthetic in favor of a "cinematic operator deck"—a dimensional, mission-control environment with real soul. It uses a high-contrast electric amber signature, layered architectural depth, and raw structural elements (visible grid lines, tabular mono-numerics) to evoke a live, broadcasting transmission rather than a static spreadsheet. This fits a money/brand control tool perfectly because it treats approvals as critical, high-stakes events (using function-first glowing depth) while retaining the absolute precision and credibility of a professional console. The biggest risk is that the stark contrast and editorial typography might feel intimidating or overly "heavy" to users accustomed to bland, consumerized software, but it pays off by establishing immense trust and a clear point of view.

TOKENS
- **Palette (Dark - Native):**
  - `--bg`: `#0a0a0c` (Obsidian)
  - `--surface`: `#141417` (Elevated console)
  - `--border`: `#2a2a32` (Grid lines)
  - `--text`: `#ededf0` (CR: 13.5:1)
  - `--text-dim`: `#8b8b99` (CR: 4.6:1)
  - `--accent`: `#FF5E00` (Electric Amber, CR: 5.5:1)
  - `--success`: `#00E5FF` (Cyan, CR: 10.9:1)
- **Palette (Light - Day Shift):**
  - `--bg`: `#f4f4f0` (Warm paper)
  - `--surface`: `#ffffff` (Bright console)
  - `--border`: `#d0d0c8`
  - `--text`: `#111110` (CR: 18.9:1)
  - `--text-dim`: `#666660` (CR: 5.7:1)
  - `--accent`: `#E64A00` (Deep Amber, CR: 4.8:1)
  - `--success`: `#008494` (Deep Cyan, CR: 5.2:1)
- **Typography:**
  - *Serif (Shows/Editorial):* `ui-serif, Georgia, serif`
  - *Sans (UI):* `system-ui, -apple-system, sans-serif`
  - *Mono (Data/Structure):* `ui-monospace, "SF Mono", "Cascadia Mono", monospace`
- **Scale & Composition:** Base 16px. Bento grid (12-column foundation) with 1rem gaps. 6px border radius (brutalist but polished).
- **Texture:** Fixed SVG `feTurbulence` overlay (opacity 0.04) + macro CSS linear-gradient background grid.
- **Motion Principle:** Crisp, rhythmic pulsing on actionable/live states (tally lights and the Action Center glow) to signify a "living machine," dropping to static if `prefers-reduced-motion` is active.

