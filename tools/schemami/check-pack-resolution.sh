#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test -mod=readonly . -run 'TestValidatePack|TestVerifyPack'
GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . verify-pack \
  "$root/tools/schemami/testdata/pack.schemami-pack.yaml" \
  "$root/tools/schemami/testdata"

# Standards and schema identifiers are URIs, but their presence does not imply
# network access. Reject concrete Go networking APIs instead of every URI
# literal so offline validation can still recognize normative identifiers.
if rg -n '"net/http"|http\.(Get|Post|PostForm|Head|Do|NewRequest|NewRequestWithContext)|net\.(Dial|DialTimeout|Dialer)|tls\.Dial|websocket\.Dial' \
  "$root/tools/schemami" --glob '*.go' --glob '!**/*_test.go'; then
  echo "offline pack resolver contains a network path" >&2
  exit 1
fi

echo "schemami offline pack resolution: valid"
