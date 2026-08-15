import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { admit, parse, protocolFloor, sha256 } from "../src/index.ts";
import { evaluate } from "../src/public-calculus.ts";

test("public Calculus requires admitted input and closes argument objects", async () => {
  expect(evaluate({ operation: "schedule", arguments: {} })).toEqual({
    operation: "schedule", status: "refused",
    problems: [{ type: "https://schemami.dev/problems/invalid-operation-arguments" }],
  });
  expect(evaluate({ operation: "convert_quantity", arguments: {} })).toMatchObject({ status: "refused" });

  const raw = readFileSync(join(import.meta.dir, "..", "testdata", "phase9-minimal.schemami.json"));
  const parsed = parse(raw); if (parsed.status !== "parsed") throw new Error("fixture parse failed");
  const admitted = await admit(parsed.parsed); if (admitted.status !== "recipe") throw new Error("fixture admission failed");
  expect(evaluate({ operation: "resolve_selection", arguments: { unexpected: true } }, admitted.recipe)).toMatchObject({ status: "refused" });
  expect(evaluate({ operation: "resolve_selection", arguments: { selections: [{ component_path: [], bindings: {}, unexpected: true }] as never } }, admitted.recipe)).toMatchObject({ status: "refused" });
  expect(evaluate({ operation: "scale", arguments: { formula_target: { formula_id: "mix", quantity: { kind: "measured", value: "1", unit: "g", density: "invented" } } as never } }, admitted.recipe)).toMatchObject({ status: "refused" });
  expect(evaluate({ operation: "resolve_selection", arguments: {} }, admitted.recipe)).toMatchObject({ status: "ok" });
});

test("public Calculus enforces recursive component and instance budgets", async () => {
  const raw = readFileSync(join(import.meta.dir, "..", "testdata", "phase9.schemami-bundle.json"));
  const parsed = parse(raw); if (parsed.status !== "parsed") throw new Error("fixture parse failed");
  const admitted = await admit(parsed.parsed); if (admitted.status !== "bundle") throw new Error("fixture admission failed");
  const budgets = { recursiveLevels: 64, semanticOccurrences: 10_000, analysisStates: 10_000, bundleDocuments: 1_024, selectedComponentInstances: 1 };
  expect(evaluate({ operation: "resolve_selection", arguments: {} }, admitted.bundle, budgets)).toMatchObject({
    status: "refused", problems: [{ type: "https://schemami.dev/problems/resource-limit" }],
  });
});

test("public Calculus aggregates semantic work per distinct component instance",async()=>{
  const bundle=JSON.parse(readFileSync(join(import.meta.dir,"..","testdata","phase9.schemami-bundle.json"),"utf8"));
  const root=bundle.documents[0].document,child=bundle.documents[1].document;
  const duplicate=structuredClone(root.components[0]);duplicate.id="child-copy";duplicate.name="Componente repetido";root.components.push(duplicate);
  root.method.sequence[0].uses.push({kind:"component",id:"child-copy"});
  root["x-budget-noise"]={nested:{objects:[{ignored:true},{ignored:true}]}};
  const rootDigest=sha256(root);bundle.documents[0].sha256=rootDigest;bundle.root.sha256=rootDigest;
  const parsed=parse(JSON.stringify(bundle));if(parsed.status!=="parsed")throw new Error("fixture parse failed");
  const admitted=await admit(parsed.parsed);if(admitted.status!=="bundle")throw new Error("fixture admission failed");
  const protocolObjects=(value:unknown):number=>{let count=0;const stack=[value];while(stack.length){const current=stack.pop();if(Array.isArray(current))stack.push(...current);else if(current!==null&&typeof current==="object"){count+=1;for(const [name,entry] of Object.entries(current))if(!name.startsWith("x-"))stack.push(entry);}}return count;};
  const required=protocolObjects(root)+2*protocolObjects(child);
  expect(evaluate({operation:"schedule",arguments:{}},admitted.bundle,{...protocolFloor,semanticOccurrences:required-1})).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
  expect(evaluate({operation:"schedule",arguments:{}},admitted.bundle,{...protocolFloor,semanticOccurrences:required})).toMatchObject({status:"ok"});
});
