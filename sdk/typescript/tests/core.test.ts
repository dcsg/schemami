import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AdmittedBundle, AdmittedRecipe, ParsedDocument, admit, canonicalJSON, parse, protocolFloor } from "../src/index.ts";
import { createAnalysisBudgetState, validateReachableGraphs } from "../src/calculus.ts";

const resource = (...parts:string[]) => join(import.meta.dir,"..","resources",...parts);
const fixture = (name:string) => readFileSync(join(import.meta.dir,"..","testdata",name));

test("strict parser rejects duplicate members",()=>{
  const result=parse('{"schemami":"1","schemami":"1"}',protocolFloor);
  expect(result).toEqual({status:"refused",problems:[{type:"https://schemami.dev/problems/invalid-json"}]});
});

test("strict parser bounds raw JSON nesting",()=>{
  expect(parse(`{"x":${"[".repeat(257)}0${"]".repeat(257)}}`).status).toBe("refused");
});

test("strict parser rejects lossy I-JSON numbers before identity",()=>{
  for(const input of ['{"x":1e400}','{"x":1e-400}','{"x":9007199254740993}']) expect(parse(input).status,input).toBe("refused");
  expect(parse('{"x":100000000000000000000}').status).toBe("parsed");
});

test("retained JSON preserves hostile object member names",async()=>{
  const input='{"schemami":"1","collection":"test","id":"proto","revision":1,"content_language":"pt-PT","title":"Proto","ingredients":[],"method":{"sequence":[]},"x-meta":{"__proto__":{"polluted":true},"constructor":"authored"}}';
  const parsed=parse(input);expect(parsed.status).toBe("parsed");if(parsed.status!=="parsed")return;
  const extension=parsed.parsed.value["x-meta"] as Record<string,unknown>;
  expect(Object.hasOwn(extension,"__proto__")).toBe(true);expect(extension.__proto__).toEqual({polluted:true});
  const admitted=await admit(parsed.parsed);expect(admitted.status).toBe("recipe");if(admitted.status!=="recipe")return;
  expect(new TextDecoder().decode(admitted.recipe.canonicalJSON)).toContain('"__proto__"');
});

test("admission handles cannot be forged by JavaScript consumers",()=>{
  expect(()=>new (ParsedDocument as unknown as new (...args:unknown[])=>ParsedDocument)(new Uint8Array(),{},Symbol())).toThrow();
  const parsed=parse(fixture("phase9-minimal.schemami.json"));if(parsed.status!=="parsed")throw new Error("parse");
  expect(()=>new (AdmittedRecipe as unknown as new (...args:unknown[])=>AdmittedRecipe)(parsed.parsed,Symbol())).toThrow();
});

test("duck-typed and prototype-fabricated handles are not admitted",async()=>{
  const valid=JSON.parse(fixture("phase9-minimal.schemami.json").toString("utf8"));
  const counterfeit={value:valid,submittedJSON:new TextEncoder().encode("{}")};
  expect(await admit(counterfeit as never)).toMatchObject({status:"refused"});
  const fake=Object.create(AdmittedRecipe.prototype) as Record<string,unknown>;
  Object.defineProperty(fake,"value",{value:valid,enumerable:true});
  const {evaluate}=await import("../src/public-calculus.ts");
  expect(evaluate({operation:"resolve_selection",arguments:{}},fake as never)).toMatchObject({status:"refused"});
  expect(evaluate({operation:"resolve_selection",arguments:{}},new Proxy(fake,{}) as never)).toMatchObject({status:"refused"});
  expect(await AdmittedRecipe.admit(counterfeit as never,protocolFloor)).toMatchObject({status:"refused"});
  expect(await AdmittedBundle.admit(counterfeit as never,protocolFloor)).toMatchObject({status:"refused"});
});

test("opaque extensions do not consume or supply protocol semantics",async()=>{
  const base=JSON.parse(fixture("phase9-minimal.schemami.json").toString("utf8"));
  base["x-adversary"]={kind:"measured",value:"1",unit:"not-a-protocol-unit",nested:{a:{b:{c:true}}}};
  const parsed=parse(JSON.stringify(base));if(parsed.status!=="parsed")throw new Error("parse");
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:3})).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:4})).toMatchObject({status:"recipe"});
});

test("nested activation extensions do not supply graph thresholds",async()=>{
  const base=JSON.parse(fixture("phase3-selection.schemami.json").toString("utf8"));
  base.ingredients[3].activation["x-adversary"]={kind:"measurement_compare",parameter:"ambient-temperature",operator:"greater_than",measurement:{kind:"measured",value:"5",unit:"not-a-protocol-unit"}};
  const parsed=parse(JSON.stringify(base));if(parsed.status!=="parsed")throw new Error("parse");
  expect(await admit(parsed.parsed)).toMatchObject({status:"recipe"});
});

test("canonical identity rejects non-I-JSON programmer input",()=>{
  expect(()=>canonicalJSON(Number.POSITIVE_INFINITY as never)).toThrow();
});

test("admission retains submitted bytes and canonical identity",async()=>{
  const bytes=fixture("phase9-minimal.schemami.json");const parsed=parse(bytes,protocolFloor);expect(parsed.status).toBe("parsed");if(parsed.status!=="parsed")return;
  const result=await admit(parsed.parsed,protocolFloor);expect(result.status).toBe("recipe");if(result.status!=="recipe")return;
  expect(Buffer.from(result.recipe.submittedJSON).equals(bytes)).toBe(true);expect(result.recipe.sha256).toHaveLength(64);expect(result.recipe.canonicalJSON.length).toBeGreaterThan(0);
});

test("recipe admission applies caller resource budgets",async()=>{
  const parsed=parse(fixture("phase9-minimal.schemami.json"));if(parsed.status!=="parsed")throw new Error("parse");
  const result=await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:1});
  expect(result).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
});

test("analysis-state budget is independent from completed graph occurrences",async()=>{
  type BudgetVector={id:string;generator:{kind:string;width:number;parameter_order:string;activation:string};expected:{static_semantic_occurrences:number;distinct_reachable_graphs:number;total_semantic_occurrences:number;analysis_states:number;default_analysis_states:number;below_exact_analysis_states:number;exact_analysis_states:number}};
  const corpus=JSON.parse(readFileSync(resource("conformance","resource-budgets.json"),"utf8")) as {suite:string;version:number;vectors:BudgetVector[]};
  const vector=corpus.vectors[0];if(!vector)throw new Error("missing resource-budget vector");
  expect(corpus).toMatchObject({suite:"schemami-v1-resource-budgets",version:1});
  expect(vector.generator).toMatchObject({kind:"toggle-vector-equality",parameter_order:"all-left-then-all-right",activation:"all-pairwise-equality"});
  const width=vector.generator.width,{expected}=vector;
  const left=Array.from({length:width},(_,index)=>`left-${index}`),right=Array.from({length:width},(_,index)=>`right-${index}`);
  const leaf=(parameter:string,enabled:boolean)=>({kind:"toggle_is",parameter,enabled});
  const equality=(a:string,b:string)=>({kind:"any",conditions:[
    {kind:"all",conditions:[leaf(a,true),leaf(b,true)]},
    {kind:"all",conditions:[leaf(a,false),leaf(b,false)]},
  ]});
  const value={
    schemami:"1",collection:"test",id:vector.id,revision:1,content_language:"en-GB",title:"Vector equality",
    parameters:[...left,...right].map((id)=>({id,kind:"toggle",name:id})),
    ingredients:[{id:"equal",name:"Equal",activation:{kind:"all",conditions:left.map((id,index)=>equality(id,right[index]))}}],
    method:{sequence:[]},
  };
  const parsed=parse(JSON.stringify(value));if(parsed.status!=="parsed")throw new Error("parse");
  expect(expected.total_semantic_occurrences).toBe(expected.static_semantic_occurrences*(expected.distinct_reachable_graphs+1));
  expect(protocolFloor.analysisStates).toBe(expected.default_analysis_states);
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:expected.total_semantic_occurrences,analysisStates:expected.default_analysis_states})).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:expected.total_semantic_occurrences,analysisStates:expected.below_exact_analysis_states})).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:expected.total_semantic_occurrences-1,analysisStates:expected.exact_analysis_states})).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:expected.total_semantic_occurrences,analysisStates:expected.exact_analysis_states})).toMatchObject({status:"recipe"});
  const budgetState={...createAnalysisBudgetState(),semanticOccurrences:expected.static_semantic_occurrences};
  expect(validateReachableGraphs(value,{semanticOccurrences:expected.total_semantic_occurrences,analysisStates:expected.exact_analysis_states},budgetState,expected.static_semantic_occurrences)).toEqual([]);
  expect(budgetState).toEqual({semanticOccurrences:expected.total_semantic_occurrences,analysisStates:expected.analysis_states});
});

test("resource diagnostics match the shared corpus",async()=>{
  type Diagnostic={id:string;fixture:string;budgets:{recursive_levels:number;semantic_occurrences:number;analysis_states:number;bundle_documents:number;selected_component_instances:number};expected_problems:Array<{type:string;pointer:string}>};
  const corpus=JSON.parse(readFileSync(resource("conformance","resource-budgets.json"),"utf8")) as {diagnostic_vectors:Diagnostic[]};
  for(const vector of corpus.diagnostic_vectors){
    const parsed=parse(fixture(vector.fixture));expect(parsed.status,vector.id).toBe("parsed");if(parsed.status!=="parsed")continue;
    const b=vector.budgets;
    const admitted=await admit(parsed.parsed,{recursiveLevels:b.recursive_levels,semanticOccurrences:b.semantic_occurrences,analysisStates:b.analysis_states,bundleDocuments:b.bundle_documents,selectedComponentInstances:b.selected_component_instances});
    expect(admitted,vector.id).toMatchObject({status:"refused",problems:vector.expected_problems});
    if(admitted.status==="refused")expect(admitted.problems,vector.id).toEqual(vector.expected_problems);
  }
});

test("shared validation corpus has exact verdict parity",async()=>{
  const corpus=JSON.parse(readFileSync(resource("conformance","validation.json"),"utf8")) as {vectors:Array<{id:string;expected_valid:boolean;document:Record<string,unknown>}>};
  for(const vector of corpus.vectors){const parsed=parse(JSON.stringify(vector.document));expect(parsed.status,vector.id).toBe("parsed");if(parsed.status!=="parsed")continue;const admitted=await admit(parsed.parsed);expect(admitted.status!=="refused",vector.id).toBe(vector.expected_valid);}
});

test("bundle admission verifies embedded bytes and closure",async()=>{
  const parsed=parse(fixture("phase9.schemami-bundle.json"));expect(parsed.status).toBe("parsed");if(parsed.status!=="parsed")return;const admitted=await admit(parsed.parsed);expect(admitted.status).toBe("bundle");
  const constrained=await admit(parsed.parsed,{...protocolFloor,bundleDocuments:1});expect(constrained.status).toBe("refused");
  const aggregate=await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:20});expect(aggregate).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit",pointer:"/documents"}]});
  const analysisAggregate=await admit(parsed.parsed,{...protocolFloor,analysisStates:1});expect(analysisAggregate).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit",pointer:"/documents/1/document"}]});
  const bundle=JSON.parse(fixture("phase9.schemami-bundle.json").toString("utf8"));
  const count=(value:unknown):number=>{let total=0;const stack=[value];while(stack.length){const current=stack.pop();if(Array.isArray(current))stack.push(...current);else if(current!==null&&typeof current==="object"){total+=1;for(const [name,entry] of Object.entries(current))if(!name.startsWith("x-"))stack.push(entry);}}return total;};
  const required=count(bundle)+bundle.documents.reduce((total:number,entry:{document:unknown})=>total+count(entry.document),0);
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:required-1})).toMatchObject({status:"refused",problems:[{type:"https://schemami.dev/problems/resource-limit"}]});
  expect(await admit(parsed.parsed,{...protocolFloor,semanticOccurrences:required})).toMatchObject({status:"bundle"});
});

test("RFC 8785 canonical bytes and digests match every shared vector",async()=>{
  const corpus=JSON.parse(readFileSync(resource("conformance","canonicalization.json"),"utf8")) as {vectors:Array<{id:string;fixture:string;expected_canonical:string;expected_sha256:string}>};
  for(const vector of corpus.vectors){const bytes=readFileSync(resource("conformance",vector.fixture));const parsed=parse(bytes);expect(parsed.status,vector.id).toBe("parsed");if(parsed.status!=="parsed")continue;const admitted=await admit(parsed.parsed);expect(admitted.status,vector.id).toBe("recipe");if(admitted.status!=="recipe")continue;expect(new TextDecoder().decode(admitted.recipe.canonicalJSON),vector.id).toBe(vector.expected_canonical);expect(admitted.recipe.sha256,vector.id).toBe(vector.expected_sha256);}
});

describe("retained values",()=>{test("are defensive copies",()=>{const parsed=parse(fixture("phase9-minimal.schemami.json"));if(parsed.status!=="parsed")throw new Error("parse");const first=parsed.parsed.value;first.title="changed";expect(parsed.parsed.value.title).not.toBe("changed");});});
