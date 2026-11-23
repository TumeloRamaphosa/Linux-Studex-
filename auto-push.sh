#!/bin/bash
# Auto-commit and push — runs every 30 min via launchd/cron. Logs to auto-push.log.
#
# This repo is PUBLIC. So this script:
#   1. only stages the folders listed in PUBLISH (anything else stays on your Mac)
#   2. scans what it staged for keys, private keys, personal email addresses and
#      files over 20 MB; on any hit it unstages everything, logs why, and does NOT push
#
# To publish a new folder, add it to PUBLISH below.

cd "$(dirname "$0")" || exit 1
LOG=auto-push.log
stamp() { date '+%Y-%m-%d %H:%M:%S'; }

PUBLISH=(
  README.md OS-PLAN.md .gitignore .tmux.conf auto-push.sh
  dashboard.html hero-bg.png
  os scripts sdk server dark-factory-rig
)

# Build the commit in a scratch index started from HEAD, so your own staged work is never touched
# and nothing outside PUBLISH can be included, however it was staged.
TMPIDX=$(mktemp "${TMPDIR:-/tmp}/studex-index.XXXXXX") || exit 1
trap 'rm -f "$TMPIDX"' EXIT
export GIT_INDEX_FILE="$TMPIDX"
git read-tree HEAD || exit 1

# Stage the listed paths from the working tree, deletions included.
for p in "${PUBLISH[@]}"; do
  if [ -e "$p" ] || [ -L "$p" ] || git ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
    git add -A -- "$p" || exit 1
  fi
done

if git diff --cached --quiet; then
  echo "[$(stamp)] No changes to commit" >> "$LOG"; exit 0
fi

KEYS='(sk-[A-Za-z0-9_-]{20,}|sk-or-v1-[a-f0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[abpr]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{10,}|shpat_[a-f0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY)'
MAIL='[A-Za-z0-9._%+-]+@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail)\.[a-z.]{2,}'

hits=$(git diff --cached -U0 | grep -E '^\+' | grep -Eio "$KEYS|$MAIL" | sed -E 's/(.{8}).*/\1…/' | sort -u)
big=$(git diff --cached --name-only --diff-filter=AM | while read -r f; do
        [ -f "$f" ] && [ "$(wc -c < "$f")" -gt 20971520 ] && echo "$f"; done)

if [ -n "$hits$big" ]; then
  {
    echo "[$(stamp)] BLOCKED — nothing pushed. Remove these, then it will push next run:"
    [ -n "$hits" ] && echo "$hits" | sed 's/^/    possible key or personal email: /'
    [ -n "$big" ] && echo "$big" | sed 's/^/    file over 20 MB: /'
  } >> "$LOG"
  exit 1
fi

tree=$(git write-tree) || exit 1
commit=$(git commit-tree "$tree" -p HEAD -m "auto: checkpoint $(date '+%Y-%m-%d %H:%M')" -m "Auto-commit from dev machine") || exit 1
git update-ref -m "auto-push" HEAD "$commit" || exit 1
unset GIT_INDEX_FILE
# Your real index: only the published paths are brought up to the new commit; anything else you staged stays staged.
for p in "${PUBLISH[@]}"; do git reset -q -- "$p" 2>/dev/null || true; done

if git push -q origin HEAD 2>>"$LOG"; then
  echo "[$(stamp)] Auto-committed and pushed" >> "$LOG"
else
  echo "[$(stamp)] Commit made, push failed (see above)" >> "$LOG"
fi
