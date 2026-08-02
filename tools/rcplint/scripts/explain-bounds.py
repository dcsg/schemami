#!/usr/bin/env python3
"""On cue vet failure, print the violating checks WITH their authored
reasons (DS-VAL-003: the reason travels in the facts, sourced from the
profile schema's x-rcp-bounds — cue names the bound, this names the why)."""
import json, sys

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
