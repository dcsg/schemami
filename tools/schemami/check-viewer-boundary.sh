#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

"$root/tools/with-toolchain.sh" bun test \
  "$root/tools/viewer/conformance/schemami-calculus.test.ts" \
  "$root/tools/viewer/conformance/schemami-phase9.test.ts" \
  "$root/tools/viewer/conformance/schemami-local-entities.test.ts" \
  "$root/tools/viewer/conformance/schemami-viewer.test.ts"

if rg -n 'registry/|i18n/|rcp-core|\.rcp\.' \
  "$root/tools/viewer/build.ts" \
  "$root/tools/viewer/src/schemami" --glob '*.ts'; then
  echo "active Schemami viewer depends on a legacy or hosted vocabulary surface" >&2
  exit 1
fi

echo "schemami viewer boundary: valid"
