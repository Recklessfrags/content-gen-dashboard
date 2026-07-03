DIRECTION: CHROMA-STRUCT // STUDIO A

RATIONALE: 
This direction fuses the raw, structural precision of high-end broadcast hardware (like SMPTE switchers) with the bold, maximalist typography of avant-garde editorial design. It explicitly rejects both the soft, generic SaaS look and the harsh novelty of neo-brutalism, opting instead for a "blueprint studio" aesthetic characterized by a faint millimeter-grid, deep dimensional floating panels, and hyper-tight, oversized typography. For an operator running an automated content workforce, this framing elevates their daily triage into the feeling of directing a live television network—giving weight, authority, and high-fidelity contrast to brand-sensitive approvals. The biggest risk is that the aggressive type scale and outline-stroke numbers prioritize striking visual hierarchy over conventional software density, which might feel intimidating to users accustomed to standard padded dashboards.

TOKENS:
- Palette (Light): `--bg` #EBEDF0, `--surface` #FFFFFF, `--text` #090A0C (20:1), `--text-dim` #5C616B (5.5:1), `--accent` #1133FF (7.4:1), `--success` #007A3D (5.5:1), `--warn` #B85C00 (4.8:1), `--danger` #D61A00 (5.2:1), `--grid-line` rgba(9, 10, 12, 0.06).
- Palette (Dark): `--bg` #090A0E, `--surface` #151720, `--text` #F2F4F8 (14:1), `--text-dim` #8E94A3 (4.8:1), `--accent` #5C77FF (4.9:1), `--success` #00D169 (4.8:1 against surface, text inside uses dark), `--warn` #FF9933 (4.6:1), `--danger` #FF4D4D (5.1:1), `--grid-line` rgba(242, 244, 248, 0.05).
- Typography: Sans-Serif (`Inter, -apple-system, sans-serif`) forced into extreme weights (800/900) with tight tracking (-0.04em); Mono (`JetBrains Mono, Courier New, monospace`) for structural data.
- Spacing & Structure: 12-column asymmetric bento grid; Flush 1.5rem gaps; Elements anchored to an implicit blueprint background.
- Radius & Elevation: 12px precision-milled radius; Deep, soft ambient shadows (`0 12px 40px rgba(x,x,x,0.1)`) with a sharp 1px glass inner-highlight.
- Texture: A global SVG `feTurbulence` film-grain overlay paired with a CSS repeating-linear-gradient blueprint grid on the base layer.
- Motion: Snappy, hardware-like toggles. Hover states emphasize dimensional depth and structural borders.

