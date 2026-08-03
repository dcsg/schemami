#!/usr/bin/env python3
"""AC-9.3 — the named ledger/roadmap verification (PLAN-rcp-v03 Phase 9).

Asserts the four v0.3 features are shipped with realized_by tracing to
PRD-003 FRs, FEAT-TOOL-001 carries the v0.3 phasing note, and the
roadmap records v0.3 as SHIPPED. Exit 0 = ledger truthful."""

import sys

import yaml

EXPECTED = {
    "FEAT-CALC-001": {"FR-CALC-001", "FR-CALC-002"},
    "FEAT-CALC-002": {"FR-CALC-003", "FR-TOOL-003"},
    "FEAT-CORE-003": {"FR-PR-004"},
    "FEAT-TOOL-002": {"FR-TOOL-002"},
}


def main() -> int:
    data = yaml.safe_load(open("docs/product/features.yaml", encoding="utf-8"))
    by_id = {f["id"]: f for f in data["features"]}
    failures = []
    for fid, frs in EXPECTED.items():
        f = by_id.get(fid)
        if f is None:
            failures.append(f"{fid}: missing from ledger")
            continue
        if f.get("status") != "shipped":
            failures.append(f"{fid}: status is {f.get('status')!r}, not shipped")
        if set(f.get("realized_by") or []) != frs:
            failures.append(f"{fid}: realized_by {f.get('realized_by')} != {sorted(frs)}")
    tool001 = by_id.get("FEAT-TOOL-001", {})
    if "v0.3 SHIPPED THE COMPUTE HALF" not in str(tool001.get("phasing", "")):
        failures.append("FEAT-TOOL-001: v0.3 phasing note missing")
    roadmap = open("docs/product/ROADMAP.md", encoding="utf-8").read()
    if "## v0.3 — SHIPPED" not in roadmap:
        failures.append("ROADMAP.md: no v0.3 SHIPPED section")
    for msg in failures:
        print(f"LEDGER FAIL: {msg}", file=sys.stderr)
    if not failures:
        print("ledger truthful: 4 features shipped with realized_by; TOOL-001 phased; roadmap v0.3 SHIPPED")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
