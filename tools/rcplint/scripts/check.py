#!/usr/bin/env python3
"""Stopgap validation harness (P1-P3) until the Go harness lands in P4.

Validates: (1) the core schema against the 2020-12 metaschema, (2) every
example document against the core schema, (3) that the l1 negative fixtures
are REJECTED. FormatChecker enabled (DS-VAL-002 parity). The Go harness
re-verifies everything this script asserts (plan Known Risks).
"""
import sys, json, pathlib
import yaml
from jsonschema import Draft202012Validator, FormatChecker

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "schema/rcp-core-v1.schema.json"
EXAMPLES = sorted((ROOT / "examples").glob("*.rcp.yaml"))
L1_NEG = sorted((ROOT / "tools/rcplint/testdata/l1").glob("*.rcp.yaml"))

def load_docs(path):
    return [d for d in yaml.safe_load_all(path.read_text()) if d is not None]


REG_SCHEMAS = ROOT / "registry/schemas"
REG_VALID = sorted((ROOT / "tools/rcplint/testdata/registry/valid").glob("*.yaml"))
REG_MISSING = ROOT / "tools/rcplint/testdata/registry/ingredient-missing-roles.yaml"
REG_ENTRIES = ROOT / "registry/entries"

KIND_SCHEMA = {"ingredient": "ingredient-class.schema.json",
               "primitive": "step-primitive.schema.json",
               "equipment": "equipment-profile.schema.json"}

def schema_key(doc):
    return str(doc.get("id", "")).split(".", 1)[0]

def registry_checks(failures):
    import glob as _g
    validators = {}
    for kind, fname in KIND_SCHEMA.items():
        s = json.loads((REG_SCHEMAS / fname).read_text())
        Draft202012Validator.check_schema(s)
        validators[kind] = Draft202012Validator(s, format_checker=FormatChecker())
        print(f"OK metaschema: registry/{fname}")
    for path in REG_VALID:
        doc = yaml.safe_load(path.read_text())
        errs = list(validators[schema_key(doc)].iter_errors(doc))
        if errs:
            failures.append(f"registry valid sample {path.name}: {errs[0].message[:100]}")
        else:
            print(f"OK registry sample: {path.name}")
    doc = yaml.safe_load(REG_MISSING.read_text())
    errs = list(validators[schema_key(doc)].iter_errors(doc))
    if errs and "roles" in errs[0].message:
        print(f"OK rejected naming roles: {REG_MISSING.name}")
    else:
        failures.append(f"{REG_MISSING.name}: expected rejection naming roles, got {'pass' if not errs else errs[0].message[:80]}")
    # seed entries (P3+): every file validates; filename == id
    if REG_ENTRIES.exists():
        n = 0
        for path in sorted(REG_ENTRIES.rglob("*.yaml")):
            doc = yaml.safe_load(path.read_text())
            n += 1
            if path.stem != doc.get("id"):
                failures.append(f"entry {path}: filename != id ({doc.get('id')})")
            errs = list(validators[schema_key(doc)].iter_errors(doc))
            if errs:
                failures.append(f"entry {path.name}: {errs[0].json_path}: {errs[0].message[:100]}")
        print(f"registry entries validated: {n}")

def main():
    failures = []
    schema = json.loads(SCHEMA.read_text())
    Draft202012Validator.check_schema(schema)
    print(f"OK metaschema: {SCHEMA.name}")
    v = Draft202012Validator(schema, format_checker=FormatChecker())

    n = 0
    for path in EXAMPLES:
        for doc in load_docs(path):
            n += 1
            errs = sorted(v.iter_errors(doc), key=lambda e: str(e.path))
            if errs:
                failures.append(f"{path.name}#{doc.get('id','?')}: {errs[0].json_path}: {errs[0].message[:120]}")
            else:
                print(f"OK example: {path.name}#{doc.get('id','?')}")
    print(f"examples validated: {n} documents")

    registry_checks(failures)

    for path in L1_NEG:
        for doc in load_docs(path):
            errs = list(v.iter_errors(doc))
            if errs:
                print(f"OK rejected (as required): {path.name}")
            else:
                failures.append(f"{path.name}: NEGATIVE FIXTURE PASSED — hardening missing")

    if failures:
        print("\nFAILURES:")
        [print(f"  {f}") for f in failures]
        sys.exit(1)
    print("\nALL CHECKS GREEN")

if __name__ == "__main__":
    main()
