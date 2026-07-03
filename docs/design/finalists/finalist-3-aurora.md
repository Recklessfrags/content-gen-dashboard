DIRECTION: SPATIAL / AURORA DEPTH

RATIONALE
This direction rejects flat, lifeless dashboards in favor of a "Spatial Computing" aesthetic—luminous, deep, and layered. By treating the interface as a series of frosted glass panels floating above an ambient, dynamic aurora light field, it feels like a next-generation command center (premium, serene, yet highly technical). This fits a money/brand control tool by establishing a calm, clear hierarchy where important actions (like approvals) physically "float" higher in the z-index with glowing active borders, ensuring the operator's attention is flawlessly managed. The biggest risk is that heavy use of backdrop-filter blurs can impact performance on very low-end devices or become visually muddy if contrast isn't strictly maintained, which is mitigated here by anchoring all text to high-contrast structural layers.

TOKENS
- Palette (Dark - Native):
  --bg-base: #05050A (Deepest space)
  --aurora-1: #4A00E0 (Indigo core)
  --aurora-2: #00E5FF (Cyan edge)
  --aurora-3: #FF007F (Magenta accent)
  --surface-0: rgba(15, 15, 20, 0.4) (Backdrop panel)
  --surface-1: rgba(25, 25, 35, 0.6) (Interactive card)
  --surface-2: rgba(255, 255, 255, 0.08) (Hover state)
  --border-soft: rgba(255, 255, 255, 0.1)
  --border-glow: rgba(0, 229, 255, 0.4)
  --text-main: #FFFFFF (Contrast: 12:1 against surface)
  --text-dim: rgba(255, 255, 255, 0.65) (Contrast: 5.5:1)
  --accent: #00E5FF (Luminous signature, Contrast: 7:1)
  --success: #00E676 (Contrast: 6.8:1)
  --warn: #FFD54F (Contrast: 8:1)
  --danger: #FF1744 (Contrast: 4.5:1 against surface)
- Palette (Light - Override):
  --bg-base: #F8F9FA
  --aurora-1: #A6C0FE
  --aurora-2: #F68084
  --aurora-3: #E0C3FC
  --surface-0: rgba(255, 255, 255, 0.6)
  --surface-1: rgba(255, 255, 255, 0.8)
  --surface-2: rgba(255, 255, 255, 1)
  --border-soft: rgba(0, 0, 0, 0.08)
  --border-glow: rgba(0, 102, 255, 0.3)
  --text-main: #0B0F19 (Contrast: 14:1)
  --text-dim: rgba(0, 0, 0, 0.6) (Contrast: 6:1)
  --accent: #0066FF (Contrast: 5.5:1)
  --success: #008A27 (Contrast: 5.2:1)
  --warn: #D97706 (Contrast: 4.8:1)
  --danger: #DC2626 (Contrast: 5:1)
- Typography: System sans-serif stack, dialed to extremes. Headers use tight tracking (-0.03em) and heavy weights (800) for a structural, modern feel. Numerics use `tabular-nums` for precision.
- Depth/Texture: High `backdrop-filter: blur(24px) saturate(150%)` combined with an inner highlight (`inset 0 1px 1px var(--highlight)`) and an SVG noise overlay (`mix-blend-mode: overlay`) to create physical "frosted glass".
- Motion: "Spatial Snap" - items physically lift (`translateY(-4px)`) and expand their ambient shadow on hover, keeping the interaction tactile.

