#!/usr/bin/env bash
# AC-12.2 — the clean-clone proof.
#
# Clones the repo to a temp dir and runs the full gate set there, to
# prove the corpus and harness stand up without any local state.
#
# WHAT GREEN MEANS HERE, stated because it is LESS than a local run:
# private/collection/ is git-ignored and therefore absent from a clone,
# so every private-corpus check degrades to SKIP-WITH-NOTICE —
# i18n-coverage.py, gap-ledger.py, prose-parking.py and
# corpus-provenance-check.py all cover the published corpus only. A
# green clean clone proves the PUBLISHED surface is self-contained; it
# does not re-prove the private-boundary checks, which only a local run
# can exercise.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DEST="${1:-$(mktemp -d)}/rcp-clean-clone"

echo "── clean-clone proof ──"
rm -rf "$DEST"
git clone -q "file://$ROOT" "$DEST" || { echo "FAIL: clone"; exit 1; }
cd "$DEST" || exit 1

if [ -d private ]; then
  echo "FAIL: private/ reached the clone — it must be git-ignored"
  exit 1
fi
echo "  ✓ private/ absent (git-ignored, as required)"
echo "  ⚠ NOTICE: private-corpus checks degrade to SKIP here — a clean"
echo "    clone covers LESS than a local run, by design."

mise trust -q >/dev/null 2>&1
mise install -q >/dev/null 2>&1

fail=0
run() { printf "  %-28s" "$1"; shift; if "$@" >/dev/null 2>&1; then echo "GREEN"; else echo "FAILED"; fail=1; fi; }
run "make validate" make validate
run "make conformance" make conformance
run "make calculus" make calculus
run "make accept" make accept
run "go test ./..." sh -c "cd tools/rcplint && go test -count=1 ./..."

# Regeneration must be byte-stable: a clone that rewrites its own
# artifacts is not reproducible.
if [ -n "$(git status --porcelain)" ]; then
  echo "  ✗ worktree dirty after the run — regeneration is not byte-stable:"
  git status --porcelain | sed 's/^/      /'
  fail=1
else
  echo "  ✓ worktree clean after the run (regeneration byte-stable)"
fi

[ $fail -eq 0 ] && echo "CLEAN-CLONE PROOF: GREEN (published surface only)" || echo "CLEAN-CLONE PROOF: FAILED"
exit $fail
