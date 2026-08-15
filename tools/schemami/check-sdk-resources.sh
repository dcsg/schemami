#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

cmp "$root/schema/schemami-v1-core.schema.json" "$root/sdk/go/resources/schema/schemami-v1-core.schema.json"
cmp "$root/schema/schemami-v1-bundle.schema.json" "$root/sdk/go/resources/schema/schemami-v1-bundle.schema.json"
cmp "$root/schema/schemami-v1-core.schema.json" "$root/sdk/typescript/resources/schema/schemami-v1-core.schema.json"
cmp "$root/schema/schemami-v1-bundle.schema.json" "$root/sdk/typescript/resources/schema/schemami-v1-bundle.schema.json"

for name in calculus.json structured-calculus.json validation.json canonicalization.json diff.json resource-budgets.json; do
  cmp "$root/conformance/schemami-v1/$name" "$root/sdk/go/resources/conformance/$name"
  cmp "$root/conformance/schemami-v1/$name" "$root/sdk/typescript/resources/conformance/$name"
done

for fixture in "$root"/conformance/schemami-v1/canonicalization/*.schemami.json; do
  name="$(basename "$fixture")"
  cmp "$fixture" "$root/sdk/go/resources/conformance/canonicalization/$name"
  cmp "$fixture" "$root/sdk/typescript/resources/conformance/canonicalization/$name"
done

cmp "$root/sdk/go/resources/manifest.json" "$root/sdk/typescript/resources/manifest.json"
for source in \
  schema/schemami-v1-core.schema.json \
  schema/schemami-v1-bundle.schema.json \
  conformance/schemami-v1/calculus.json \
  conformance/schemami-v1/structured-calculus.json \
  conformance/schemami-v1/validation.json \
  conformance/schemami-v1/canonicalization.json \
  conformance/schemami-v1/diff.json \
  conformance/schemami-v1/resource-budgets.json \
  conformance/schemami-v1/canonicalization/member-order-a.schemami.json \
  conformance/schemami-v1/canonicalization/member-order-b.schemami.json \
  conformance/schemami-v1/canonicalization/number-boundaries.schemami.json \
  conformance/schemami-v1/canonicalization/string-escapes.schemami.json \
  conformance/schemami-v1/canonicalization/utf16-order.schemami.json
do
  digest="$(shasum -a 256 "$root/$source" | awk '{print $1}')"
  grep -Fq "\"source\":\"$source\"" "$root/sdk/go/resources/manifest.json"
  grep -Fq "\"sha256\":\"$digest\"" "$root/sdk/go/resources/manifest.json"
done

echo "Schemami Go and TypeScript SDK resources and manifests match repository authorities."
