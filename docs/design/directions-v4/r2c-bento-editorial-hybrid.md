DIRECTION: Bento x Editorial

RATIONALE
This direction marries the tactile warmth of rounded modular interfaces with the uncompromising, confident typography of high-end editorial print. It uses massive, elegant italic serifs to give each channel a distinct "show" identity, while rigorous monospace data blocks assert the tool’s precision as a financial and operational control surface. The structural bento grid provides a digestible hierarchy without feeling generic, avoiding sterile grays in favor of warm, noise-textured canvases and a pulsating "broadcast HQ" hero state. This duality—soft dimensional containers housing strict, opinionated typography—builds immense character while maintaining high trust for an operator approving spend and brand-sensitive content. The biggest risk is the high contrast in type scales feeling disjointed if content lengths vary wildly, though the rigid bento structure successfully compartmentalizes and anchors it.

TOKENS
- Core Palette (Light): --bg #F5F4F2, --surface #FFFFFF, --border #E5E2DC, --text #1C1B1A (13.5:1), --text-dim #6B6863 (4.9:1), --signature #D90B59 (5.2:1).
- Core Palette (Dark): --bg #151413, --surface #1E1C1B, --border #36322F, --text #EAE6E1 (11.8:1), --text-dim #A8A29D (6.7:1), --signature #FF4D8C (5.0:1).
- Status Family: Harmonized Green/Amber/Red ensuring >4.5:1 contrast against surface in both modes.
- Typography: System Serif (Display/Titles, 400 Italic), System Mono (Data/Labels/Telemetry, 500/600, +0.05em tracking), System Sans (Base). High contrast scale (0.7rem to 3.5rem).
- Structure & Depth: 24px card radius, 16px pills, 99px primary button. Soft, deep shadows (`0 12px 32px rgba(...)`) mapping physical elevation.
- Texture: Global SVG feTurbulence layer (multiply 0.25 light, overlay 0.15 dark) for tactile film grain.
- Motion: Snappy Y-axis card lift (`transform: translateY(-4px)`) and horizontal icon shifts, emphasizing physical readiness.

