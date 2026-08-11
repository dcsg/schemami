import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFactor } from "../src/schemami/app.ts";
import { createSchemamiEngine } from "../src/schemami/engine.ts";
import { renderAnalysis, renderDocument } from "../src/schemami/render.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

const schema = JSON.parse(
  readFileSync(join(REPO_ROOT, "schema", "schemami-v1-core.schema.json"), "utf8"),
);
const engine = createSchemamiEngine(schema);
const context = { unitLabels: { g: "g", mL: "mL", "[cup_us]": "chávena US" } };
const validationCorpus = JSON.parse(readFileSync(
  join(REPO_ROOT, "conformance", "schemami-v1", "validation.json"),
  "utf8",
)) as {
  vectors: Array<{
    id: string;
    expected_valid: boolean;
    expected_techniques?: string[];
    expected_diagnostic?: { pointer: string; message: string };
    document: Record<string, unknown>;
  }>;
};

const source = (name: string) => readFileSync(
  join(REPO_ROOT, "tools", "schemami", "testdata", name),
  "utf8",
);

test("shared Schemami v1 validation vectors", async () => {
  for (const vector of validationCorpus.vectors) {
    const result = await engine.analyze(JSON.stringify(vector.document));
    const analysis = result.documents[0]!;
    expect(analysis.valid, vector.id).toBe(vector.expected_valid);
    if (vector.expected_diagnostic) {
      expect(analysis.problems, vector.id).toEqual([{
        type: "https://schemami.dev/problems/invalid-document",
        pointer: vector.expected_diagnostic.pointer,
        message: vector.expected_diagnostic.message,
      }]);
    }
    if (vector.expected_techniques) {
      const steps = analysis.canonical.steps as Array<{ techniques?: string[] }>;
      expect(steps[0]?.techniques, vector.id).toEqual(vector.expected_techniques);
    }
  }
});

test("viewer admits and renders the Schemami example without evidence prose", async () => {
  const result = await engine.analyze(readFileSync(
    join(REPO_ROOT, "examples", "pao-massa-mae.schemami.yaml"),
    "utf8",
  ));
  expect(result.parse.ok).toBe(true);
  expect(result.documents).toHaveLength(1);
  const analysis = result.documents[0]!;
  expect(analysis.valid).toBe(true);
  const formula = engine.resolveFormula(analysis.canonical.formula as never);
  const schedule = engine.schedule(analysis.canonical);
  const html = renderDocument(analysis, context, formula, undefined, schedule);
  expect(html).toContain("Pão de massa-mãe");
  expect(html).toContain("100 g");
  expect(html).toContain("500 g");
  expect(html).toContain("375 g");
  expect(html).toContain("Ativa, no pico de fermentação.");
  expect(html).toContain("PT8M");
  expect(html).toContain("Mafra");
  expect(html).toContain("técnica Mistura");
  expect(html).toContain("pao-massa-mae.mp4#t=300,600");
  expect(html).not.toContain("500 g de farinha");
  expect(html).not.toContain("confidence");
});

test("viewer scales through exact Calculus without rewriting the document", async () => {
  const result = await engine.analyze(readFileSync(
    join(REPO_ROOT, "examples", "pao-massa-mae.schemami.yaml"),
    "utf8",
  ));
  const analysis = result.documents[0]!;
  const before = JSON.stringify(analysis.canonical);
  const scaled = engine.scale(analysis.canonical, "2");
  const html = renderDocument(
    analysis,
    context,
    engine.resolveFormula(analysis.canonical.formula as never),
    scaled,
  );
  expect(html).toContain("200 g");
  expect(html).toContain("1000 g");
  expect(html).toContain("750 g");
  expect(JSON.stringify(analysis.canonical)).toBe(before);
});

test("unknown local concepts validate and render from their own names", async () => {
  const result = await engine.analyze(source("local-entities.schemami.yaml"));
  expect(result.documents[0]!.valid).toBe(true);
  const html = renderDocument(result.documents[0]!, context);
  expect(html).toContain("Mistura secreta da casa");
  expect(html).toContain("Dobra da casa");
  expect(html).toContain("Panela experimental X");
});

test("origin, ordered techniques, and a W3C video selector validate together", async () => {
  const document = {
    schemami: "1", collection: "test", id: "video", revision: 1,
    content_language: "pt-PT", title: "Vídeo",
    origin: { country: "PT", subdivision: "PT-11", locality: "Mafra" },
    ingredients: [{ id: "flour", name: "Farinha" }],
    techniques: [{ id: "mixing", name: "Mistura" }, { id: "kneading", name: "Amassadura" }],
    steps: [{ id: "work", instruction: "Misture e amasse.", techniques: ["mixing", "kneading"] }],
    sources: [{ id: "video", uri: "https://example.org/bread.mp4", media_type: "video/mp4" }],
    evidence: [{
      id: "kneading-clip", source: "video", pointer: "/steps/0/techniques/1",
      selector: { kind: "fragment", value: "t=300,600", conforms_to: "https://www.w3.org/TR/media-frags/" },
    }],
  };
  const result = await engine.analyze(JSON.stringify(document));
  expect(result.documents[0]!.problems).toEqual([]);
  expect(result.documents[0]!.canonical.steps).toEqual(document.steps);
});

test("dogfood-invalid wire and semantic shapes refuse in the TypeScript reader", async () => {
  const base = () => ({
    schemami: "1", collection: "test", id: "invalid", revision: 1,
    content_language: "pt-PT", title: "Inválida",
    ingredients: [{ id: "flour", name: "Farinha" }],
    steps: [{ id: "work", instruction: "Trabalhe." }],
  });
  const cases: Array<{ name: string; document: Record<string, unknown> }> = [
    { name: "recursive open guide", document: { ...base(), ingredients: [{ id: "flour", name: "Farinha", quantity: { kind: "open", qualifier: "as_needed", guide: { kind: "open", qualifier: "to_taste" } } }] } },
    { name: "empty source URI", document: { ...base(), sources: [{ id: "source", uri: "" }] } },
    { name: "singular technique", document: { ...base(), techniques: [{ id: "mixing", name: "Mistura" }], steps: [{ id: "work", instruction: "Misture.", technique: "mixing" }] } },
    { name: "inverted duration", document: { ...base(), steps: [{ id: "work", instruction: "Espere.", duration: { minimum: "PT2H", target: "PT1H", maximum: "PT30M" } }] } },
    { name: "non-100 basis", document: { ...base(), formula: { kind: "percentage", basis: "flour", terms: [{ ingredient: "flour", percentage: "80" }] } } },
    { name: "wrong-country subdivision", document: { ...base(), origin: { country: "PT", subdivision: "ES-MD" } } },
    { name: "inverted video selector", document: { ...base(), sources: [{ id: "video", uri: "video.mp4" }], evidence: [{ id: "clip", source: "video", pointer: "/steps/0", selector: { kind: "fragment", value: "t=600,300", conforms_to: "https://www.w3.org/TR/media-frags/" } }] } },
  ];
  for (const testCase of cases) {
    const result = await engine.analyze(JSON.stringify(testCase.document));
    expect(result.documents[0]!.valid, testCase.name).toBe(false);
  }
});

test("range, open, ratio, and integrator unit labels render explicitly", async () => {
  const text = `schemami: "1"
collection: test
id: quantities
revision: 1
content_language: pt-PT
title: Quantidades
ingredients:
  - { id: flour, name: Farinha }
  - { id: water, name: Água }
  - { id: salt, name: Sal, quantity: { kind: range, minimum: "8", maximum: "10", unit: g } }
  - { id: oil, name: Azeite, quantity: { kind: open, qualifier: as_needed } }
formula:
  kind: ratio
  terms:
    - { ingredient: flour, parts: "1" }
    - { ingredient: water, parts: "2" }
  target: { kind: measured, value: "3", unit: "[cup_us]" }
steps: []
`;
  const result = await engine.analyze(text);
  expect(result.documents[0]!.valid).toBe(true);
  const html = renderDocument(
    result.documents[0]!,
    context,
    engine.resolveFormula(result.documents[0]!.canonical.formula as never),
  );
  expect(html).toContain("1:2");
  expect(html).toContain("1 chávena US");
  expect(html).toContain("2 chávena US");
  expect(html).toContain("8–10 g");
  expect(html).toContain("quanto baste");
});

test("legacy RCP input is refused without fallback", async () => {
  const result = await engine.analyze("rcp: 1\nid: old\n");
  expect(result.parse.ok).toBe(true);
  expect(result.documents[0]!.valid).toBe(false);
  expect(result.documents[0]!.problems).toEqual([{
    type: "https://schemami.dev/problems/unsupported-legacy",
    pointer: "",
    message: "RCP input is not supported by Schemami v1.",
  }]);
  expect(renderAnalysis(result)).toContain("unsupported-legacy");
});

test("untrusted source prose is escaped", async () => {
  const result = await engine.analyze(`schemami: "1"
collection: test
id: unsafe
revision: 1
content_language: pt-PT
title: "<img src=x onerror=alert(1)>"
ingredients: [{ id: x, name: "</li><script>alert(1)</script>" }]
steps: []
`);
  const html = renderDocument(result.documents[0]!, context);
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).toContain("&lt;/li&gt;&lt;script&gt;");
  expect(html).not.toContain("<script>alert");
});

test("presentation factor input normalizes to the canonical decimal contract", () => {
  expect(parseFactor("1,5")).toBe("1.5");
  expect(parseFactor("0.5000")).toBe("0.5");
  expect(parseFactor("0")).toBeNull();
  expect(parseFactor("1.00001")).toBeNull();
});

test("active Schemami viewer has no registry, locale map, or evidence dependency", () => {
  const files = ["engine.ts", "render.ts", "app.ts", "main.ts", "source-view.ts"];
  const active = files.map((file) => readFileSync(
    join(REPO_ROOT, "tools", "viewer", "src", "schemami", file),
    "utf8",
  )).join("\n");
  expect(active).not.toMatch(/registry\/|EMBEDDED_NAMES|locale map/i);
  expect(readFileSync(join(REPO_ROOT, "tools", "viewer", "build.ts"), "utf8")).not.toMatch(/registry\/|i18n\//);
});
