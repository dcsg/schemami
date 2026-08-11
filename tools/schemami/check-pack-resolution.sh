#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test -mod=readonly . -run 'TestValidatePack|TestVerifyPack'
GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . verify-pack \
  "$root/tools/schemami/testdata/pack.schemami-pack.yaml" \
  "$root/tools/schemami/testdata"

if rg -n 'net/http|http\.Get|https?://' "$root/tools/schemami" --glob '*.go' --glob '!**/*_test.go' | rg -v 'problemBase|schema/schemami|schemami\.dev'; then
  echo "offline pack resolver contains a network path" >&2
  exit 1
fi

echo "schemami offline pack resolution: valid"
