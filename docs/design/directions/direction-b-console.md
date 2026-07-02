DIRECTION: CLEAN MODERN CONTROL-ROOM

RATIONALE:
This direction establishes a "quiet confidence" suited for a solo operator managing a real business, avoiding generic SAAS playfulness in favor of a dense, rigorous, and calm utility. It is designed for someone who triages workflows and reviews spend daily; the lack of visual noise ensures that actual alerts (the Action Center) and financial figures immediately draw the eye. It evokes high-end financial or operational software. The biggest risk of this direction is that it may feel slightly too clinical or developer-centric for a media-generation product, though the typography and spacing soften the rigidity. 

TOKENS:
- Palette (Native Dark): `--bg-base` (#0f1115), `--bg-surface` (#1a1d24), `--text-primary` (#eceff4, 11:1 against base), `--text-secondary` (#9ca3af, 5.6:1 against surface), `--accent-primary` (#3b82f6), `--status-warn-bg` (#422006), `--status-warn-text` (#fde047, 6.8:1 against warn-bg).
- Palette (Light): `--bg-base` (#f8fafc), `--bg-surface` (#ffffff), `--text-primary` (#0f172a, 14:1 against base), `--text-secondary` (#64748b, 5.2:1 against surface), `--accent-primary` (#2563eb), `--status-warn-bg` (#fef3c7), `--status-warn-text` (#92400e, 7.5:1 against warn-bg).
- Type: System sans-serif (`system-ui, -apple-system, sans-serif`), scale strictly hierarchical (12px, 14px, 16px, 20px).
- Rhythm & Radius: 4px/8px/16px/24px spacing scale. Sharp, purposeful 6px border radii. Flat elevations relying on crisp 1px borders rather than heavy shadows.
- Motion: Snappy, functional opacity/border-color transitions (0.15s ease-out), fully disabled via `prefers-reduced-motion`.

