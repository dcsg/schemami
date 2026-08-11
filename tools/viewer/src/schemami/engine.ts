import { Validator } from "@cfworker/json-schema";
import { parseAllDocuments } from "yaml";
import {
  resolveFormula,
  scale,
  schedule,
  validateDurationWindow,
  type Envelope,
  type Formula,
  type Recipe,
  type Step,
} from "./calculus.ts";

const PROBLEM_BASE = "https://schemami.dev/problems/";
const knownUnits = new Set([
  "g", "kg", "mL", "L", "Cel", "[degF]", "[cup_us]", "[tbs_us]",
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

export interface SchemamiEngine {
  readonly version: 1;
  analyze(text: string): Promise<AnalysisResult>;
  scale(document: Dict, factor: string): Envelope;
  resolveFormula(formula: Formula): Envelope;
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

export function createSchemamiEngine(schema: Record<string, unknown>): SchemamiEngine {
  const validator = new Validator(schema as never, "2020-12", false);
  return {
    version: 1,
    async analyze(text: string): Promise<AnalysisResult> {
      const parsed = parseAllDocuments(text, { uniqueKeys: true });
      const errors = parsed.flatMap((document) => document.errors.map((error) => ({
        message: error.message,
        line: error.linePos?.[0]?.line,
      })));
      if (errors.length > 0) return { parse: { ok: false, errors }, documents: [] };
      const documents: DocumentAnalysis[] = [];
      for (const parsedDocument of parsed) {
        const value = object(parsedDocument.toJS());
        if (!value) continue;
        let problems: ViewerProblem[] = [];
        if (Object.hasOwn(value, "rcp")) {
          problems = [problem("unsupported-legacy", "", "RCP input is not supported by Schemami v1.")];
        } else {
          problems = structuralProblems(value);
          if (problems.length === 0) {
            const result = validator.validate(value);
            problems = result.errors.map((error) =>
              problem("invalid-document", pointerOf(error.instanceLocation), error.error)
            );
          }
          if (problems.length === 0) problems = semanticProblems(value);
        }
        documents.push({
          id: String(value.id ?? ""),
          valid: problems.length === 0,
          problems,
          canonical: value,
        });
      }
      return { parse: { ok: true, errors: [] }, documents };
    },
    scale: (document, factor) => scale(document as unknown as Recipe, factor),
    resolveFormula: (formula) => resolveFormula(formula, "/formula"),
    schedule: (document) => schedule(list(document.steps) as Step[]),
  };
}
