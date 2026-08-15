#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
artifact="$root/tools/viewer/dist/index.html"
generated="$root/tools/viewer/src/schemami/generated.ts"
test -f "$artifact" && test -f "$generated"

if [ "${1:-}" = "--build" ]; then
  before="$(shasum -a 256 "$artifact" "$generated")"
  "$root/tools/with-toolchain.sh" bun run "$root/tools/viewer/build.ts" >/dev/null
  after="$(shasum -a 256 "$artifact" "$generated")"
  test "$before" = "$after" || {
    echo "dist freshness: generated viewer artifacts were stale" >&2
    exit 1
  }
fi

echo "dist freshness: Schemami viewer artifacts are byte-stable"
