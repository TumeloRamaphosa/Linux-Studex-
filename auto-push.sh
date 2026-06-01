#!/bin/bash
# Auto-commit and push script — runs every 30 min via cron
# Logs to auto-push.log

cd /Users/tumeloramaphosa/linux-studex || exit 1

# Check if there are any changes
if ! git diff --quiet HEAD 2>/dev/null; then
  git add -A
  git commit -m "auto: checkpoint $(date '+%Y-%m-%d %H:%M')" -m "Auto-commit from dev machine"
  git push origin main 2>&1 || git push origin master 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-committed and pushed" >> auto-push.log
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] No changes to commit" >> auto-push.log
fi
