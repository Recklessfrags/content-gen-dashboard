# Ratify Harness

Run visual QA against a production build only:

```sh
RATIFY_EMAIL=you@example.com RATIFY_PASSWORD='...' npm run ratify
```

Prereqs: `.env.local` must contain `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; never commit credentials or screenshots.

By default the harness uses `RATIFY_PORT=3100`, writes screenshots to `ratify-out/`, and expects at
least one roster `.pcard` (`RATIFY_MIN_PCARDS=1`).

Set `RATIFY_BASE=https://...` to test an already-running server; otherwise it starts `next start`
from an existing `.next` build, building first only when `.next` is missing.

The browser's `*.supabase.co` requests are routed through Node `fetch`, forwarding headers including
the JWT so Supabase RLS still applies in this sandbox.

Before starting, the script frees and re-checks the dedicated port to avoid testing a stale server.

The server runs in its own process group and is torn down from `finally`, exit, signal, and uncaught
exception handlers.

Exit is non-zero for login failure, horizontal overflow, or an empty/under-minimum roster; otherwise
the command exits 0 and prints a JSON summary.
