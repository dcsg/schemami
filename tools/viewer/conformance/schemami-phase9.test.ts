import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalizeEvaluationResult, evaluateRequest, validateReachableGraphs } from "../src/schemami/calculus.ts";
import { createSchemamiEngine } from "../src/schemami/engine.ts";
import { renderDocument } from "../src/schemami/render.ts";

const TESTDATA = join(import.meta.dir, "..", "..", "schemami", "testdata");
const load = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(TESTDATA, name), "utf8"));

describe("Schemami v1 structured Calculus", () => {
  test("shared structured envelopes have byte-identical JCS hashes", () => {
    const corpus = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "..", "conformance", "schemami-v1", "structured-calculus.json"), "utf8")) as {
      vectors: Array<{ id: string; fixture?: string; recipe?: Record<string, unknown>; operation: string; arguments: Record<string, unknown>; expected_jcs_sha256: string }>;
    };
    for (const vector of corpus.vectors) {
      const envelope = evaluateRequest(vector.operation, vector.fixture
        ? { bundle: load(vector.fixture), arguments: vector.arguments }
        : { recipe: vector.recipe!, arguments: vector.arguments });
      const digest = createHash("sha256").update(canonicalizeEvaluationResult(envelope)).digest("hex");
      expect(digest, vector.id).toBe(vector.expected_jcs_sha256);
    }
  });

  test("viewer admission accepts the structured wire and rejects a dormant broken graph", async () => {
    const schema = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "..", "schema", "schemami-v1-core.schema.json"), "utf8"));
    const engine = createSchemamiEngine(schema);
    const valid = await engine.analyze(JSON.stringify(load("phase9-structured.schemami.json")));
    expect(valid.documents[0]?.problems).toEqual([]);

    const broken = load("phase9-structured.schemami.json");
    const sequence = ((broken.method as { sequence: Array<Record<string, unknown>> }).sequence);
    const ambientStep = (sequence[1].sequence as Array<Record<string, unknown>>)[0];
    ambientStep.uses = [{ kind: "ingredient", id: "seeds" }];
    const refused = await engine.analyze(JSON.stringify(broken));
    expect(refused.documents[0]?.problems.some((problem) => problem.type.endsWith("/inactive-reference"))).toBe(true);
  });

  test("viewer renders recursive sections, actions, and plural formulas", async () => {
    const schema = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "..", "schema", "schemami-v1-core.schema.json"), "utf8"));
    const engine = createSchemamiEngine(schema); const analysis = (await engine.analyze(JSON.stringify(load("phase9-structured.schemami.json")))).documents[0]!;
    const formulas = (analysis.canonical.formulas as Array<Record<string, unknown>>).map((formula) => engine.resolveFormula(analysis.canonical, String(formula.id)));
    const html = renderDocument(analysis, { unitLabels: { g: "g", "1": "unidade" } }, formulas, undefined, engine.schedule(analysis.canonical));
    expect(html).toContain("Preparar");
    expect(html).toContain("Misture os ingredientes.");
    expect(html).toContain("Fórmulas");
    expect(html).toContain("Na véspera");
  });

  test("bundle selection returns root and child instance preorder", () => {
    const result = evaluateRequest("resolve_selection", { bundle: load("phase9.schemami-bundle.json"), arguments: {} });
    expect(result.status).toBe("ok");
    const instances = (result.result as { active_instances: Array<Record<string, unknown>> }).active_instances;
    expect(instances.map((instance) => instance.component_path)).toEqual([[], ["child"]]);
  });

  test("nested component selection is scoped by component instance path", () => {
    const bundle = load("phase9.schemami-bundle.json") as { root: Record<string, unknown>; documents: Array<{ sha256: string; document: Record<string, unknown> }> };
    const root = bundle.documents[0].document;
    const child = bundle.documents[1].document;
    child.parameters = [{ id: "mode", kind: "choice", name: "Mode", options: [{ id: "cold", name: "Cold" }, { id: "ambient", name: "Ambient" }] }];
    const childDigest = createHash("sha256").update(canonicalizeEvaluationResult(child)).digest("hex");
    bundle.documents[1].sha256 = childDigest;
    ((root.components as Array<Record<string, unknown>>)[0].recipe as Record<string, unknown>).sha256 = childDigest;
    const rootDigest = createHash("sha256").update(canonicalizeEvaluationResult(root)).digest("hex");
    bundle.documents[0].sha256 = rootDigest;
    bundle.root.sha256 = rootDigest;

    const result = evaluateRequest("resolve_selection", { bundle, arguments: { selections: [{ component_path: ["child"], bindings: { mode: "ambient" } }] } });
    expect(result.status).toBe("ok");
    const selections = (result.evaluation as { selections: Array<{ component_path: string[]; bindings: Array<Record<string, unknown>> }> }).selections;
    expect(selections.find((selection) => selection.component_path.join("/") === "child")?.bindings).toEqual([
      { parameter: "mode", value: "ambient", source: "argument" },
    ]);
  });

  test("component scaling uses exact selected child yield", () => {
    const result = evaluateRequest("scale", { bundle: load("phase9.schemami-bundle.json"), arguments: { factor: "2" } });
    expect(result.status).toBe("ok");
    const body = result.result as { component_instances: Array<{ quantities: Array<{ quantity: { value: string } }> }> };
    expect(body.component_instances[0].quantities.map((item) => item.quantity.value)).toEqual(["240", "160"]);
    expect((result.evaluation as Record<string, unknown>).bundle_sha256).toBeString();
  });

  test("component yield scaling performs exact compatible UCUM conversion", () => {
    const bundle = load("phase9.schemami-bundle.json") as { root: Record<string, unknown>; documents: Array<{ sha256: string; document: Record<string, unknown> }> };
    const root = bundle.documents[0].document;
    (root.components as Array<Record<string, unknown>>)[0].quantity = { kind: "measured", value: "0.2", unit: "kg" };
    const digest = createHash("sha256").update(canonicalizeEvaluationResult(root)).digest("hex");
    bundle.documents[0].sha256 = digest; bundle.root.sha256 = digest;
    const result = evaluateRequest("scale", { bundle, arguments: { factor: "2" } });
    expect(result.status).toBe("ok");
    const quantities = (result.result as { component_instances: Array<{ quantities: Array<{ quantity: { value: string } }> }> }).component_instances[0].quantities;
    expect(quantities.map((item) => item.quantity.value)).toEqual(["240", "160"]);
  });

  test("component scaling refuses missing bytes and a missing selected yield", () => {
    const missingBytes = load("phase9.schemami-bundle.json") as { documents: Array<Record<string, unknown>> };
    missingBytes.documents.splice(1, 1);
    const unresolved = evaluateRequest("scale", { bundle: missingBytes, arguments: { factor: "1" } });
    expect(unresolved.problems).toEqual([{ type: "https://schemami.dev/problems/unresolved-reference", pointer: "/bundle/documents" }]);

    const missingYield = load("phase9.schemami-bundle.json") as { root: Record<string, unknown>; documents: Array<{ sha256: string; document: Record<string, unknown> }> };
    const root = missingYield.documents[0].document;
    const child = missingYield.documents[1].document;
    delete ((child.outputs as Array<Record<string, unknown>>)[0]).yield;
    const childDigest = createHash("sha256").update(canonicalizeEvaluationResult(child)).digest("hex");
    missingYield.documents[1].sha256 = childDigest;
    ((root.components as Array<Record<string, unknown>>)[0].recipe as Record<string, unknown>).sha256 = childDigest;
    const rootDigest = createHash("sha256").update(canonicalizeEvaluationResult(root)).digest("hex");
    missingYield.documents[0].sha256 = rootDigest; missingYield.root.sha256 = rootDigest;
    const refused = evaluateRequest("scale", { bundle: missingYield, arguments: { factor: "1" } });
    expect(refused.problems).toEqual([{ type: "https://schemami.dev/problems/missing-fact", pointer: "/recipe/components/0/output" }]);
  });

  test("component scaling preserves sibling instances and recursively scales a nested instance", () => {
    const siblingBundle = load("phase9.schemami-bundle.json") as { root: Record<string, unknown>; documents: Array<{ sha256: string; document: Record<string, unknown> }> };
    const siblingRoot = siblingBundle.documents[0].document;
    const sibling = structuredClone((siblingRoot.components as Array<Record<string, unknown>>)[0]);
    sibling.id = "child_two"; sibling.name = "Second component"; sibling.quantity = { kind: "measured", value: "300", unit: "g" };
    (siblingRoot.components as Array<Record<string, unknown>>).push(sibling);
    const siblingRootDigest = createHash("sha256").update(canonicalizeEvaluationResult(siblingRoot)).digest("hex");
    siblingBundle.documents[0].sha256 = siblingRootDigest; siblingBundle.root.sha256 = siblingRootDigest;
    const siblingResult = evaluateRequest("scale", { bundle: siblingBundle, arguments: { factor: "1" } });
    const siblingInstances = (siblingResult.result as { component_instances: Array<{ component_path: string[]; quantities: Array<{ quantity: { value: string } }> }> }).component_instances;
    expect(siblingInstances.map((instance) => instance.component_path)).toEqual([["child"], ["child_two"]]);
    expect(siblingInstances[1].quantities.map((item) => item.quantity.value)).toEqual(["180", "120"]);

    const nestedBundle = load("phase9.schemami-bundle.json") as { root: Record<string, unknown>; documents: Array<{ sha256: string; document: Record<string, unknown> }> };
    const nestedRoot = nestedBundle.documents[0].document;
    const nestedChild = nestedBundle.documents[1].document;
    const grandchild = {
      schemami: "1", collection: "conformance", id: "z-grandchild", revision: 1, content_language: "pt-PT", title: "Grandchild",
      ingredients: [{ id: "salt", name: "Salt", quantity: { kind: "measured", value: "25", unit: "g" } }],
      outputs: [{ id: "portion", name: "Portion", yield: { kind: "measured", value: "25", unit: "g" } }],
      method: { sequence: [{ kind: "step", id: "prepare", instruction: "Prepare.", uses: [{ kind: "ingredient", id: "salt" }], produces: [{ kind: "output", id: "portion" }] }] },
    };
    const grandchildDigest = createHash("sha256").update(canonicalizeEvaluationResult(grandchild)).digest("hex");
    nestedChild.components = [{ id: "nested", name: "Nested", recipe: { collection: "conformance", id: "z-grandchild", revision: 1, sha256: grandchildDigest }, output: "portion", quantity: { kind: "measured", value: "50", unit: "g" } }];
    const childDigest = createHash("sha256").update(canonicalizeEvaluationResult(nestedChild)).digest("hex");
    nestedBundle.documents[1].sha256 = childDigest;
    ((nestedRoot.components as Array<Record<string, unknown>>)[0].recipe as Record<string, unknown>).sha256 = childDigest;
    const rootDigest = createHash("sha256").update(canonicalizeEvaluationResult(nestedRoot)).digest("hex");
    nestedBundle.documents[0].sha256 = rootDigest; nestedBundle.root.sha256 = rootDigest;
    nestedBundle.documents.push({ sha256: grandchildDigest, document: grandchild });
    const nestedResult = evaluateRequest("scale", { bundle: nestedBundle, arguments: { factor: "1" } });
    expect(nestedResult.status).toBe("ok");
    const nestedInstances = (nestedResult.result as { component_instances: Array<{ component_path: string[]; quantities: Array<{ quantity: { value: string } }> }> }).component_instances;
    expect(nestedInstances.map((instance) => instance.component_path)).toEqual([["child"], ["child", "nested"]]);
    expect(nestedInstances[1].quantities.map((item) => item.quantity.value)).toEqual(["100"]);
  });

  test("optional ratio term is filtered without redistribution", () => {
    const recipe = {
      schemami: "1", collection: "conformance", id: "optional-formula", revision: 1,
      parameters: [{ id: "include-c", kind: "toggle", default: false }],
      ingredients: [
        { id: "a" }, { id: "b" },
        { id: "c", activation: { kind: "toggle_is", parameter: "include-c", enabled: true } },
      ],
      formulas: [{
        id: "mix", kind: "ratio",
        terms: [
          { input: { kind: "ingredient", id: "a" }, parts: "1" },
          { input: { kind: "ingredient", id: "b" }, parts: "2" },
          { input: { kind: "ingredient", id: "c" }, parts: "1" },
        ],
        target: { kind: "measured", value: "400", unit: "g" },
      }],
    };
    const result = evaluateRequest("resolve_formula", { recipe, arguments: { formula_id: "mix" } });
    expect((result.result as { quantities: Array<{ quantity: { value: string } }> }).quantities.map((item) => item.quantity.value)).toEqual(["100", "200"]);
    const evaluation = (result.formula_evaluations as Array<Record<string, { value: string }>>)[0];
    expect(evaluation.authored_total.value).toBe("400");
    expect(evaluation.selected_total.value).toBe("300");
  });

  test("JCS identity matches the Go reference fixture digest", () => {
    const bundle = load("phase9.schemami-bundle.json");
    const result = evaluateRequest("scale", { bundle, arguments: { factor: "1" } });
    expect((result.evaluation as { recipe: { sha256: string } }).recipe.sha256).toBe("3f65a4b1ba432638fa2261f59e5c2aeddd2dec09f62a0bc696aeaff9c1acf073");
  });

  test("bundle composes child output before its exact parent consumer", () => {
    const bundle = load("phase9.schemami-bundle.json");
    const reading = evaluateRequest("reading_order", { bundle, arguments: {} });
    expect(reading.status).toBe("ok");
    expect((reading.result as { steps: Array<{ component_path: string[]; id: string }> }).steps).toEqual([
      { component_path: ["child"], id: "prepare" },
      { component_path: [], id: "finish" },
    ]);

    const schedule = evaluateRequest("schedule", { bundle, arguments: {} });
    expect(schedule.status).toBe("ok");
    const steps = (schedule.result as { steps: Array<{ component_path: string[]; id: string; start: string; end: string }> }).steps;
    expect(steps[0]).toMatchObject({ component_path: ["child"], id: "prepare", start: "PT0S", end: "PT5M" });
    expect(steps[1]).toMatchObject({ component_path: [], id: "finish", start: "PT5M" });
  });

  test("reachable-graph resource exhaustion has one deterministic diagnostic", () => {
    const corpus = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "..", "conformance", "schemami-v1", "validation.json"), "utf8")) as {
      vectors: Array<{ id: string; document: Record<string, unknown> }>;
    };
    const recipe = corpus.vectors.find((vector) => vector.id === "distinct-active-graphs-over-budget-refuse")!.document;
    expect(validateReachableGraphs(recipe)).toEqual([{ type: "https://schemami.dev/problems/resource-limit" }]);
  });
});
