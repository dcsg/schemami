#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

GOCACHE=/tmp/schemami-acquisition-repair-go-cache \
  "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test ./cmd/acquisition-harness \
  -run TestRepairBudgetStaleDigestsReplacementAndEscapedRender -count=1

echo "acquisition-harness: repair boundary passed"
