import { canonicalJSON as canonicalize, canonicalSHA256, createAnalysisBudgetState } from "./calculus.ts";
import { createSchemamiEngine, type ViewerProblem } from "./engine.ts";
import { Validator } from "@cfworker/json-schema";
import { EMBEDDED_BUNDLE_SCHEMA, EMBEDDED_SCHEMA } from "./generated.ts";

export type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };
export type JSONObject = { [key: string]: JSONValue };
export type Problem = { type: string; pointer?: string; details?: JSONValue };

export type ResourceBudgets = {
  recursiveLevels: number;
  semanticOccurrences: number;
  analysisStates: number;
  bundleDocuments: number;
  selectedComponentInstances: number;
};

export const protocolFloor: Readonly<ResourceBudgets> = Object.freeze({
  recursiveLevels: 64,
  semanticOccurrences: 10_000,
  analysisStates: 10_000,
  bundleDocuments: 1_024,
  selectedComponentInstances: 1_024,
});

const PROBLEM_BASE = "https://schemami.dev/problems/";
const constructionToken = Symbol("schemami-admission");
const parsedHandles = new WeakSet<object>();
const admittedRecipeHandles = new WeakSet<object>();
const admittedBundleHandles = new WeakSet<object>();

export class ParsedDocument {
  readonly #submitted: Uint8Array;
  readonly #value: JSONObject;
  protected constructor(submitted: Uint8Array, value: JSONObject, token: symbol) {
    if (token !== constructionToken) throw new TypeError("Schemami handles must be created by parse/admit");
    this.#submitted = submitted.slice(); this.#value = clone(value);
    parsedHandles.add(this);
  }
  get submittedJSON(): Uint8Array { return this.#submitted.slice(); }
  get value(): JSONObject { return clone(this.#value); }

  static parse(input: string | Uint8Array, _budgets: ResourceBudgets = protocolFloor): ParseResult {
    let text: string; let bytes: Uint8Array;
    try {
      if (typeof input === "string") { text = input; bytes = new TextEncoder().encode(input); }
      else { bytes = input.slice(); text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      scanStrictJSON(text);
      const value: unknown = JSON.parse(text);
      if (!isObject(value) || hasLoneSurrogate(value) || hasInvalidNumber(value)) return refusal("invalid-document");
      return { status: "parsed", parsed: new ParsedDocument(bytes, value as JSONObject, constructionToken) };
    } catch { return refusal("invalid-json"); }
  }
}

export class AdmittedRecipe extends ParsedDocument {
  readonly #canonical: Uint8Array; readonly sha256: string;
  private constructor(parsed: ParsedDocument, token: symbol) { super(parsed.submittedJSON, parsed.value, token); const text = canonicalize(parsed.value); this.#canonical = new TextEncoder().encode(text); this.sha256 = canonicalSHA256(parsed.value); admittedRecipeHandles.add(this); }
  get canonicalJSON(): Uint8Array { return this.#canonical.slice(); }
  static async admit(parsed: ParsedDocument, budgets: ResourceBudgets): Promise<AdmissionResult> {
    if (!parsedHandles.has(parsed)) return refusal("invalid-document");
    const analysis = await createSchemamiEngine(EMBEDDED_SCHEMA).analyze(JSON.stringify(parsed.value), budgets);
    if (!analysis.parse.ok || analysis.documents.length !== 1) return refusal("invalid-document");
    const problems = normalize(analysis.documents[0].problems);
    return problems.length ? { status: "refused", problems } : { status: "recipe", recipe: new AdmittedRecipe(parsed, constructionToken) };
  }
}
export class AdmittedBundle extends ParsedDocument {
  readonly #canonical: Uint8Array; readonly sha256: string;
  private constructor(parsed: ParsedDocument, token: symbol) { super(parsed.submittedJSON, parsed.value, token); const text = canonicalize(parsed.value); this.#canonical = new TextEncoder().encode(text); this.sha256 = canonicalSHA256(parsed.value); admittedBundleHandles.add(this); }
  get canonicalJSON(): Uint8Array { return this.#canonical.slice(); }
  static async admit(parsed: ParsedDocument, budgets: ResourceBudgets = protocolFloor): Promise<AdmissionResult> {
    if (!parsedHandles.has(parsed)) return refusal("invalid-document");
    const problems = await validateBundle(parsed.value, budgets);
    return problems.length ? { status: "refused", problems } : { status: "bundle", bundle: new AdmittedBundle(parsed, constructionToken) };
  }
}

export type ParseResult = { status: "parsed"; parsed: ParsedDocument } | { status: "refused"; problems: Problem[] };
export type AdmissionResult = { status: "recipe"; recipe: AdmittedRecipe } | { status: "bundle"; bundle: AdmittedBundle } | { status: "refused"; problems: Problem[] };

export function parse(input: string | Uint8Array, _budgets: ResourceBudgets = protocolFloor): ParseResult {
  return ParsedDocument.parse(input, _budgets);
}

export async function admit(parsed: ParsedDocument, budgets: ResourceBudgets = protocolFloor): Promise<AdmissionResult> {
  if (!parsedHandles.has(parsed)) return refusal("invalid-document");
  const value = parsed.value;
  if ("root" in value || "documents" in value) {
    return AdmittedBundle.admit(parsed, budgets);
  }
  return AdmittedRecipe.admit(parsed, budgets);
}

export function isAdmittedRecipe(value: unknown): value is AdmittedRecipe { return typeof value === "object" && value !== null && admittedRecipeHandles.has(value); }
export function isAdmittedBundle(value: unknown): value is AdmittedBundle { return typeof value === "object" && value !== null && admittedBundleHandles.has(value); }

export function canonicalJSON(value: JSONValue): Uint8Array { return new TextEncoder().encode(canonicalize(value)); }
export function sha256(value: JSONValue): string { return canonicalSHA256(value); }

function refusal(code: string): { status: "refused"; problems: Problem[] } { return { status: "refused", problems: [{ type: `${PROBLEM_BASE}${code}` }] }; }
function normalize(values: ViewerProblem[]): Problem[] { const unique = new Map<string, Problem>(); for (const value of values) { const item = { type: value.type, ...(value.pointer === undefined ? {} : { pointer: value.pointer }) }; unique.set(`${value.pointer ?? ""}\0${value.type}`, item); } return [...unique.values()].sort((a,b) => ascii(a.pointer ?? "", b.pointer ?? "") || ascii(a.type,b.type)); }
function ascii(left:string,right:string):number{return left<right?-1:left>right?1:0;}
function clone<T extends JSONValue>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
  if (isObject(value)) {
    const result = Object.create(null) as JSONObject;
    for (const [key, child] of Object.entries(value)) {
      Object.defineProperty(result, key, { value: clone(child as JSONValue), enumerable: true, writable: true, configurable: true });
    }
    return result as T;
  }
  return value;
}
function isObject(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }

async function validateBundle(bundle: JSONObject, budgets: ResourceBudgets): Promise<Problem[]> {
  const structural = new Validator(EMBEDDED_BUNDLE_SCHEMA as never, "2020-12", false).validate(bundle);
  if (structural.errors.length > 0) return structural.errors.map((error) => ({ type: `${PROBLEM_BASE}invalid-document`, pointer: error.instanceLocation.startsWith("#") ? error.instanceLocation.slice(1) : error.instanceLocation }));
  if (bundle.schemami !== "1" || !isObject(bundle.root) || !Array.isArray(bundle.documents) || bundle.documents.length === 0) return [{ type: `${PROBLEM_BASE}invalid-document` }];
  if (bundle.documents.length > budgets.bundleDocuments) return [{ type: `${PROBLEM_BASE}resource-limit` }];
  const staticOccurrences = protocolObjectCount(bundle);
  if (staticOccurrences > budgets.semanticOccurrences) return [{ type: `${PROBLEM_BASE}resource-limit`, pointer: "/documents" }];
  const allowed = new Set(["schemami", "root", "documents"]); if (Object.keys(bundle).some((key) => !allowed.has(key) && !/^x-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))) return [{ type: `${PROBLEM_BASE}invalid-document` }];
  const engine = createSchemamiEngine(EMBEDDED_SCHEMA); const budgetState = createAnalysisBudgetState(); budgetState.semanticOccurrences=staticOccurrences; const byReference = new Map<string, JSONObject>(); const ordered: string[] = [];
  for (let index=0; index<bundle.documents.length; index+=1) {
    const entry = bundle.documents[index]; if (!isObject(entry) || typeof entry.sha256 !== "string" || !isObject(entry.document)) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: `/documents/${index}` }];
    const analysis = await engine.analyze(JSON.stringify(entry.document), budgets, budgetState, {chargeStaticSemanticOccurrences:false}); if (!analysis.documents[0]?.valid) return normalize(analysis.documents[0]?.problems ?? []).map((problem) => ({ ...problem, pointer: `/documents/${index}/document${problem.pointer ?? ""}` }));
    const digest = canonicalSHA256(entry.document); if (digest !== entry.sha256) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: `/documents/${index}/sha256` }];
    const reference = recipeReference(entry.document as JSONObject, digest); if (byReference.has(reference)) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: `/documents/${index}` }]; byReference.set(reference, entry.document as JSONObject); ordered.push(reference);
  }
  if (ordered[0] !== referenceKey(bundle.root as JSONObject)) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: "/documents/0" }];
  for (let index=2; index<ordered.length; index+=1) if (!(ordered[index-1] < ordered[index])) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: `/documents/${index}` }];
  const visiting = new Set<string>(); const reached = new Set<string>();
  const visit = (reference: string, depth: number): Problem | null => { if (depth > budgets.recursiveLevels) return { type: `${PROBLEM_BASE}resource-limit`, pointer: "/documents" }; if (visiting.has(reference)) return { type: `${PROBLEM_BASE}component-cycle`, pointer: "/documents" }; if (reached.has(reference)) return null; const recipe=byReference.get(reference); if (!recipe) return { type: `${PROBLEM_BASE}unresolved-reference`, pointer: "/documents" }; visiting.add(reference); reached.add(reference); for (const component of Array.isArray(recipe.components) ? recipe.components : []) { if (!isObject(component) || !isObject(component.recipe)) continue; const problem=visit(referenceKey(component.recipe as JSONObject), depth + 1); if (problem) return problem; } visiting.delete(reference); return null; };
  const graphProblem=visit(ordered[0], 1); if (graphProblem) return [graphProblem]; if (reached.size !== ordered.length) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: "/documents" }]; return [];
}

function recipeReference(recipe: JSONObject,digest:string):string { return `${String(recipe.collection)}\0${String(recipe.id)}\0${String(recipe.revision).padStart(20,"0")}\0${digest}`; }
function referenceKey(reference: JSONObject):string { return `${String(reference.collection)}\0${String(reference.id)}\0${String(reference.revision).padStart(20,"0")}\0${String(reference.sha256)}`; }

function protocolObjectCount(value: unknown): number { let count=0;const stack=[value];while(stack.length){const current=stack.pop();if(Array.isArray(current)){stack.push(...current);continue;}if(isObject(current)){count+=1;for(const [name,child] of Object.entries(current))if(!name.startsWith("x-"))stack.push(child);}}return count; }

function hasLoneSurrogate(value: unknown): boolean { const stack=[value]; while(stack.length){const current=stack.pop();if(typeof current==="string"){for(let i=0;i<current.length;i+=1){const code=current.charCodeAt(i);if(code>=0xd800&&code<=0xdbff){const next=current.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return true;}else if(code>=0xdc00&&code<=0xdfff)return true;}}else if(Array.isArray(current))stack.push(...current);else if(isObject(current)){for(const [key,child] of Object.entries(current)){stack.push(key,child);}}}return false; }
function hasInvalidNumber(value: unknown): boolean { const stack=[value]; while(stack.length){const current=stack.pop();if(typeof current==="number"&&!Number.isFinite(current))return true;if(Array.isArray(current))stack.push(...current);else if(isObject(current))stack.push(...Object.values(current));}return false; }

// Recursive lexical pass that rejects duplicate object member names before
// JSON.parse can collapse them. JSON.parse remains the grammar authority.
function scanStrictJSON(text:string):void { enforceParserDepth(text);let i=0; const ws=()=>{while(/[\t\n\r ]/.test(text[i]??""))i+=1;}; const string=():string=>{const start=i;if(text[i++]!=="\"")throw 0;while(i<text.length){if(text[i]==="\""){i+=1;return JSON.parse(text.slice(start,i));}if(text[i]==="\\")i+=2;else i+=1;}throw 0;}; const number=(raw:string):void=>{const parsed=Number(raw);const mantissa=raw.split(/[eE]/,1)[0];if(!Number.isFinite(parsed)||(parsed===0&&/[1-9]/.test(mantissa))||!integerLexemeIsExact(raw,parsed))throw 0;};const value=():void=>{ws();if(text[i]==="{"){i+=1;ws();const seen=new Set<string>();if(text[i]==="}"){i+=1;return;}for(;;){ws();const key=string();if(seen.has(key))throw 0;seen.add(key);ws();if(text[i++]!==":")throw 0;value();ws();if(text[i]===","){i+=1;continue;}if(text[i]!=="}")throw 0;i+=1;return;}}if(text[i]==="["){i+=1;ws();if(text[i]==="]"){i+=1;return;}for(;;){value();ws();if(text[i]===","){i+=1;continue;}if(text[i]!=="]")throw 0;i+=1;return;}}if(text[i]==="\""){string();return;}const match=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));if(!match)throw 0;if(match[0]!=="true"&&match[0]!=="false"&&match[0]!=="null")number(match[0]);i+=match[0].length;};value();ws();if(i!==text.length)throw 0; }

function enforceParserDepth(text:string):void{let depth=0,inString=false,escaped=false;for(const character of text){if(inString){if(escaped)escaped=false;else if(character==="\\")escaped=true;else if(character==='"')inString=false;continue;}if(character==='"'){inString=true;continue;}if(character==="{"||character==="["){depth+=1;if(depth>256)throw 0;}else if(character==="}"||character==="]")depth-=1;}}

function integerLexemeIsExact(raw:string, parsed:number):boolean {
  const match=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if(!match||!Number.isInteger(parsed))return true;
  const exponent=Number(match[4]??"0"); if(!Number.isSafeInteger(exponent))return false;
  const fraction=match[3]??""; let coefficient=BigInt(`${match[1]}${match[2]}${fraction}`); const scale=exponent-fraction.length;
  if(scale>=0) coefficient*=10n**BigInt(scale); else { const divisor=10n**BigInt(-scale); if(coefficient%divisor!==0n)return true; coefficient/=divisor; }
  return BigInt(parsed)===coefficient;
}
