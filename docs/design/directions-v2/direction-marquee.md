DIRECTION: MARQUEE

RATIONALE
This direction rejects the standard "SaaS dashboard" aesthetic in favor of a high-contrast, editorial command center. By utilizing oversized, tightly-kerned typography as the primary structural element, the interface feels authoritative, confident, and inherently designed—like a digital broadsheet or a high-end magazine. It fits a money/brand control tool because the strict bento-box grid and mono-spaced data convey uncompromising precision and algorithmic truth, while the bold red accent establishes clear urgency for approvals. The biggest risk is that the massive typography might feel visually overwhelming to a user accustomed to quiet, low-density software, but it successfully trades blandness for a powerful, unforgettable daily rhythm.

TOKENS
Dark Mode (Native):
--bg: #090909 (Deep Space, AA text >18:1)
--surface: #141414 (Card bg)
--surface-hover: #1F1F1F
--border: #333333 (Visible grid lines)
--text: #F5F5F0 (Primary, AA bg >15:1)
--text-dim: #888888 (Secondary, AA bg >4.5:1)
--accent: #FF2A00 (Broadcast Red)
--accent-fg: #FFFFFF (AA accent >4.5:1)
--success: #00E65C
--warn: #FFB800

Light Mode:
--bg: #F4F4F0 (Newsprint Off-White, AA text >16:1)
--surface: #FFFFFF (Card bg)
--surface-hover: #EBEBE6
--border: #C8C8C0 (Visible grid lines)
--text: #111111 (Primary, AA bg >16:1)
--text-dim: #666666 (Secondary, AA bg >4.5:1)
--accent: #E61900 (Broadcast Red)
--accent-fg: #FFFFFF (AA accent >4.5:1)
--success: #00A33F
--warn: #CC8F00

Typography:
--font-display: ui-serif, "Georgia", "Times New Roman", serif; (Editorial, massive scale)
--font-sans: system-ui, -apple-system, sans-serif; (Tight, bold card titles)
--font-mono: ui-monospace, "SFMono-Regular", "Menlo", monospace; (Raw data clarity)
Scale: Display (4rem-8rem), Titles (1.25rem-1.5rem), Data (0.75rem-1rem).

Spacing/Structure:
Bento grid utilizing 2px solid borders for raw structural clarity. Generous padding (1.5rem-2rem) inside editorial blocks, tight micro-spacing inside data blocks.
Radius: 0px. Strict right angles emphasize the uncompromising, print-like layout.
Elevation: 0. Depth is achieved via bold grid lines and high-contrast color blocking, not shadows.
Motion Principle: Snappy, zero-easing instant state changes. Unapologetically digital.

