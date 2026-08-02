#!/usr/bin/env bash
# CMP-REG-003 self-checks (pre-flight finding #7). Modes: slugs | refs.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MODE="${1:-slugs}"
case "$MODE" in
  slugs)
    BAD=0
    # every ref-context token must carry its kind prefix
    grep -En 'item: [a-z]' "$ROOT"/examples/*.rcp.yaml | grep -v 'item: ingredient\.' && BAD=1
    grep -En 'primitive: \{ id: [a-z]' "$ROOT"/examples/*.rcp.yaml | grep -v 'id: primitive\.' && BAD=1
    grep -En 'action: [a-z]' "$ROOT"/examples/*.rcp.yaml | grep -v 'action: primitive\.' && BAD=1
    grep -En 'equipment: \[' "$ROOT"/examples/*.rcp.yaml | grep -vE 'equipment: \[(equipment\.[a-z0-9.-]+(, )?)+\]' && BAD=1
    [ $BAD -eq 0 ] && echo "SLUG SCAN OK: zero bare registry refs" || { echo "SLUG SCAN FAILED"; exit 1; }
    ;;
  refs)
    python3 "$ROOT/tools/rcplint/scripts/check.py" >/dev/null && echo "REF SET-MATCH OK (census cross-check clean)" || { echo "REF SET-MATCH FAILED"; exit 1; }
    ;;
  *) echo "usage: migration-check.sh slugs|refs"; exit 2;;
esac
