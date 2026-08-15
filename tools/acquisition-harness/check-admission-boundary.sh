#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
test_directory="$(mktemp -d /tmp/schemami-acquisition-admission.XXXXXX)"
trap 'rm -r "$test_directory"' EXIT

candidate="$root/acquisition/source-to-candidate/1/examples/candidate.schemami.json"
report="$root/acquisition/source-to-candidate/1/examples/acquisition-report.json"
refused_candidate="$root/tools/acquisition-harness/cases/phase2-refused/candidate.schemami.json"

"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . admit "$candidate" > "$test_directory/before.json"
"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-harness render "$test_directory/before.json" "$report" "$test_directory/review.html"
"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . admit "$candidate" > "$test_directory/after.json"
cmp "$test_directory/before.json" "$test_directory/after.json"
grep -q '"status":"ok"' "$test_directory/before.json"
grep -q '"canonical_sha256":"[a-f0-9]\{64\}"' "$test_directory/before.json"

"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . admit "$refused_candidate" > "$test_directory/refused.json"
grep -q '"status":"refused"' "$test_directory/refused.json"
if grep -q '"canonical_sha256"' "$test_directory/refused.json"; then
  echo "refused admission claimed canonical identity" >&2
  exit 1
fi

echo "acquisition-harness: admission boundary passed"
