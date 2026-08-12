# `@schemami/sdk`

Deterministic Schemami v1 Core, Recipe Calculus, and structural Diff for browser
and server TypeScript. The package performs no network calls, model execution,
registry lookup, storage, UI, or application mapping.

```ts
import { parse, admit, protocolFloor, evaluate } from "@schemami/sdk";

const parsed = parse(bytes, protocolFloor);
if (parsed.status === "parsed") {
  const admitted = await admit(parsed.parsed, protocolFloor);
  if (admitted.status === "recipe") {
    const result = evaluate(
      { operation: "schedule", arguments: {} },
      admitted.recipe,
      protocolFloor,
    );
  }
}
```

The SDK accepts strict JSON only, preserves submitted bytes, and requires an
admitted handle for recipe operations. It performs no filesystem, network,
model, registry, UI, or application-mapping work.

`ResourceBudgets.semanticOccurrences` charges the static registered protocol
tree once and that tree's protocol-object count again for each completed
deduplicated graph. `ResourceBudgets.analysisStates` separately bounds residual
graph states; both counters are aggregate for one admission request, including
the full bundle envelope and every embedded document.

Public Calculus operations charge `semanticOccurrences` once for every distinct
root/component instance entered during the request, including repeated recipe
documents at different component paths. Operations do not perform residual
graph exploration, so they do not consume `analysisStates`.

Schemami is licensed under Apache-2.0 and the package archive includes
`LICENSE`. This package remains intentionally publish-blocked until the release
gate is approved.
