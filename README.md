# Character Control Room

A web dashboard to run a multi-character faceless-video operation: build and edit
character "field manuals" (bibles), switch between characters, capture ideas the
moment they hit, and surface finished episodes the content pipeline produces.

Built from the `character-control-room.jsx` prototype — same layout, design tokens,
and interaction model, with the in-memory `useState` seeds swapped for Supabase
reads/writes behind row-level security.

## Stack

- **Next.js** (App Router) on **Vercel** — front end + auth gating.
- **Supabase** (Postgres + Auth + RLS) — data and authentication.
- `@supabase/ssr` for cookie-based sessions across server/client.

## Data model

| table        | what it holds                                                        |
| ------------ | ------------------------------------------------------------------- |
| `characters` | `codename`, `concept`, `status`, and a `bible` **jsonb** of sections |
| `ideas`      | quick-capture wire items, tagged to a character + channel + status   |
| `episodes`   | pipeline output (read-only here): `topic`, `status`, `gated_by`, `receipt` |

`bible` is jsonb on purpose — new sections (catchphrase bank, voice-sample URL,
do/don't gallery) are new keys, **no migration required**.

### Auth & RLS

Auth model is **"me now, scoped others later"**: every row carries an `owner`
column defaulting to `auth.uid()`, and RLS restricts every read/write to the
owner. Adding a scoped VA/editor later is a policy change, not a migration.

RLS is enabled on **every** table — nothing is readable or writable
unauthenticated. The schema lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon/publishable key
npm run dev
```

Then open http://localhost:3000 and sign in.

### Environment variables

| var                             | value                                            |
| ------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | your project URL (`https://<ref>.supabase.co`)   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key (safe — RLS protects) |

The service-role key is **never** used by this app; RLS is the security boundary.
No secrets are committed — `.env*` is gitignored.

## Deploy

Deploys cleanly on Vercel from a fresh clone. Set the two environment variables
above in the Vercel project, then deploy. Apply
`supabase/migrations/0001_init.sql` to the target Supabase project first.

## Scope (v1)

- **Characters** — list, switch, create, edit, persist; full bible editor.
- **The Wire** — quick-capture ideas (one field + Enter), tag to character +
  channel, cycle status.
- **Runs** — read-only list of `episodes` for the active character.

Deferred: run/receipt drill-down, bible version history, multi-user teams,
analytics, publishing controls.
