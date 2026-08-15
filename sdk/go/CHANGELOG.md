# Changelog

## 1.0.0 — 2026-08-15

- Added strict JSON parsing and immutable admitted recipe/bundle handles.
- Added RFC 8785 identity, all six Schemami v1 Calculus operations, and Diff.
- Added protocol-floor resource budgets and adversarial denial-of-service guards.
- Separated request-scoped analysis states from normative semantic occurrences
  and aggregated both counters across bundle admission.
- Enforced semantic-occurrence budgets across distinct component instances in
  every public Calculus request without double-charging repeated passes.
- Removed CLI, filesystem, and YAML concerns from the reusable module.
- Licensed the SDK under Apache-2.0 and included package-local license text.
