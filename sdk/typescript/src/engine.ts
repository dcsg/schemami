import { Validator } from "@cfworker/json-schema";
import {
  evaluateRequest,
  createAnalysisBudgetState,
  validateReachableGraphs,
  validateDurationWindow,
  type AnalysisBudgetState,
  type Envelope,
} from "./calculus.ts";

const PROBLEM_BASE = "https://schemami.dev/problems/";
const knownUnits = new Set([
  "1", "g", "kg", "mL", "L", "Cel", "[degF]", "[cup_us]", "[tbs_us]",
  "[tsp_us]", "[foz_us]", "[cup_m]",
]);
const MEDIA_FRAGMENTS_SPECIFICATION = "https://www.w3.org/TR/media-frags/";

type Dict = Record<string, unknown>;
const object = (value: unknown): Dict | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Dict : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export type ViewerProblem = { type: string; pointer?: string; message: string };
export type DocumentAnalysis = {
  id: string;
  valid: boolean;
  problems: ViewerProblem[];
  canonical: Dict;
};
export type AnalysisResult = {
  parse: { ok: boolean; errors: Array<{ message: string; line?: number }> };
  documents: DocumentAnalysis[];
};
export type AnalysisBudgets = { recursiveLevels: number; semanticOccurrences: number; analysisStates: number };
export type AnalysisOptions = { chargeStaticSemanticOccurrences?: boolean };

export interface SchemamiEngine {
  readonly version: 1;
  analyze(text: string, budgets?: AnalysisBudgets, budgetState?: AnalysisBudgetState, options?: AnalysisOptions): Promise<AnalysisResult>;
  scale(document: Dict, factor: string): Envelope;
  resolveFormula(document: Dict, formulaId: string): Envelope;
  schedule(document: Dict): Envelope;
}

function problem(code: string, pointer: string | undefined, message: string): ViewerProblem {
  return { type: `${PROBLEM_BASE}${code}`, ...(pointer === undefined ? {} : { pointer }), message };
}

function pointerOf(instanceLocation: string): string {
  return instanceLocation.startsWith("#") ? instanceLocation.slice(1) : instanceLocation;
}

function named(items: unknown, pointer: string, problems: ViewerProblem[]): Map<string, Dict> {
  const result = new Map<string, Dict>();
  for (const [index, value] of list(items).entries()) {
    const item = object(value);
    if (!item) continue;
    const id = String(item.id ?? "");
    if (result.has(id)) {
      problems.push(problem("invalid-document", `${pointer}/${index}/id`, `Duplicate local id ${id}.`));
    } else {
      result.set(id, item);
    }
  }
  return result;
}

function resolvePointer(root: unknown, pointer: string): boolean {
  if (pointer === "") return true;
  if (!pointer.startsWith("/")) return false;
  let current = root;
  for (const rawToken of pointer.slice(1).split("/")) {
    if (/(?:~$|~[^01])/.test(rawToken)) return false;
    const token = rawToken.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(token) || Number(token) >= current.length) return false;
      current = current[Number(token)];
    } else {
      const record = object(current);
      if (!record || !Object.hasOwn(record, token)) return false;
      current = record[token];
    }
  }
  return true;
}

function decimalUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
}

function validateQuantity(quantity: Dict, pointer: string, problems: ViewerProblem[]): void {
  if (quantity.kind === "measured" || quantity.kind === "range") {
    if (!knownUnits.has(String(quantity.unit ?? ""))) {
      problems.push(problem("unknown-unit", `${pointer}/unit`, "Unit is not in the pinned Schemami v1 UCUM table."));
    }
  }
  if (quantity.kind === "range") {
    const minimum = String(quantity.minimum ?? "0");
    const maximum = String(quantity.maximum ?? "0");
    if (decimalUnits(minimum) > decimalUnits(maximum)) {
      problems.push(problem("invalid-document", pointer, "Quantity minimum exceeds maximum."));
    }
  }
  if (quantity.kind === "open") {
    const guide = object(quantity.guide);
    if (guide && guide.kind !== "measured" && guide.kind !== "range") {
      problems.push(problem("invalid-document", `${pointer}/guide`, "Open quantity guide must be measured or range."));
    } else if (guide) {
      validateQuantity(guide, `${pointer}/guide`, problems);
    }
  }
}

function structuralProblems(document: Dict): ViewerProblem[] {
  const problems: ViewerProblem[] = [];
  for (const [index, value] of list(document.ingredients).entries()) {
    const quantity = object(object(value)?.quantity);
    if (quantity?.kind === "open") validateQuantity(quantity, `/ingredients/${index}/quantity`, problems);
  }
  const formula = object(document.formula);
  if (formula) {
    for (const field of ["target", "basis_quantity"] as const) {
      const quantity = object(formula[field]);
      if (quantity?.kind === "open") validateQuantity(quantity, `/formula/${field}`, problems);
    }
  }
  return problems;
}

type Fraction = { numerator: bigint; denominator: bigint };

function parseNptTime(value: string): Fraction | null {
  if (!/^(?:[0-9]+(?:\.[0-9]+)?|[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?|[0-9]+:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?)$/.test(value)) return null;
  const parts = value.split(":");
  const secondsText = parts.at(-1)!;
  const [wholeSeconds, fraction = ""] = secondsText.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  let numerator = BigInt(wholeSeconds) * denominator + BigInt(fraction || "0");
  if (parts.length >= 2) {
    const minutes = BigInt(parts.at(-2)!);
    if (minutes > 59n || BigInt(wholeSeconds) > 59n) return null;
    numerator += minutes * 60n * denominator;
  }
  if (parts.length === 3) numerator += BigInt(parts[0]) * 3600n * denominator;
  return { numerator, denominator };
}

function validateSelector(selector: Dict, pointer: string, problems: ViewerProblem[]): void {
  if (selector.conforms_to !== MEDIA_FRAGMENTS_SPECIFICATION) return;
  for (const component of String(selector.value ?? "").split("&")) {
    if (!component.startsWith("t=")) continue;
    const raw = component.slice(2).replace(/^npt:/, "");
    const parts = raw.split(",");
    if (parts.length > 2 || parts.length === 0 || (parts.length === 2 && parts[1] === "")) {
      problems.push(problem("invalid-document", pointer, "Invalid W3C media temporal fragment."));
      continue;
    }
    const start = parts[0] === "" ? null : parseNptTime(parts[0]);
    const end = parts.length === 2 ? parseNptTime(parts[1]) : null;
    if ((parts[0] !== "" && !start) || (parts.length === 2 && !end) || (!start && !end)) {
      problems.push(problem("invalid-document", pointer, "Invalid W3C normal play time."));
      continue;
    }
    if (start && end && start.numerator * end.denominator >= end.numerator * start.denominator) {
      problems.push(problem("invalid-document", pointer, "W3C media temporal fragment start must be less than end."));
    }
  }
}

function semanticProblems(document: Dict): ViewerProblem[] {
  const problems: ViewerProblem[] = [];
  try {
    Intl.getCanonicalLocales(String(document.content_language ?? ""));
  } catch {
    problems.push(problem("invalid-document", "/content_language", "content_language is not a well-formed BCP 47 tag."));
  }
  const origin = object(document.origin);
  if (origin && typeof origin.country === "string" && typeof origin.subdivision === "string" && !origin.subdivision.startsWith(`${origin.country}-`)) {
    problems.push(problem("invalid-document", "/origin/subdivision", "Subdivision must belong to origin country."));
  }
  const ingredients = named(document.ingredients, "/ingredients", problems);
  const techniques = named(document.techniques, "/techniques", problems);
  const equipment = named(document.equipment, "/equipment", problems);
  const steps = named(document.steps, "/steps", problems);
  const sources = named(document.sources, "/sources", problems);
  named(document.evidence, "/evidence", problems);

  for (const [index, value] of list(document.ingredients).entries()) {
    const quantity = object(object(value)?.quantity);
    if (quantity) validateQuantity(quantity, `/ingredients/${index}/quantity`, problems);
  }

  const formula = object(document.formula);
  if (formula) {
    const basis = typeof formula.basis === "string" ? formula.basis : undefined;
    if (basis && !ingredients.has(basis)) {
      problems.push(problem("unresolved-reference", "/formula/basis", `Unknown ingredient ${basis}.`));
    }
    const seen = new Set<string>();
    let basisIndex = -1;
    for (const [index, value] of list(formula.terms).entries()) {
      const term = object(value)!;
      const ingredient = String(term.ingredient ?? "");
      if (!ingredients.has(ingredient)) {
        problems.push(problem("unresolved-reference", `/formula/terms/${index}/ingredient`, `Unknown ingredient ${ingredient}.`));
      } else if (object(ingredients.get(ingredient)?.quantity)) {
        problems.push(problem("invalid-document", `/formula/terms/${index}/ingredient`, `Formula ingredient ${ingredient} also has an explicit quantity.`));
      }
      if (seen.has(ingredient)) {
        problems.push(problem("invalid-document", `/formula/terms/${index}/ingredient`, `Formula repeats ingredient ${ingredient}.`));
      }
      seen.add(ingredient);
      if (formula.kind === "percentage" && ingredient === basis) basisIndex = index;
    }
    if (formula.kind === "percentage") {
      if (basisIndex < 0) {
        problems.push(problem("invalid-document", "/formula/terms", "Named percentage basis must occur exactly once in terms."));
      } else if (object(list(formula.terms)[basisIndex])?.percentage !== "100") {
        problems.push(problem("invalid-document", `/formula/terms/${basisIndex}/percentage`, "Named percentage basis must be 100."));
      }
    }
    for (const field of ["target", "basis_quantity"] as const) {
      const quantity = object(formula[field]);
      if (quantity) validateQuantity(quantity, `/formula/${field}`, problems);
    }
  }

  const afterByStep = new Map<string, string[]>();
  for (const [index, value] of list(document.steps).entries()) {
    const step = object(value)!;
    const id = String(step.id ?? "");
    const after = list(step.after).map(String);
    afterByStep.set(id, after);
    for (const dependency of after) {
      if (dependency === id || !steps.has(dependency)) {
        problems.push(problem("unresolved-reference", `/steps/${index}/after`, `Invalid step dependency ${dependency}.`));
      }
    }
    for (const field of ["uses", "produces"] as const) {
      for (const ingredient of list(step[field]).map(String)) {
        if (!ingredients.has(ingredient)) problems.push(problem("unresolved-reference", `/steps/${index}/${field}`, `Unknown ingredient ${ingredient}.`));
      }
    }
    for (const technique of list(step.techniques).map(String)) {
      if (!techniques.has(technique)) {
        problems.push(problem("unresolved-reference", `/steps/${index}/techniques`, `Unknown technique ${technique}.`));
      }
    }
    for (const item of list(step.equipment).map(String)) {
      if (!equipment.has(item)) problems.push(problem("unresolved-reference", `/steps/${index}/equipment`, `Unknown equipment ${item}.`));
    }
    if (validateDurationWindow(step.duration)) {
      problems.push(problem("invalid-document", `/steps/${index}/duration`, "Duration window is not ordered."));
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of afterByStep.get(id) ?? []) if (cyclic(dependency)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of afterByStep.keys()) {
    if (cyclic(id)) {
      problems.push(problem("invalid-document", "/steps", "Step dependency graph contains a cycle."));
      break;
    }
  }

  for (const [index, value] of list(document.evidence).entries()) {
    const evidence = object(value)!;
    if (typeof evidence.source === "string" && !sources.has(evidence.source)) {
      problems.push(problem("unresolved-reference", `/evidence/${index}/source`, `Unknown evidence source ${evidence.source}.`));
    }
    const pointer = String(evidence.pointer ?? "");
    if (!resolvePointer(document, pointer)) {
      problems.push(problem("invalid-document", `/evidence/${index}/pointer`, "Evidence pointer does not identify an existing value."));
    }
    const selector = object(evidence.selector);
    if (selector) validateSelector(selector, `/evidence/${index}/selector`, problems);
  }
  return problems;
}

type MethodRecord = { kind: string; id: string; value: Dict; pointer: string };

function semanticProblemsV1(
  document: Dict,
  budgets: AnalysisBudgets = { recursiveLevels: 64, semanticOccurrences: 10_000, analysisStates: 10_000 },
  budgetState: AnalysisBudgetState = createAnalysisBudgetState(),
  options: AnalysisOptions = {},
): ViewerProblem[] {
  const problems: ViewerProblem[] = [];
  const add = (code: string, pointer: string, message: string): void => { problems.push(problem(code, pointer, message)); };
  try { Intl.getCanonicalLocales(String(document.content_language ?? "")); } catch { add("invalid-document", "/content_language", "content_language is not a well-formed BCP 47 tag."); }
  const origin = object(document.origin);
  if (origin && typeof origin.country === "string" && typeof origin.subdivision === "string" && !origin.subdivision.startsWith(`${origin.country}-`)) add("invalid-document", "/origin/subdivision", "Subdivision must belong to origin country.");

  const collections = new Map<string, Map<string, Dict>>();
  for (const name of ["parameters", "ingredients", "components", "preparations", "outputs", "techniques", "equipment", "formulas", "sources", "evidence"]) collections.set(name, named(document[name], `/${name}`, problems));

  const parameters = collections.get("parameters")!;
  for (const [index, parameter] of list(document.parameters).map(object).entries()) if (parameter) {
    if (parameter.kind === "choice") {
      const seen = new Set<string>(); for (const [optionIndex, option] of list(parameter.options).map(object).entries()) if (option) { const id = String(option.id); if (seen.has(id)) add("invalid-document", `/parameters/${index}/options/${optionIndex}/id`, `Duplicate option ${id}.`); seen.add(id); }
      if (typeof parameter.default === "string" && !seen.has(parameter.default)) add("unresolved-reference", `/parameters/${index}/default`, `Unknown option ${parameter.default}.`);
    }
  }

  let semanticObjects=0;const objectStack:unknown[]=[document];while(objectStack.length){const current=objectStack.pop();if(Array.isArray(current))objectStack.push(...current);else{const record=object(current);if(record){semanticObjects+=1;for(const [name,child] of Object.entries(record))if(!name.startsWith("x-"))objectStack.push(child);}}}
  if(options.chargeStaticSemanticOccurrences!==false)budgetState.semanticOccurrences+=semanticObjects;
  if(budgetState.semanticOccurrences>budgets.semanticOccurrences)return [problem("resource-limit",undefined,"Document exceeds the configured semantic-occurrence budget.")];
  const method: MethodRecord[] = []; const methodIDs = new Map<string, string>();
  const stack = [...list(object(document.method)?.sequence).entries()].reverse().map(([index, value]) => ({ value, pointer: `/method/sequence/${index}`, depth: 1 }));
  while (stack.length) {
    const current = stack.pop()!; const value = object(current.value); if (!value) continue;
    if (current.depth > budgets.recursiveLevels) { add("resource-limit", current.pointer, "Method exceeds the configured recursive-depth budget."); break; }
    const id = String(value.id); const prior = methodIDs.get(id); if (prior) add("invalid-document", `${current.pointer}/id`, `Duplicate method id ${id}; first declared at ${prior}.`); else methodIDs.set(id, current.pointer);
    method.push({ kind: String(value.kind), id, value, pointer: current.pointer });
    if (value.kind === "section") for (const [index, child] of [...list(value.sequence).entries()].reverse()) stack.push({ value: child, pointer: `${current.pointer}/sequence/${index}`, depth: current.depth + 1 });
  }
  if (problems.some((item) => item.type === `${PROBLEM_BASE}resource-limit`)) return [problem("resource-limit", "", "Document exceeds the configured recursive-depth budget.")];
  const steps = new Map(method.filter((entry) => entry.kind === "step").map((entry) => [entry.id, entry]));
  const resourceCollection = (kind: string): string => kind === "preparation" ? "preparations" : kind === "output" ? "outputs" : kind === "equipment" ? "equipment" : `${kind}s`;
  const validateReference = (reference: Dict, pointer: string): void => { const collection = resourceCollection(String(reference.kind)); if (!collections.get(collection)?.has(String(reference.id))) add("unresolved-reference", pointer, `Unknown ${String(reference.kind)} ${String(reference.id)}.`); };
  const validateActivation = (activation: Dict, pointer: string, depth = 1): void => {
    if (depth > budgets.recursiveLevels) { add("resource-limit", pointer, "Activation exceeds the configured recursive-depth budget."); return; }
    const kind = String(activation.kind);
    if (["choice_is", "toggle_is", "measurement_compare"].includes(kind)) {
      const parameter = parameters.get(String(activation.parameter)); const expected = kind === "choice_is" ? "choice" : kind === "toggle_is" ? "toggle" : "measurement";
      if (!parameter) add("unresolved-reference", `${pointer}/parameter`, `Unknown parameter ${String(activation.parameter)}.`);
      else if (parameter.kind !== expected) add("invalid-document", pointer, `${kind} requires a ${expected} parameter.`);
      else if (kind === "choice_is" && !list(parameter.options).map(object).some((option) => option?.id === activation.option)) add("unresolved-reference", `${pointer}/option`, `Unknown option ${String(activation.option)}.`);
    } else if (kind === "all" || kind === "any") list(activation.conditions).map(object).forEach((condition, index) => { if (condition) validateActivation(condition, `${pointer}/conditions/${index}`, depth + 1); });
    else if (kind === "not") { const condition = object(activation.condition); if (condition) validateActivation(condition, `${pointer}/condition`, depth + 1); }
  };
  const validateCompletion = (completion: Dict, pointer: string, depth = 1): void => {
    if (depth > budgets.recursiveLevels) { add("resource-limit", pointer, "Completion exceeds the configured recursive-depth budget."); return; }
    if (completion.kind === "all" || completion.kind === "any") list(completion.conditions).map(object).forEach((condition, index) => { if (condition) validateCompletion(condition, `${pointer}/conditions/${index}`, depth + 1); });
  };
  const activationSites: Array<[Dict, string]> = [];
  for (const collection of ["ingredients", "components", "equipment"]) list(document[collection]).map(object).forEach((value, index) => { const activation = object(value?.activation); if (activation) activationSites.push([activation, `/${collection}/${index}/activation`]); });

  for (const entry of method) {
    const timing = object(entry.value.relative_timing); if (timing && !steps.has(String(timing.anchor_step))) add("unresolved-reference", `${entry.pointer}/relative_timing/anchor_step`, `Unknown step ${String(timing.anchor_step)}.`);
    const activation = object(entry.value.activation); if (activation) activationSites.push([activation, `${entry.pointer}/activation`]);
    const completion = object(entry.value.completion); if (completion) validateCompletion(completion, `${entry.pointer}/completion`);
    if (entry.kind !== "step") continue;
    for (const dependency of list(entry.value.after).map(String)) if (dependency === entry.id || !steps.has(dependency)) add("unresolved-reference", `${entry.pointer}/after`, `Invalid step dependency ${dependency}.`);
    for (const field of ["uses", "produces"] as const) list(entry.value[field]).map(object).forEach((reference, index) => { if (reference) validateReference(reference, `${entry.pointer}/${field}/${index}`); });
    for (const field of ["techniques", "equipment"] as const) list(entry.value[field]).map(String).forEach((id) => { if (!collections.get(field)?.has(id)) add("unresolved-reference", `${entry.pointer}/${field}`, `Unknown ${field} ${id}.`); });
    if (validateDurationWindow(entry.value.duration)) add("invalid-document", `${entry.pointer}/duration`, "Duration window is not ordered.");
    const parentUses = new Set(list(entry.value.uses).map(object).filter(Boolean).map((reference) => `${String(reference!.kind)}\0${String(reference!.id)}`)); const parentProduces = new Set(list(entry.value.produces).map(object).filter(Boolean).map((reference) => `${String(reference!.kind)}\0${String(reference!.id)}`));
    const actionIDs = new Set<string>(); for (const [actionIndex, action] of list(entry.value.actions).map(object).entries()) if (action) {
      const actionID = String(action.id); if (actionIDs.has(actionID)) add("invalid-document", `${entry.pointer}/actions/${actionIndex}/id`, `Duplicate action ${actionID}.`); actionIDs.add(actionID);
      const actionActivation = object(action.activation); if (actionActivation) activationSites.push([actionActivation, `${entry.pointer}/actions/${actionIndex}/activation`]);
      const actionCompletion = object(action.completion); if (actionCompletion) validateCompletion(actionCompletion, `${entry.pointer}/actions/${actionIndex}/completion`);
      for (const field of ["uses", "produces"] as const) list(action[field]).map(object).forEach((reference, index) => { if (!reference) return; validateReference(reference, `${entry.pointer}/actions/${actionIndex}/${field}/${index}`); const key = `${String(reference.kind)}\0${String(reference.id)}`; if (!(field === "uses" ? parentUses : parentProduces).has(key)) add("invalid-document", `${entry.pointer}/actions/${actionIndex}/${field}/${index}`, "Action references must be a subset of the containing step."); });
    }
  }
  activationSites.forEach(([activation, pointer]) => validateActivation(activation, pointer));
  if (problems.some((item) => item.type === `${PROBLEM_BASE}resource-limit`)) return [problem("resource-limit", "", "Document exceeds the configured recursive-depth budget.")];

  const claimed = new Map<string, string>();
  for (const [formulaIndex, formula] of list(document.formulas).map(object).entries()) if (formula) {
    const seen = new Set<string>(); const basis = object(formula.basis); const basisKey = basis ? `${String(basis.kind)}\0${String(basis.id)}` : ""; let basisIndex = -1;
    if (basis) validateReference(basis, `/formulas/${formulaIndex}/basis`);
    for (const [termIndex, term] of list(formula.terms).map(object).entries()) if (term) { const input = object(term.input)!; validateReference(input, `/formulas/${formulaIndex}/terms/${termIndex}/input`); const key = `${String(input.kind)}\0${String(input.id)}`; if (seen.has(key)) add("invalid-document", `/formulas/${formulaIndex}/terms/${termIndex}/input`, "Formula repeats an input."); seen.add(key); if (claimed.has(key)) add("invalid-document", `/formulas/${formulaIndex}/terms/${termIndex}/input`, "Input has more than one formula authority."); claimed.set(key, String(formula.id)); const collection = collections.get(resourceCollection(String(input.kind))); if (object(collection?.get(String(input.id))?.quantity)) add("invalid-document", `/formulas/${formulaIndex}/terms/${termIndex}/input`, "Formula input also has an explicit quantity."); if (key === basisKey) basisIndex = termIndex; }
    if (formula.kind === "percentage" && (basisIndex < 0 || object(list(formula.terms)[basisIndex])?.percentage !== "100")) add("invalid-document", `/formulas/${formulaIndex}/basis`, "Percentage basis must occur once at 100 percent.");
  }
  for (const [index, component] of list(document.components).map(object).entries()) if (component) { const key = `component\0${String(component.id)}`; if (Object.hasOwn(component, "quantity") === claimed.has(key)) add("invalid-document", `/components/${index}`, "Component must have exactly one quantity authority."); }

  const walk: Array<{ value: unknown; pointer: string }> = [{ value: document, pointer: "" }];
  while (walk.length) { const current = walk.pop()!; if (Array.isArray(current.value)) current.value.forEach((child, index) => walk.push({ value: child, pointer: `${current.pointer}/${index}` })); else { const record = object(current.value); if (!record) continue; if (["measured", "range", "open"].includes(String(record.kind))) validateQuantity(record, current.pointer, problems); for (const [key, child] of Object.entries(record)) if(!key.startsWith("x-")) walk.push({ value: child, pointer: `${current.pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}` }); } }

  const sources = collections.get("sources")!;
  for (const [index, evidence] of list(document.evidence).map(object).entries()) if (evidence) { if (typeof evidence.source === "string" && !sources.has(evidence.source)) add("unresolved-reference", `/evidence/${index}/source`, `Unknown evidence source ${evidence.source}.`); const pointer = String(evidence.pointer ?? ""); if (!resolvePointer(document, pointer)) add("invalid-document", `/evidence/${index}/pointer`, "Evidence pointer does not identify an existing value."); const selector = object(evidence.selector); if (selector) validateSelector(selector, `/evidence/${index}/selector`, problems); }
  for (const graphProblem of validateReachableGraphs(document,budgets,budgetState,semanticObjects)) problems.push({ ...graphProblem, message: "Reachable active graph violates a Schemami invariant." });
  if (problems.some((item) => item.type === `${PROBLEM_BASE}resource-limit`)) return [problem("resource-limit", "", "Document exceeds the configured request budget.")];
  const unique = new Map<string, ViewerProblem>(); for (const item of problems) unique.set(`${item.pointer ?? ""}\0${item.type}`, item);
  return [...unique.values()].sort((left, right) => (left.pointer ?? "") < (right.pointer ?? "") ? -1 : (left.pointer ?? "") > (right.pointer ?? "") ? 1 : left.type < right.type ? -1 : left.type > right.type ? 1 : 0);
}

export function createSchemamiEngine(schema: Record<string, unknown>): SchemamiEngine {
  const validator = new Validator(schema as never, "2020-12", false);
  return {
    version: 1,
    async analyze(
      text: string,
      budgets: AnalysisBudgets = { recursiveLevels: 64, semanticOccurrences: 10_000, analysisStates: 10_000 },
      budgetState: AnalysisBudgetState = createAnalysisBudgetState(),
      options: AnalysisOptions = {},
    ): Promise<AnalysisResult> {
      let value: Dict | null = null;
      try { value = object(JSON.parse(text)); } catch (error) {
        return { parse: { ok: false, errors: [{ message: error instanceof Error ? error.message : "invalid JSON" }] }, documents: [] };
      }
      if (!value) return { parse: { ok: false, errors: [{ message: "document root must be an object" }] }, documents: [] };
      let problems: ViewerProblem[] = [];
      if (Object.hasOwn(value, "rcp")) problems = [problem("unsupported-legacy", "", "RCP input is not supported by Schemami v1.")];
      else {
        problems = structuralProblems(value);
        if (problems.length === 0) {
          const result = validator.validate(value);
          problems = result.errors.map((error) => problem("invalid-document", pointerOf(error.instanceLocation), error.error));
        }
        if (problems.length === 0) problems = semanticProblemsV1(value,budgets,budgetState,options);
      }
      return { parse: { ok: true, errors: [] }, documents: [{ id: String(value.id ?? ""), valid: problems.length === 0, problems, canonical: value }] };
    },
    scale: (document, factor) => evaluateRequest("scale", { recipe: document, arguments: { factor } }),
    resolveFormula: (document, formulaId) => evaluateRequest("resolve_formula", { recipe: document, arguments: { formula_id: formulaId } }),
    schedule: (document) => evaluateRequest("schedule", { recipe: document, arguments: {} }),
  };
}
