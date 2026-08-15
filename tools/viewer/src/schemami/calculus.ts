// Compatibility facade for existing viewer imports. Normative Calculus lives
// in the public @schemami/sdk package.
// The viewer runtime uses the admitted-document API from @schemami/sdk.
// This source-only facade exists solely for the legacy primitive Calculus
// conformance vectors, which deliberately test the package's internal engine.
export * from "../../../../sdk/typescript/src/calculus.ts";
