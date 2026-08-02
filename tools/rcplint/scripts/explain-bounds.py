#!/usr/bin/env python3
"""On cue vet failure, print the violating checks WITH their authored
reasons (DS-VAL-003: the reason travels in the facts, sourced from the
profile schema's x-rcp-bounds — cue names the bound, this names the why)."""
import json, sys

if sys.argv[1] == "--advisories":
    # DS-PROF-002: warn-severity findings inform, never gate. Exit 0 always.
    facts = json.load(open(sys.argv[2]))
    hits = [c for c in facts.get("advisories", [])
            if not (c.get("min", float("-inf")) <= c["value"] <= c.get("max", float("inf")))]
    for c in hits:
        print(f"  ADVISORY {c['doc']}: {c['bound']} = {c['value']:g}"
              f" (suggested {c.get('min'):g}..{c.get('max'):g})")
        for lang in ("pt", "en"):
            if c.get(f"reason_{lang}"):
                print(f"    {lang}: {c[f'reason_{lang}']}")
    sys.exit(0)

facts = json.load(open(sys.argv[1]))
print("\nBOUND VIOLATIONS (authored reasons):")
for c in facts.get("checks", []):
    lo, hi = c.get("min", float("-inf")), c.get("max", float("inf"))
    if not (lo <= c["value"] <= hi):
        print(f"  {c['doc']}: {c['bound']} = {c['value']:g}"
              f" (allowed {lo:g}..{hi:g}, severity {c.get('severity','?')})")
        for lang in ("pt", "en"):
            r = c.get(f"reason_{lang}")
            if r:
                print(f"    {lang}: {r}")
