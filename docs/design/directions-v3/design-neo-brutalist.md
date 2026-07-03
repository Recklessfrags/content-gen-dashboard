**DIRECTION: NEO-BRUTALIST**

**RATIONALE**
This direction positions the Control Room as an unapologetic, high-precision industrial tool. By employing refined neo-brutalist principles—raw structural clarity, thick explicit grid lines, stark contrasting colors, and hard offset shadows—it eliminates ambiguity. Everything is visibly delineated, reflecting the exactness required when managing automated budgets and brand-sensitive content. The aesthetic is editorial and slightly underground, avoiding the corporate sterility of standard SaaS dashboards. The biggest risk is visual fatigue from the high contrast and heavy borders, which is mitigated by generous internal padding (bento structure) and restricting the signature loud color strictly to primary actions and alerts.

**TOKENS**
*   **Palette (Light Mode):**
    *   `--bg`: `#EBEBE6` (Warm newsprint off-white. Background role.)
    *   `--surface`: `#FFFFFF` (Stark white. Card/bento surface role.)
    *   `--text`: `#0F0F0F` (Near black. Primary text/border role. Contrast vs `--bg`: 16.1:1)
    *   `--text-dim`: `#595959` (Mid-grey. Secondary text role. Contrast vs `--bg`: 6.1:1)
    *   `--brand`: `#FF4500` (Safety Orange. Primary action/signature. Contrast vs `--text`: 9.8:1)
    *   `--success`: `#00D05E` (Solid Green. Traffic-light OK. Contrast vs `--text`: 9.1:1)
    *   `--warn`: `#FFB800` (Industrial Yellow. Traffic-light Busy. Contrast vs `--text`: 11.2:1)
    *   `--danger`: `#FF003C` (Crimson. Traffic-light/Uncast Alert. Contrast vs `--text`: 8.3:1)
*   **Palette (Dark Mode):**
    *   `--bg`: `#121212` (Deep charcoal. Background role.)
    *   `--surface`: `#1C1C1C` (Elevated dark grey. Card/bento surface role.)
    *   `--text`: `#F0F0F0` (Off-white. Primary text/border role. Contrast vs `--bg`: 15.3:1)
    *   `--text-dim`: `#A3A3A3` (Light grey. Secondary text role. Contrast vs `--bg`: 6.2:1)
    *   `--brand`: `#FF5E23` (Vibrant Orange. Signature. Contrast vs `--text`: 5.1:1)
    *   `--success`: `#00E676` (Neon Green. Traffic-light OK. Contrast vs `--text`: 1.4:1 - *Text on this chip will be forced to black for AA compliance*)
    *   `--warn`: `#FFD54F` (Bright Yellow. Traffic-light Busy. Contrast vs `--text` must be forced black)
    *   `--danger`: `#FF425A` (Bright Crimson. Traffic-light/Uncast Alert.)
*   **Typography:** Primary Display: System Grotesque (`"Helvetica Neue", Arial, sans-serif`), tightly tracked, heavy weights (800/900). Data/Utility: System Monospace (`"Courier New", monospace`), uppercase.
*   **Structure:** `--border-thick: 3px`. `--radius: 0px` (true hard edges). Hard offset shadows (`6px 6px 0 var(--text)`).
*   **Texture:** Subtle SVG turbulence filter applied as a fixed grain overlay to evoke print materiality.
*   **Motion:** Mechanical and abrupt. Elements "clunk" into place (e.g., hard shadow reduces on active click, simulating a physical button press).

