#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

go_version="$("$root/tools/with-toolchain.sh" go version)"
bun_version="$("$root/tools/with-toolchain.sh" bun --version)"
case "$go_version" in
  *"go1.26.1"*) ;;
  *) echo "toolchain: expected Go 1.26.1, got $go_version" >&2; exit 1 ;;
esac
test "$bun_version" = "1.3.14" || {
  echo "toolchain: expected Bun 1.3.14, got $bun_version" >&2
  exit 1
}
"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" mod verify
"$root/tools/with-toolchain.sh" bun install --cwd "$root/tools/viewer" --frozen-lockfile >/dev/null

echo "schemami toolchain: Go 1.26.1, Bun 1.3.14, locks verified"
