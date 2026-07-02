# Slice — Channels view: mobile channel selector + create (bugfix)

_Author: Architect (Claude). Status: frozen (operator-reported 2026-07-02: "I see no
area for channel creation" — verified root cause: `.roster{display:none}` at ≤880px
(`globals.css` mobile block) hides the Channels view's channel list AND its
"+ New channel" button, with **no mobile equivalent** — the character Roster view got
`mobile-roster` (ControlRoom.tsx:1139); `ChannelProfilesPanel` never did. On mobile,
channels can neither be created nor switched._

## What ships

`ChannelProfilesPanel` renders a **mobile channel bar** mirroring the existing
character `mobile-roster` pattern exactly (same classnames — `.mobile-roster`,
`.mobile-roster-select`, `.mobile-roster-new` — so the existing ≤880px CSS applies
with zero new rules):

- a labeled `<select>` of profiles (`display_name`, value = `channel`), reflecting
  and driving the current selection (`selectProfile`);
- a **"+ New"** button calling the existing `startNew`;
- rendered above the dossier, visible only where the desktop roster is hidden (the
  existing CSS already handles show/hide — desktop ≥881px keeps the aside untouched);
- while `creating`, the select shows a "(new channel)" placeholder state and is
  disabled (selection change would discard the draft — same guard the desktop list
  gets from the `creating` flag), and the New button is disabled;
- the empty-profiles state keeps its existing full-width create button (already
  works on mobile).

## Non-goals
No redesign, no CSS additions beyond what the shared classes provide, no behavior
change on desktop, no data-layer change.

## Gates
| # | Gate | How verified |
| --- | --- | --- |
| M-1 | At 412px, Channels view shows the selector + "+ New"; selecting switches profiles; "+ New" opens the blank form; save creates a row (form flow unchanged). | Ratify walk at 412px (create intercepted-and-aborted OR created-then-deleted via the panel's own delete — channel_profiles is operator config, cleanup verified). |
| M-2 | Desktop (1440px) unchanged: aside list + addbtn as before, no duplicate controls visible. | Ratify walk. |
| M-3 | While creating, the mobile select is disabled (draft can't be clobbered by a switch). | Walk assertion. |
| M-4 | `tsc`/tests/build clean; 412px no overflow. | Local + walk. |
