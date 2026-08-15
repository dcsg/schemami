#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 3 ] || [ "$#" -gt 5 ]; then
  echo "usage: run.sh <candidate.schemami.json> <acquisition-report.json> <result-directory> [attempt] [max-attempts]" >&2
  exit 2
fi

root="$(cd "$(dirname "$0")/../.." && pwd)"
candidate="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
report="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
mkdir -p "$3"
result_directory="$(cd "$3" && pwd)"
attempt="${4:-1}"
maximum="${5:-3}"
contract="$root/acquisition/source-to-candidate/1"

admission="$result_directory/admission-result.json"
repair="$result_directory/repair-request.json"
review="$result_directory/review.html"

"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . admit "$candidate" > "$admission"
"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-harness render "$admission" "$report" "$review"

if grep -q '"status":"refused"' "$admission"; then
  "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-harness prepare-repair "$contract" "$candidate" "$admission" "$attempt" "$maximum" "$repair"
  echo "acquisition-harness: refused; review $review and repair request $repair"
else
  echo "acquisition-harness: admitted; review $review"
fi
