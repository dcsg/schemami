#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
contract="$root/acquisition/source-to-candidate/1"

"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/acquisition-contract verify "$contract"
