#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
contract="$root/acquisition/source-to-candidate/1"
corpus="$root/tools/acquisition-harness/cases/adversarial/corpus.json"
results="$(mktemp -d /tmp/schemami-acquisition-adversarial.XXXXXX)"

"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-harness \
  verify-corpus "$contract" "$corpus" "$root"

while IFS=$'\t' read -r case_id candidate; do
  admission="$results/$case_id.admission.json"
  "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . admit "$root/$candidate" > "$admission"
  "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-harness \
    verify-case "$corpus" "$case_id" "$admission"
done < <("$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-harness list-cases "$corpus")

"$root/tools/acquisition-harness/check-repair.sh"
echo "acquisition-harness: 20-case adversarial corpus passed"
