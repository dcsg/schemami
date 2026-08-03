#!/usr/bin/env python3
"""Prose-parking heuristic (AC-PR-003-2 assist; PLAN-rcp-v02 Phase 8).
Greps description fields of the private collection for metadata classes
that now have core fields (times, difficulty, storage, source). Output is
IDENTIFIERS ONLY — file + field, never matched text (privacy pre-flight).
Skips with notice when the collection is absent. Also asserts the
hat-mapping note (DS-PR-006) is present wherever difficulty is asserted."""
import pathlib, re, sys
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[3]
COLLECTION = ROOT / "private/collection"

PATTERNS = [
    r"\bBook metadata\b", r"\bno core field\b", r"\bChapter:",
    r"\bpreparation( time)? \d+", r"\bcooking \d+", r"\bchilling \d+",
    r"\bdifficulty \d\b", r"\bstorage \d", r"\bserves? \d", r"\bServe \d+ pessoas\b",
]

def main():
    if not COLLECTION.is_dir():
        print("prose-parking: collection absent — SKIP-WITH-NOTICE (local run covers it)")
        return
    bad = []
    for p in sorted(COLLECTION.glob("*.rcp.yaml")):
        for doc in yaml.safe_load_all(p.read_text()):
            if not doc:
                continue
            for lang, txt in (doc.get("description") or {}).items():
                if any(re.search(pat, str(txt)) for pat in PATTERNS):
                    bad.append(f"{p.name}#description.{lang}")
            tax = doc.get("taxonomy") or {}
            if "difficulty" in tax:
                notes = str((doc.get("provenance") or {}).get("notes") or "")
                if "DS-PR-006" not in notes:
                    bad.append(f"{p.name}#provenance.notes (difficulty asserted, mapping record missing)")
    if bad:
        print("prose-parking: PARKED METADATA / MISSING RECORDS (identifiers only):")
        for b in bad:
            print(f"  {b}")
        sys.exit(1)
    print(f"prose-parking: clean across {len(list(COLLECTION.glob('*.rcp.yaml')))} documents")

if __name__ == "__main__":
    main()
