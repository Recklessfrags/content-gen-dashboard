#!/usr/bin/env bash
# Install the durability hook. Run once at the start of every session.
#
# WHY THIS EXISTS
# ---------------
# On 2026-08-16 a session committed a full day of work, reported it as safe, and lost
# it. The commits were real; they lived only in that container on an unpushed branch.
# A fresh session cloned the branch three hours stale and correctly reported the work
# as nonexistent.
#
# That session had, earlier the same day, written a rule: "nothing lives only in the
# scratchpad." It then violated that rule one level up — committed-but-unpushed is
# exactly as ephemeral as a scratchpad file. The rule did not fail because it was
# forgotten mid-session; it failed because a close-out discipline cannot protect a
# session that never reaches its close-out.
#
# So this is a hook and not a paragraph. Durability should not depend on anyone
# remembering to be careful at the end.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hook="$repo_root/.git/hooks/post-commit"

cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
# post-commit: push this branch to origin so a commit is never container-local.
# Never fails the commit — a push problem must not look like a commit problem.

# Don't fire mid-rebase/merge/cherry-pick: those make many commits in a row and the
# intermediate states are not worth publishing.
git_dir="$(git rev-parse --git-dir)"
for marker in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD BISECT_LOG; do
    [ -e "$git_dir/$marker" ] && exit 0
done

branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" = "HEAD" ] && exit 0          # detached; nothing meaningful to push

# Never auto-push the default branch — merging to main stays a deliberate act.
case "$branch" in
    main|master) exit 0 ;;
esac

for delay in 0 2 4 8; do
    [ "$delay" -gt 0 ] && sleep "$delay"
    if git push --quiet -u origin "$branch" 2>/dev/null; then
        echo "post-commit: pushed $branch -> origin"
        exit 0
    fi
done

# Loud, because silence here is exactly how a day of work goes missing.
echo "post-commit: ✗ PUSH FAILED for $branch — this commit is CONTAINER-LOCAL ONLY." >&2
echo "post-commit:   Work is NOT durable. Resolve before reporting anything as saved." >&2
echo "post-commit:   Try: git fetch origin $branch && git rebase origin/$branch && git push -u origin $branch" >&2
exit 0
HOOK

chmod +x "$hook"
echo "installed: $hook"

# Report the current durability gap immediately — the useful moment to learn you are
# 11 commits ahead of origin is now, not at handoff.
#
# ALWAYS fetch first. The remote-tracking ref `origin/<branch>` goes stale the moment
# anyone else pushes, and a durability check that reads a stale ref is worse than no
# check: it reports a gap that does not exist, or — the dangerous direction — reports
# agreement when the branch has moved on beneath you.
branch="$(git rev-parse --abbrev-ref HEAD)"

if ! git fetch --quiet origin "$branch" 2>/dev/null; then
    echo "WARNING: could not reach origin — durability of '$branch' is UNVERIFIED."
    exit 0
fi

if git rev-parse --verify --quiet FETCH_HEAD >/dev/null; then
    ahead="$(git rev-list --count FETCH_HEAD..HEAD)"
    behind="$(git rev-list --count HEAD..FETCH_HEAD)"
    if [ "$ahead" -gt 0 ]; then
        echo "WARNING: $ahead commit(s) on $branch are NOT on origin — container-local only. Push now."
    elif [ "$behind" -gt 0 ]; then
        echo "durability: $branch is safe on origin, but $behind commit(s) behind — pull before working."
    else
        echo "durability: $branch matches origin ($(git rev-parse --short HEAD))."
    fi
else
    echo "WARNING: origin has no branch '$branch' — every commit here is container-local."
fi
