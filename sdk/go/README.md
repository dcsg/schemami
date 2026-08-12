# Schemami Go SDK

Deterministic Schemami v1 parsing, admission, canonical identity, Recipe
Calculus, and structural Diff for Go applications.

```go
parsed := schemami.Parse(raw, schemami.ProtocolFloor)
if !parsed.OK() { /* display parsed.Problems */ }

admitted := schemami.Admit(parsed.Parsed, schemami.ProtocolFloor)
if !admitted.OK() { /* display admitted.Problems */ }

result := schemami.Evaluate(
    schemami.OperationRequest{Operation: "schedule", Arguments: map[string]any{}},
    schemami.OperationInput{Recipe: admitted.Recipe},
    schemami.ProtocolFloor,
)
```

The core accepts strict JSON only and performs no filesystem, network, model,
registry, UI, or application-mapping work. YAML and file handling belong in an
adapter or CLI. Expected document and operation failures are returned as stable
problems; admitted handles retain exact submitted bytes and canonical JCS
identity.

`ResourceBudgets.SemanticOccurrences` counts protocol objects during static
admission and completed deduplicated active graphs. `AnalysisStates` is a
separate deterministic ceiling for internal graph-search states; bundle
admission shares both counters across every embedded document.
Each Calculus request also charges the protocol object surface once per
distinct root/component instance path, sharing one counter across nested and
repeated internal traversal passes.

Schemami is licensed under Apache-2.0; the package-local `LICENSE` is included
for module archives. This module remains a release candidate. Publication and a
stable version tag still require the repository release gate.
