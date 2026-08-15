#!/usr/bin/env bash
# Install the one CI bootstrap trust anchor without invoking an installer script.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION="2026.3.17"
URL="https://github.com/jdx/mise/releases/download/v${VERSION}/mise-v${VERSION}-linux-x64"
SHA256="c9dec88fdf8bcd369a75408c546e635b301c0dffae54d7b4d1c613dc88968325"
DEST="${SCHEMAMI_CI_MISE_DIR:-$ROOT/.ci-tools}"
BIN="$DEST/mise"

mkdir -p "$DEST"
if [ -x "$BIN" ] && [ "$("$BIN" --version | awk '{print $1}')" = "$VERSION" ]; then
  printf 'MISE_BIN=%s\n' "$BIN"
  exit 0
fi

TMP="$(mktemp "${TMPDIR:-/tmp}/schemami-mise.XXXXXX")"
cleanup() { rm -f -- "$TMP"; }
trap cleanup EXIT
curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 "$URL" --output "$TMP"
printf '%s  %s\n' "$SHA256" "$TMP" | sha256sum -c - >&2
install -m 0755 "$TMP" "$BIN"
test "$("$BIN" --version | awk '{print $1}')" = "$VERSION"
printf 'MISE_BIN=%s\n' "$BIN"
