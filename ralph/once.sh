#!/usr/bin/env bash
set -euo pipefail

TRACK="${TRACK:-ALL}"
AGENT="${AGENT:-kiro}"

ISSUES=$(head -n 200 issues/*.md 2>/dev/null || echo "No issues found")
COMMITS=$(git log -n 5 --oneline 2>/dev/null || echo "No commits yet")
PROMPT=$(sed "s/__TRACK__/$TRACK/g" ralph/prompt.md)

FULL_PROMPT="### Recent Git Commits
$COMMITS

### Current Issues in issues/
$ISSUES

### Instructions
$PROMPT"

# Headless runs cannot answer permission prompts, so the agent must be allowed
# to run npm/git (tests, build, commit) without asking.
if [ "$AGENT" = "claude" ]; then
  claude -p "$FULL_PROMPT" \
    --permission-mode acceptEdits \
    --allowedTools "Bash(npm *)" "Bash(npx *)" "Bash(node *)" "Bash(git *)" "Bash(ls *)" "Bash(mkdir *)"
elif [ "$AGENT" = "kiro" ]; then
  kiro-cli chat --no-interactive --trust-all-tools "$FULL_PROMPT"
elif [ "$AGENT" = "codex" ]; then
  codex exec --full-auto "$FULL_PROMPT"
else
  echo "Unsupported AGENT '$AGENT'. Choose claude, kiro, or codex." >&2
  exit 1
fi
