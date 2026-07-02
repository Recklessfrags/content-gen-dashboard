DIRECTION: Terminal Noir v2

RATIONALE:
This direction leans hard into a "strange-broadcast HQ" aesthetic—treating the interface less like a standard SaaS dashboard and more like a live, machine-readable editorial ledger. By stripping away all soft rounded corners and relying exclusively on a 1px exposed hairline grid, the UI gains raw structural clarity. Typography is strictly bipartite: highly technical, tracked-out Monospace handles all functional data and numerics, while massive, elegant Italic Serif is reserved purely for the "shows" (the channels) and executive actions, creating extreme editorial contrast. This authoritative, print-like layout perfectly suits a tool where a founder is approving real money and brand-sensitive content. The biggest risk is that the brutalist rigidity of the hairline grid requires highly disciplined content lengths to maintain its exactness without awkward line-breaks.

TOKENS:
- Canvas/Grid Lines: #1C1C1F (Dark) / #A1A1AA (Light)
- Surface/Panels: #0A0A0B (Dark) / #FAFAFA (Light)
- Inverse Panel: #F4F4F5 (Dark) / #0A0A0B (Light)
- Signature (Brand): #FF2A85 (Dark, 6.5:1 AA) / #E6005C (Light, 5.1:1 AA)
- Status Success: #6EE7B7 (Dark, 11.2:1 AA) / #059669 (Light, 4.9:1 AA)
- Status Warn: #FCD34D (Dark, 12.1:1 AA) / #C26A00 (Light, 5.1:1 AA)
- Status Danger: #FCA5A5 (Dark, 9.4:1 AA) / #DC2626 (Light, 5.2:1 AA)
- Typography: Display (`ui-serif, Georgia, Times...`) vs Mono (`ui-monospace, SFMono-Regular...`). No Sans.
- Spacing: Structural 1px grid gap universally defines hierarchy. 
- Radius/Elevation: 0px radius universally (except avatars/status dots). Depth is achieved via stark color inversion and stark 4px hard-shadows on primary actions.
- Texture: Fixed SVG `<feTurbulence>` grain overlay (mix-blend-mode).
- Motion: Snappy, rigid transforms (no easing blurs), mimicking mechanical switches.

