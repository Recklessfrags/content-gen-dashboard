# Slice #37 pre-req — `ChannelProfilesPanel` form-reset must not clobber unsaved edits

_Author: Architect (Claude). Status: spec frozen (read-only for the rest of this slice).
This is the **latent-bug pre-req** captured during the channel_profiles Slice B review and
recorded in `docs/SESSION-HANDOFF.md` §4.B. It must land **before** realtime/polling (#37)
is enabled on any view feeding an editor. Standalone, low-risk, behavior-preserving for all
current flows._

> Loop: Architect (this spec + commit) → Builder (Codex, app code) → independent reviewer
> (Gemini, did not build) + Architect → human ratifies/merges.

## The latent bug

`src/components/controlroom/ChannelProfilesPanel.tsx` hydrates the editable `form` from
server `profiles` in a `useEffect` keyed on `[creating, loading, profiles, selectedProfile]`
(lines ~99–112):

```ts
useEffect(() => {
  if (loading || creating) return;
  if (profiles.length === 0) { setSelectedChannel(null); setForm(null); return; }
  const nextProfile = selectedProfile ?? profiles[0];
  if (!nextProfile) return;
  setSelectedChannel(nextProfile.channel);
  setForm(profileToForm(nextProfile));   // <-- overwrites in-progress edits
}, [creating, loading, profiles, selectedProfile]);
```

Today `profiles` only changes on an explicit user save/delete/refetch, so the clobber is
invisible. **Once #37 adds background polling/realtime** (or any refetch while the operator
is mid-edit), a new `profiles` array identity re-runs this effect and **silently discards
the operator's unsaved edits** by re-hydrating `form` from the server row. This is the same
class of bug the `ControlRoom` dirty-guard exists to prevent.

## Fix goal

Make the hydrate **selected-channel-identity-driven**, not array-reference-driven: the form
should re-hydrate from the server only when the **target channel actually changes** (the
selection moved, or the previously-selected channel disappeared from `profiles`) — NOT
merely because the `profiles` array reference changed under a still-selected, being-edited
channel.

## Behavior that MUST be preserved (all current flows — verify each)

1. **Initial load:** first non-loading render with a non-empty `profiles` selects the
   persisted/`selectedProfile` or `profiles[0]` and hydrates the form. (Unchanged.)
2. **Empty profiles:** `profiles.length === 0` → `selectedChannel=null`, `form=null`.
3. **Selecting a profile** (`selectProfile`) → loads that profile's form. (Unchanged —
   this path already calls `setForm` directly; keep it.)
4. **Creating** (`startNew`) → blank form; the effect's `creating` guard still bails.
5. **Save** (`saveProfile`) → after upsert, selection + form set from the built row, then
   `onRefetch()`; the refetch must NOT clobber the just-saved/edited form.
6. **Delete** (`deleteProfile`) → selection moves to another profile (or null) and the form
   follows.
7. **Selected channel removed by a refetch** (e.g. deleted elsewhere): the selection must
   fall back to another profile / null exactly as the empty/normal paths do today.

## The only NEW behavior

While a channel is selected and being edited, a **background refetch that returns the same
selected channel must leave the in-progress `form` untouched** (no clobber). Re-hydration
happens only on an actual selected-channel change.

## Recommended implementation (Codex may refine, behavior is the contract)

Track the channel the form was last hydrated from with a ref (e.g.
`hydratedChannelRef`). In the effect, after computing `nextProfile`, **only call
`setForm(profileToForm(nextProfile))` when `nextProfile.channel !== hydratedChannelRef`**
(i.e. the target channel changed), and update the ref when you do. Keep
`setSelectedChannel(nextProfile.channel)` so selection tracking is unchanged. Ensure the
`selectProfile` / `startNew` / `saveProfile` / `deleteProfile` direct `setForm` calls also
keep `hydratedChannelRef` in sync so the effect doesn't immediately re-hydrate over them.
Preserve the `loading`/`creating`/empty guards verbatim.

Do **not** add polling in this slice — this only removes the latent clobber so polling can
be added safely later (#37). Do not introduce a full dirty-tracking system; selected-channel
keying is sufficient and minimal.

## Scope

- **IN:** `src/components/controlroom/ChannelProfilesPanel.tsx` only (+ this spec).
- **OUT:** any other file, any polling/realtime wiring, any markup/UX change, the
  `useChannelProfiles` hook.

## Gates (DONE = all green on the real artifact)

1. `npx tsc --noEmit` clean.
2. `npm test` (vitest) green.
3. `npm run build` succeeds.
4. **Reasoned parity** in build notes for all 7 preserved flows above, PLUS a written
   trace of the new no-clobber behavior: "selected channel X, edit a field, simulate a
   refetch that returns X unchanged → form retains the edit."
5. `git diff --stat` touches only `ChannelProfilesPanel.tsx` + this spec. NOT `docs/HANDOFF.md`.

## Builder instructions (Codex)

Argue with this spec first if any step is wrong (silent compliance = defect). Build only
the one declared file. You **cannot commit** — leave edits in the working tree; the
Architect reviews + commits. Do **not** edit `docs/HANDOFF.md`. Report raw gate output.
