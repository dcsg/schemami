#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
vectors="$root/conformance/schemami-v1/calculus.json"

required=(
  ambiguous-unit
  unknown-unit
  dimension-mismatch
  unsupported-quantity-kind
  invalid-decimal
  resource-limit
)

for code in "${required[@]}"; do
  count="$(jq --arg type "https://schemami.dev/problems/$code" '[.[] | select(.operation == "convert_quantity") | .expected.problems[]? | select(.type == $type)] | length' "$vectors")"
  test "$count" -gt 0
done

GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test -mod=readonly ./calculus -run TestSharedCalculusVectors
"$root/tools/with-toolchain.sh" bun test "$root/tools/viewer/conformance/schemami-calculus.test.ts"

echo "schemami conversion refusals: valid"
