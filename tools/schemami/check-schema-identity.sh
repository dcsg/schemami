#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
core="$root/schema/schemami-v1-core.schema.json"
bundle="$root/schema/schemami-v1-bundle.schema.json"

test -f "$core"
test -f "$bundle"

grep -Fqx '  "$id": "https://schemami.dev/schema/schemami/1/core.schema.json",' "$core"
grep -Fqx '  "$id": "https://schemami.dev/schema/schemami/1/bundle.schema.json",' "$bundle"

if grep -Eni 'rcp|locale|profiles?|"kind"[[:space:]]*:[[:space:]]*\{"const":"profile"' "$core" "$bundle"; then
  echo "schemami schema identity contains a forbidden legacy/profile term" >&2
  exit 1
fi

(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . validate testdata/basic.schemami.yaml
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . validate-bundle testdata/phase9.schemami-bundle.json
)

echo "schemami schema identity: valid"
