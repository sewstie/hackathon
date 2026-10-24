#!/usr/bin/env bash
set -euo pipefail

MAX_LOOPS="${1:-8}"
TRACK="${TRACK:-ALL}"

for ((i=1; i<=MAX_LOOPS; i++)); do
  echo "========================================================"
  echo "🚀 Ralph Loop [Track: $TRACK] — Ticket Iteration $i/$MAX_LOOPS"
  echo "========================================================"

  OUTPUT=$(TRACK="$TRACK" ./ralph/once.sh | tee /dev/tty)

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo "✅ All tickets for Track $TRACK are DONE!"
    exit 0
  fi
done

echo "⚠️  Hit MAX_LOOPS=$MAX_LOOPS before Track $TRACK was COMPLETE. Check issues/ and rerun."
exit 1
