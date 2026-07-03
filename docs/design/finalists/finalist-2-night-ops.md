DIRECTION: ARCHITECTURAL BENTO

RATIONALE
This direction, "Architectural Bento," actively fuses the premium, tactile dimensionality of the "Soft Bento" concept with the raw, uncompromising structural rigor of "Terminal Noir." By employing a literal graph-paper "blueprint" chassis overlaid with cinematic film grain, we establish an immediate sense of mechanical precision and physical scale. We then aggressively contrast this strict technical grid with massive, opinionated editorial serif typography and a striking "Blueprint Blue" signature color, curing the "flat/generic SaaS" problem by leaning heavily into a broadcast control-room aesthetic. The UI functionally leverages physical depth—cards pop off the structural grid via lush shadows, guiding the operator's eye directly to the Action Center and live telemetry. The biggest risk is that the explicit background grid and high-contrast typography may feel visually intense to users accustomed to sterile, flat software, but it unapologetically delivers the commanded "designed, opinionated, strange-broadcast HQ" authority.

TOKENS
- Palette (Light): 
  - Signature Blueprint Blue: #1D4ED8 (Text on #FFFFFF: 8.0:1 AA)
  - Surface: #FCFBFA | Raised: #FFFFFF | Canvas/Grid: #F3F1EC
  - Text: #1C1917 (15.6:1 AA) | Text-Dim: #57534E (5.7:1 AA)
  - Status Harmony: Success #15803D (4.5:1), Warn #A16207 (4.8:1), Danger #B91C1C (5.6:1)
- Palette (Dark): 
  - Signature Blueprint Blue: #60A5FA (Black text on it: 8.0:1 AA)
  - Surface: #1A1815 | Raised: #24211D | Canvas/Grid: #12100E
  - Text: #F5F5F4 (15.5:1 AA) | Text-Dim: #A8A29E (5.2:1 AA)
  - Status Harmony: Success #4ADE80 (5.1:1), Warn #FACC15 (5.4:1), Danger #F87171 (4.6:1)
- Typography: 
  - Display/Editorial: `ui-serif, Georgia, "Times New Roman", serif` (Expressive, italicized headers)
  - Data/Structural: `ui-monospace, SFMono-Regular, Menlo, monospace` (Strict uppercase tabular data)
  - Base/UI: `system-ui, -apple-system, sans-serif`
- Structure & Depth: 
  - Radius: 20px (Hardware-like curves). Grid Lines: 48px baseline background pattern.
  - Shadow: Lifted state uses an 0 12px 24px deep diffuse shadow to pull priority items toward the lens.
  - Texture: Global SVG fractal noise (multiply/overlay) to inject tactile grain.
  - Motion: Snappy spring-like Y-axis lifts on hover. Honors `prefers-reduced-motion`.

