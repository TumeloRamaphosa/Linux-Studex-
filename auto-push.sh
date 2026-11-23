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

# Anything staged by hand outside the list is unstaged first, so only PUBLISH paths can ever go out.
allowed() { local f="$1" p; for p in "${PUBLISH[@]}"; do [[ "$f" == "$p" || "$f" == "$p"/* ]] && return 0; done; return 1; }
git diff --cached --name-only | while read -r f; do allowed "$f" || git reset -q -- "$f"; done

# Stage the listed paths, deletions included.
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
  git reset -q
  {
    echo "[$(stamp)] BLOCKED — nothing pushed. Remove these, then it will push next run:"
    [ -n "$hits" ] && echo "$hits" | sed 's/^/    possible key or personal email: /'
    [ -n "$big" ] && echo "$big" | sed 's/^/    file over 20 MB: /'
  } >> "$LOG"
  exit 1
fi

git commit -q -m "auto: checkpoint $(date '+%Y-%m-%d %H:%M')" -m "Auto-commit from dev machine"
if git push -q origin HEAD 2>>"$LOG"; then
  echo "[$(stamp)] Auto-committed and pushed" >> "$LOG"
else
  echo "[$(stamp)] Commit made, push failed (see above)" >> "$LOG"
fi
