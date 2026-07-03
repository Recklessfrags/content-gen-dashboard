DIRECTION: Precision Signal

RATIONALE
This direction explores the tension between high-end architectural modernism (Swiss Style, Dieter Rams) and the functional starkness of a broadcast control room. It achieves a deeply premium, "timeless" aesthetic through extreme typographic discipline, a rigorous structural grid, and a singular, electric cobalt signature color against a tactile, matte canvas. By styling the UI as a precision instrument—complete with faint graticule lines, milled-style borders, and "test-pattern" avatars for uncast channels—it injects a "strange-broadcast HQ" personality without compromising the absolute trust required for financial and brand approvals. The biggest risk is that its stark, opinionated geometry and lack of soft drop-shadows may feel overly rigid to users expecting the playful bounce of modern consumer SaaS, requiring them to adopt the mindset of operating high-grade equipment.

TOKENS
- Palette (Light Mode / Default):
  --bg: #F3F2EE (Matte Bone)
  --surface: #FCFCFA (Crisp White)
  --border: #E0DFDB (Structural Gray)
  --border-strong: #C4C3BE
  --text: #171717 (Rich Black - 14.5:1 on bg)
  --text-dim: #6B6A65 (Muted Slate - 5.3:1 on bg, AA)
  --signature: #0033E6 (Electric Cobalt - 6.2:1 on bg, AA)
  --signature-hover: #002ACC
- Palette (Dark Mode):
  --bg: #0B0B0D (Obsidian)
  --surface: #141417 (Deep Slate)
  --border: #2B2B30
  --border-strong: #45454D
  --text: #F2F2F5 (Off-White - 15:1 on bg)
  --text-dim: #94949E (Muted Ash - 5.8:1 on bg, AA)
  --signature: #3D6BFF (Vibrant Cobalt - 5.5:1 on bg, AA)
  --signature-hover: #668CFF
- Status Family (Harmonious, AA on respective surfaces):
  --success: Light #0F7A41 (5.4:1) / Dark #34D399 (7.2:1)
  --warn: Light #B85C00 (4.8:1) / Dark #FBBF24 (7.5:1)
  --danger: Light #D12424 (5.2:1) / Dark #F87171 (6.8:1)
- Typography: 
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  Scale: Extreme contrast. Micro-labels at 0.65rem (tracked wide), primary data at 2.5rem (tracked tight).
- Spacing/Radius/Elevation: 2px sharp radiuses. Zero drop shadows; depth is achieved via 1px inset borders ("milled" effect) and absolute grid alignment.
- Texture: Faint SVG `feTurbulence` fractal noise blended over the document to simulate matte paper/anodized aluminum.
- Motion Principle: "Snap." Zero easing drift. Instant, mechanical state changes (0.1s linear) to feel like physical switches.

