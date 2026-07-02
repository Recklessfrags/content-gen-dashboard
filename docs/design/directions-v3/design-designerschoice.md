**DIRECTION: TERMINAL NOIR / AVANT-GARDE**

**RATIONALE**
This direction radically abandons standard "SaaS" aesthetics in favor of a "High-Fashion Editorial meets Studio Telemetry" concept. It uses a raw, hairline-grid structural foundation (literally constructed using 1px gaps exposing the background) combined with massive, elegant Serif typography and dense Monospace data blocks. It fits a money/brand control tool because it feels highly precise, unforgiving, and deeply authoritative—it frames the user's automated agents not as standard software features, but as flagship editorial properties (magazine covers/broadcast shows) that require executive sign-off. The signature "Broadcast Pink" provides a sharp, unnatural digital energy against the monochromatic structure. The biggest risk is that its stark, structural brutality and reliance on typographic scale over conventional UI containers might initially feel unfamiliar to users accustomed to soft, rounded dashboards.

**TOKENS**
*   **Palette (Dark - Native):**
    *   `--bg-canvas`: `#0A0A0B` (Void)
    *   `--bg-surface`: `#141416` (Module background)
    *   `--bg-surface-alt`: `#1C1C1F` (Hover states)
    *   `--border`: `#333336` (The structural grid, very visible)
    *   `--text-primary`: `#F4F4F5` (High contrast, >14:1)
    *   `--text-dim`: `#A1A1AA` (Secondary, 6.5:1)
    *   `--signature`: `#FF2A85` (Broadcast Pink, 5.1:1 on bg)
    *   `--status-success`: `#7EE0A8` (Muted Mint, 10.9:1)
    *   `--status-warn`: `#E0B87E` (Muted Ochre, 8.3:1)
    *   `--status-danger`: `#E07E7E` (Muted Rust/Red, 5.2:1)
*   **Palette (Light - Override):**
    *   `--bg-canvas`: `#E4E4E7` (Cool silver/aluminum)
    *   `--bg-surface`: `#FFFFFF` (Paper white)
    *   `--bg-surface-alt`: `#F4F4F5`
    *   `--border`: `#D4D4D8` (Structural grid)
    *   `--text-primary`: `#09090B` (Near black, >14:1)
    *   `--text-dim`: `#52525B` (Secondary, 6.2:1)
    *   `--signature`: `#D1005A` (Deep Pink, 5.7:1 on bg)
    *   `--status-success`: `#1F6B42` (Deep Mint, 5.9:1)
    *   `--status-warn`: `#7A5214` (Deep Ochre, 7.2:1)
    *   `--status-danger`: `#A32929` (Deep Rust/Red, 6.8:1)
*   **Typography:**
    *   `--font-display`: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif` (Editorial, sharp, formal).
    *   `--font-mono`: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` (Structural, telemetry).
    *   `--font-sans`: `system-ui, -apple-system, sans-serif` (Utility).
*   **Scale & Structure:** The layout relies on `1px` gaps over the canvas color to draw absolute, unyielding grid lines. Padding is asymmetrical (large top/bottom, tight sides) to echo print design.
*   **Texture:** A static SVG fractal noise filter overlaid via `mix-blend-mode: overlay` at 20% opacity, giving the flat colors a subtle, phosphorescent grain.
*   **Motion Principle:** "Instantaneous Switch." Zero easing on color changes, immediate snap on hover, reflecting a hardware terminal switching states.

