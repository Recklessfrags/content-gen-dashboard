# ROLLBACK — reversible changes on `claude/optimize-claude-usage-zfsxof`

Each entry is one commit; revert independently with `git revert <sha>`.

## 2026-07-07 — SESSION-HANDOFF rotation (token cleanup)

**What changed.** `docs/SESSION-HANDOFF.md` was rotated to a fast-path snapshot: the
current snapshot (⚡ LATEST) + the evergreen reference manual (§0–§6) stayed; the 12 prior
dated session entries (2026-07-02 … 2026-07-06) moved **verbatim** into
`docs/handoff-archive/SESSION-HANDOFF-archive-2026H1.md`. Nothing summarized or deleted
(governance rule 34). Live handoff: ~37.6K → ~7.2K tokens read per session; the archive
holds the full history and `docs/HANDOFF.md` is unchanged.

**Zero content loss — proven at build:** the three slices (kept-top + archived-middle +
kept-bottom) reconstruct byte-identical to the pre-change file (`diff` IDENTICAL).

**Revert (pick one):**
```bash
# a) undo the whole change:
git revert <sha>

# b) restore the old single file by hand:
git show <sha>~1:docs/SESSION-HANDOFF.md > docs/SESSION-HANDOFF.md
git rm docs/handoff-archive/SESSION-HANDOFF-archive-2026H1.md
```

**Nothing to activate.** This is an on-demand read (not auto-loaded); the smaller file takes
effect the next time a session reads it from this branch. No hook, no settings, no migration.
