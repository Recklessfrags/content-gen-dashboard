DIRECTION: HIGH-CONTRAST OPERATOR CONSOLE

RATIONALE
This direction delivers a strictly utilitarian, data-dense interface tailored for a high-stakes daily triage loop. Designed for a solo operator managing real-world money and brand guardrails, it abandons standard soft SaaS aesthetics in favor of a mission-control paradigm where status dictates color and structure prioritizes immediate scanability. The aesthetic builds trust through pure functional clarity, leaving no ambiguity about system states, unassigned roles, or pending financial approvals. Both the dark (native) and light (override) modes treat the interface as a physical console, utilizing tight borders and sharp typography. The primary risk is that the technical density feels overly severe, though this rigid structure actively minimizes daily decision-fatigue.

TOKENS
- Palette (Dark/Native): Base `#09090b`, Surface `#18181b`, Border `#3f3f46`, Text `#fafafa` (20.5:1 vs Base), Dim Text `#a1a1aa` (7.1:1 vs Base).
- Palette (Light): Base `#f8f8fa`, Surface `#ffffff`, Border `#d4d4d8`, Text `#09090b` (19:1 vs Base), Dim Text `#52525b` (7.4:1 vs Base).
- Semantics: Green/Active `#10b981` (Dark) / `#059669` (Light). Amber/Alert Banner uses `#f59e0b` with `#000000` text universally (10.4:1) for maximum, unambiguous urgency.
- Typography: System sans-serif for structure/labels (11px–14px), pure Monospace for all counts/financials (ui-monospace, SF Mono).
- Rhythm & Radius: Dense 8px/16px spatial grid. Sharp 2px border-radii for a tactile, hardware-like precision. No decorative shadows; depth is defined purely by border structures.
- Motion: Near-instant utility transitions (150ms border color shifts), stripped completely if `prefers-reduced-motion` is active.

