#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
core="$root/schema/schemami-v1-core.schema.json"
pack="$root/schema/schemami-v1-pack.schema.json"

test -f "$core"
test -f "$pack"

grep -Fqx '  "$id": "https://schemami.dev/schema/schemami/1/core.schema.json",' "$core"
grep -Fqx '  "$id":"https://schemami.dev/schema/schemami/1/pack.schema.json",' "$pack"

if rg -n -i 'rcp|locale|profiles?|"kind"[[:space:]]*:[[:space:]]*\{"const":"profile"' "$core" "$pack"; then
  echo "schemami schema identity contains a forbidden legacy/profile term" >&2
  exit 1
fi

(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . validate testdata/basic.schemami.yaml
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . validate-pack testdata/pack.schemami-pack.yaml
)

echo "schemami schema identity: valid"
