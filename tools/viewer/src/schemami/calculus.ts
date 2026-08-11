export type Problem = { type: string; pointer?: string };
export type Envelope = {
  operation: string;
  status: "ok" | "refused" | "not_applicable";
  evaluation?: unknown;
  formula_evaluations?: unknown;
  result?: unknown;
  problems?: Problem[];
};
export type Quantity = {
  kind: string;
  value?: string;
  minimum?: string;
  maximum?: string;
  unit?: string;
  scaling?: "linear" | "fixed";
  qualifier?: string;
  guide?: Quantity;
};
export type Ingredient = { id: string; quantity?: Quantity };
export type FormulaTerm = { ingredient: string; parts?: string; percentage?: string };
export type Formula = {
  kind: string;
  basis?: string;
  terms: FormulaTerm[];
  target?: Quantity;
  basis_quantity?: Quantity;
};
export type Recipe = { ingredients: Ingredient[]; formula?: Formula };
export type Step = { id: string; after?: string[]; duration?: unknown };

type Rational = { numerator: bigint; denominator: bigint };
type UnitDefinition = { dimension: "unity" | "mass" | "volume"; factor: Rational };

const PROBLEM_BASE = "https://schemami.dev/problems/";

function gcd(left: bigint, right: bigint): bigint {
  left = left < 0n ? -left : left;
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}

function rational(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) throw new Error("zero denominator");
  if (denominator < 0n) [numerator, denominator] = [-numerator, -denominator];
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

const integer = (value: bigint): Rational => rational(value, 1n);
const multiply = (left: Rational, right: Rational): Rational =>
  rational(left.numerator * right.numerator, left.denominator * right.denominator);
const divide = (left: Rational, right: Rational): Rational =>
  rational(left.numerator * right.denominator, left.denominator * right.numerator);
const add = (left: Rational, right: Rational): Rational =>
  rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
const subtract = (left: Rational, right: Rational): Rational =>
  add(left, rational(-right.numerator, right.denominator));

const unitTable: Record<string, UnitDefinition> = {
  "1": { dimension: "unity", factor: integer(1n) },
  g: { dimension: "mass", factor: integer(1n) },
  kg: { dimension: "mass", factor: integer(1000n) },
  mL: { dimension: "volume", factor: integer(1n) },
  L: { dimension: "volume", factor: integer(1000n) },
  "[cup_us]": { dimension: "volume", factor: rational(2365882365n, 10000000n) },
  "[tbs_us]": { dimension: "volume", factor: rational(295735295625n, 20000000000n) },
  "[tsp_us]": { dimension: "volume", factor: rational(295735295625n, 60000000000n) },
  "[foz_us]": { dimension: "volume", factor: rational(295735295625n, 10000000000n) },
  "[cup_m]": { dimension: "volume", factor: integer(240n) },
};

const ambiguousUnits = new Set(["cup", "tbsp", "tsp", "floz"]);
const knownUnit = (unit: string): boolean => unit === "Cel" || unit === "[degF]" || unit in unitTable;
const unitsCompatible = (left: string, right: string): boolean => {
  if (!knownUnit(left) || !knownUnit(right)) return false;
  if (left === "Cel" || left === "[degF]" || right === "Cel" || right === "[degF]") {
    return (left === "Cel" || left === "[degF]") && (right === "Cel" || right === "[degF]");
  }
  return unitTable[left].dimension === unitTable[right].dimension;
};

const asciiCompare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

function refused(operation: string, code: string, pointer?: string): Envelope {
  return {
    operation,
    status: "refused",
    problems: [{ type: `${PROBLEM_BASE}${code}`, ...(pointer ? { pointer } : {}) }],
  };
}

function parseCanonicalDecimal(raw: string): Rational | "invalid-decimal" | "resource-limit" {
  if (!raw || raw.startsWith("+") || /[eE]/.test(raw)) return "invalid-decimal";
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(unsigned);
  if (!match) return "invalid-decimal";
  const fraction = match[2] ?? "";
  if (fraction.length > 4 || (fraction && fraction.endsWith("0"))) return "invalid-decimal";
  if (match[1].length + fraction.length > 16) return "resource-limit";
  if (negative && unsigned === "0") return "invalid-decimal";
  let numerator = BigInt(`${match[1]}${fraction}`);
  if (negative) numerator = -numerator;
  return rational(numerator, 10n ** BigInt(fraction.length));
}

function formatCanonicalDecimal(value: Rational): string | "resource-limit" {
  const negative = value.numerator < 0n;
  const absolute = negative ? -value.numerator : value.numerator;
  const scaled = absolute * 10000n;
  let quotient = scaled / value.denominator;
  const remainder = scaled % value.denominator;
  const comparison = remainder * 2n - value.denominator;
  if (comparison > 0n || (comparison === 0n && quotient % 2n === 1n)) quotient += 1n;
  const whole = quotient / 10000n;
  const fraction = quotient % 10000n;
  let output = whole.toString();
  if (fraction !== 0n) {
    output += `.${fraction.toString().padStart(4, "0").replace(/0+$/, "")}`;
  }
  if (negative && quotient !== 0n) output = `-${output}`;
  if (output.replace(/[-.]/g, "").length > 16) return "resource-limit";
  return output;
}

function convert(value: Rational, sourceUnit: string, targetUnit: string): Rational | string {
  if (sourceUnit === targetUnit && knownUnit(sourceUnit)) return value;
  if (sourceUnit === "Cel" && targetUnit === "[degF]") {
    return add(multiply(value, rational(9n, 5n)), integer(32n));
  }
  if (sourceUnit === "[degF]" && targetUnit === "Cel") {
    return multiply(subtract(value, integer(32n)), rational(5n, 9n));
  }
  if ([sourceUnit, targetUnit].some((unit) => unit === "Cel" || unit === "[degF]")) {
    if (!knownUnit(sourceUnit) || !knownUnit(targetUnit)) return "unknown-unit";
    return "dimension-mismatch";
  }
  const source = unitTable[sourceUnit];
  const target = unitTable[targetUnit];
  if (!source || !target) return "unknown-unit";
  if (source.dimension !== target.dimension) return "dimension-mismatch";
  return divide(multiply(value, source.factor), target.factor);
}

export function convertQuantity(quantity: Quantity, targetUnit: string, pointer: string): Envelope {
  const operation = "convert_quantity";
  if (quantity.kind !== "measured") return refused(operation, "unsupported-quantity-kind", pointer);
  if (ambiguousUnits.has(quantity.unit ?? "")) return refused(operation, "ambiguous-unit", `${pointer}/unit`);
  if (ambiguousUnits.has(targetUnit)) return refused(operation, "ambiguous-unit");
  const value = parseCanonicalDecimal(quantity.value ?? "");
  if (typeof value === "string") return refused(operation, value, `${pointer}/value`);
  const converted = convert(value, quantity.unit ?? "", targetUnit);
  if (typeof converted === "string") {
    const problemPointer = converted === "unknown-unit" && knownUnit(quantity.unit ?? "") ? undefined : `${pointer}/unit`;
    return refused(operation, converted, problemPointer);
  }
  const formatted = formatCanonicalDecimal(converted);
  if (formatted === "resource-limit") return refused(operation, formatted, `${pointer}/value`);
  return {
    operation,
    status: "ok",
    result: { quantity: { kind: "measured", value: formatted, unit: targetUnit } },
  };
}

type EffectiveQuantity = { ingredient: string; quantity: Quantity };

function positiveDecimal(raw: string): Rational | "invalid-decimal" | "resource-limit" {
  const value = parseCanonicalDecimal(raw);
  if (typeof value === "string") return value;
  return value.numerator > 0n ? value : "invalid-decimal";
}

export function resolveFormula(formula: Formula, pointer: string): Envelope {
  return resolveFormulaExact(formula, pointer, integer(1n));
}

function resolveFormulaExact(formula: Formula, pointer: string, anchorFactor: Rational): Envelope {
  const operation = "resolve_formula";
  const quantities: EffectiveQuantity[] = [];
  if (formula.kind === "ratio") {
    if (!formula.target) return refused(operation, "missing-fact", `${pointer}/target`);
    if (formula.target.kind !== "measured") return refused(operation, "unsupported-quantity-kind", `${pointer}/target`);
    let target = parseCanonicalDecimal(formula.target.value ?? "");
    if (typeof target === "string") return refused(operation, target, `${pointer}/target/value`);
    if (formula.target.scaling !== "fixed") target = multiply(target, anchorFactor);
    const parts: Rational[] = [];
    let total = integer(0n);
    for (const [index, term] of formula.terms.entries()) {
      const part = positiveDecimal(term.parts ?? "");
      if (typeof part === "string") return refused(operation, part, `${pointer}/terms/${index}/parts`);
      parts.push(part);
      total = add(total, part);
    }
    if (parts.length === 0 || total.numerator <= 0n) return refused(operation, "invalid-operation-arguments", `${pointer}/terms`);
    for (const [index, term] of formula.terms.entries()) {
      const value = formatCanonicalDecimal(divide(multiply(target, parts[index]), total));
      if (value === "resource-limit") return refused(operation, value, `${pointer}/terms/${index}/parts`);
      quantities.push({ ingredient: term.ingredient, quantity: { kind: "measured", value, unit: formula.target.unit } });
    }
  } else if (formula.kind === "percentage") {
    const basisIndexes = formula.terms
      .map((term, index) => term.ingredient === formula.basis ? index : -1)
      .filter((index) => index >= 0);
    if (basisIndexes.length !== 1) return refused(operation, "invalid-operation-arguments", `${pointer}/terms`);
    const basisIndex = basisIndexes[0];
    if (formula.terms[basisIndex].percentage !== "100") {
      return refused(operation, "invalid-operation-arguments", `${pointer}/terms/${basisIndex}/percentage`);
    }
    if (!formula.basis_quantity) return refused(operation, "missing-fact", `${pointer}/basis_quantity`);
    if (formula.basis_quantity.kind !== "measured") {
      return refused(operation, "unsupported-quantity-kind", `${pointer}/basis_quantity`);
    }
    let basis = parseCanonicalDecimal(formula.basis_quantity.value ?? "");
    if (typeof basis === "string") return refused(operation, basis, `${pointer}/basis_quantity/value`);
    if (formula.basis_quantity.scaling !== "fixed") basis = multiply(basis, anchorFactor);
    for (const [index, term] of formula.terms.entries()) {
      const percentage = positiveDecimal(term.percentage ?? "");
      if (typeof percentage === "string") return refused(operation, percentage, `${pointer}/terms/${index}/percentage`);
      const value = formatCanonicalDecimal(divide(multiply(basis, percentage), integer(100n)));
      if (value === "resource-limit") return refused(operation, value, `${pointer}/terms/${index}/percentage`);
      quantities.push({
        ingredient: term.ingredient,
        quantity: { kind: "measured", value, unit: formula.basis_quantity.unit },
      });
    }
  } else {
    return refused(operation, "invalid-operation-arguments", `${pointer}/kind`);
  }
  return { operation, status: "ok", result: { quantities } };
}

function scaledDecimal(raw: string, factor: Rational): string | "invalid-decimal" | "resource-limit" {
  const value = parseCanonicalDecimal(raw);
  if (typeof value === "string") return value;
  return formatCanonicalDecimal(multiply(value, factor));
}

function scaleMeasured(quantity: Quantity, factor: Rational, pointer: string): Quantity | Envelope {
  const value = scaledDecimal(quantity.value ?? "", factor);
  if (value === "invalid-decimal" || value === "resource-limit") return refused("scale", value, `${pointer}/value`);
  return { ...quantity, value };
}

function scaleQuantity(quantity: Quantity, factor: Rational, pointer: string): Quantity | Envelope {
  if (quantity.kind === "measured") {
    return quantity.scaling === "fixed" ? { ...quantity } : scaleMeasured(quantity, factor, pointer);
  }
  if (quantity.kind === "range") {
    const minimum = scaledDecimal(quantity.minimum ?? "", factor);
    if (minimum === "invalid-decimal" || minimum === "resource-limit") return refused("scale", minimum, `${pointer}/minimum`);
    const maximum = scaledDecimal(quantity.maximum ?? "", factor);
    if (maximum === "invalid-decimal" || maximum === "resource-limit") return refused("scale", maximum, `${pointer}/maximum`);
    return { ...quantity, minimum, maximum };
  }
  if (quantity.kind === "open") return structuredClone(quantity);
  return refused("scale", "unsupported-quantity-kind", pointer);
}

function isEnvelope(value: Quantity | Envelope): value is Envelope {
  return "operation" in value;
}

export function scale(recipe: Recipe, factorRaw: string): Envelope {
  const operation = "scale";
  const factor = positiveDecimal(factorRaw);
  if (typeof factor === "string") return refused(operation, "invalid-operation-arguments", "/factor");

  const formulaQuantities = new Map<string, Quantity>();
  if (recipe.formula) {
    const resolved = resolveFormulaExact(recipe.formula, "/formula", factor);
    if (resolved.status !== "ok") return { ...resolved, operation };
    for (const item of (resolved.result as { quantities: EffectiveQuantity[] }).quantities) {
      formulaQuantities.set(item.ingredient, item.quantity);
    }
  }

  const quantities: EffectiveQuantity[] = [];
  for (const [index, ingredient] of recipe.ingredients.entries()) {
    const formulaQuantity = formulaQuantities.get(ingredient.id);
    if (formulaQuantity) {
      quantities.push({ ingredient: ingredient.id, quantity: formulaQuantity });
      continue;
    }
    if (!ingredient.quantity) return refused(operation, "missing-fact", `/ingredients/${index}/quantity`);
    const quantity = scaleQuantity(ingredient.quantity, factor, `/ingredients/${index}/quantity`);
    if (isEnvelope(quantity)) return quantity;
    quantities.push({ ingredient: ingredient.id, quantity });
  }
  return { operation, status: "ok", result: { quantities } };
}

function topologicalOrder(steps: Step[]): number[] | Problem {
  const indexById = new Map<string, number>();
  for (const [index, step] of steps.entries()) {
    if (indexById.has(step.id)) return { type: `${PROBLEM_BASE}invalid-document`, pointer: `/steps/${index}/id` };
    indexById.set(step.id, index);
  }
  const indegree = steps.map(() => 0);
  const dependents = steps.map((): number[] => []);
  for (const [index, step] of steps.entries()) {
    for (const dependency of step.after ?? []) {
      const dependencyIndex = indexById.get(dependency);
      if (dependencyIndex === undefined) {
        return { type: `${PROBLEM_BASE}unresolved-reference`, pointer: `/steps/${index}/after` };
      }
      indegree[index] += 1;
      dependents[dependencyIndex].push(index);
    }
  }
  const used = steps.map(() => false);
  const order: number[] = [];
  while (order.length < steps.length) {
    const selected = steps.findIndex((_, index) => !used[index] && indegree[index] === 0);
    if (selected === -1) return { type: `${PROBLEM_BASE}invalid-document`, pointer: "/steps" };
    used[selected] = true;
    order.push(selected);
    for (const dependent of dependents[selected]) indegree[dependent] -= 1;
  }
  return order;
}

export function readingOrder(steps: Step[]): Envelope {
  const order = topologicalOrder(steps);
  if (!Array.isArray(order)) return { operation: "reading_order", status: "refused", problems: [order] };
  return { operation: "reading_order", status: "ok", result: { steps: order.map((index) => steps[index].id) } };
}

const durationPattern = /^P(?:(?:([1-9][0-9]*)W)|(?:([1-9][0-9]*)D)?(?:T(?:([1-9][0-9]*)H)?(?:([1-9][0-9]*)M)?(?:([1-9][0-9]*)S)?)?)$/;

function parseDuration(raw: string): bigint | null {
  const match = durationPattern.exec(raw);
  if (!match) return null;
  const units = [604800n, 86400n, 3600n, 60n, 1n];
  let seconds = 0n;
  for (let index = 0; index < units.length; index += 1) {
    if (match[index + 1]) seconds += BigInt(match[index + 1]) * units[index];
  }
  return seconds > 0n ? seconds : null;
}

function stepDuration(value: unknown): bigint | "missing-fact" | "invalid-operation-arguments" {
  if (value === undefined || value === null) return "missing-fact";
  if (typeof value === "string") return parseDuration(value) ?? "invalid-operation-arguments";
  if (typeof value !== "object" || Array.isArray(value)) return "invalid-operation-arguments";
  const window = value as Record<string, unknown>;
  const windowProblem = validateDurationWindow(window);
  if (windowProblem) return windowProblem;
  const parsed = new Map<string, bigint>();
  for (const field of ["minimum", "target", "maximum"] as const) {
    if (!Object.hasOwn(window, field)) continue;
    if (typeof window[field] !== "string") return "invalid-operation-arguments";
    const duration = parseDuration(window[field]);
    if (duration === null) return "invalid-operation-arguments";
    parsed.set(field, duration);
  }
  for (const [leftName, rightName] of [["minimum", "target"], ["target", "maximum"], ["minimum", "maximum"]] as const) {
    const left = parsed.get(leftName);
    const right = parsed.get(rightName);
    if (left !== undefined && right !== undefined && left > right) return "invalid-operation-arguments";
  }
  return parsed.get("target") ?? "missing-fact";
}

export function validateDurationWindow(value: unknown): "invalid-operation-arguments" | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const window = value as Record<string, unknown>;
  const parsed = new Map<string, bigint>();
  for (const field of ["minimum", "target", "maximum"] as const) {
    if (!Object.hasOwn(window, field)) continue;
    if (typeof window[field] !== "string") return "invalid-operation-arguments";
    const duration = parseDuration(window[field]);
    if (duration === null) return "invalid-operation-arguments";
    parsed.set(field, duration);
  }
  for (const [leftName, rightName] of [["minimum", "target"], ["target", "maximum"], ["minimum", "maximum"]] as const) {
    const left = parsed.get(leftName);
    const right = parsed.get(rightName);
    if (left !== undefined && right !== undefined && left > right) return "invalid-operation-arguments";
  }
  return null;
}

function formatElapsed(seconds: bigint): string {
  if (seconds === 0n) return "PT0S";
  if (seconds % 604800n === 0n) return `P${seconds / 604800n}W`;
  const days = seconds / 86400n;
  let remaining = seconds % 86400n;
  const hours = remaining / 3600n;
  remaining %= 3600n;
  const minutes = remaining / 60n;
  remaining %= 60n;
  let output = "P";
  if (days) output += `${days}D`;
  if (hours || minutes || remaining) {
    output += "T";
    if (hours) output += `${hours}H`;
    if (minutes) output += `${minutes}M`;
    if (remaining) output += `${remaining}S`;
  }
  return output;
}

export function schedule(steps: Step[]): Envelope {
  const operation = "schedule";
  const order = topologicalOrder(steps);
  if (!Array.isArray(order)) return { operation, status: "refused", problems: [order] };
  const durations: bigint[] = [];
  for (const [index, step] of steps.entries()) {
    const duration = stepDuration(step.duration);
    if (typeof duration === "string") return refused(operation, duration, `/steps/${index}/duration`);
    durations.push(duration);
  }
  const indexById = new Map(steps.map((step, index) => [step.id, index]));
  const ends = steps.map(() => 0n);
  const result: Array<{ id: string; start: string; duration: string; end: string }> = [];
  for (const index of order) {
    let start = 0n;
    for (const dependency of steps[index].after ?? []) {
      const dependencyEnd = ends[indexById.get(dependency)!];
      if (dependencyEnd > start) start = dependencyEnd;
    }
    const end = start + durations[index];
    ends[index] = end;
    result.push({ id: steps[index].id, start: formatElapsed(start), duration: formatElapsed(durations[index]), end: formatElapsed(end) });
  }
  return { operation, status: "ok", result: { steps: result } };
}

type V1Dict = Record<string, unknown>;
type V1Effective = { value: unknown; source: "argument" | "default" };
type V1FormulaQuantity = { input: V1Dict; value: Rational; unit: string; active: boolean };
type V1FormulaEvaluation = {
  formula: V1Dict;
  quantities: V1FormulaQuantity[];
  authoredTotal: Rational;
  selectedTotal: Rational;
  unit: string;
};
type V1MethodNode = { kind: string; id: string; object: V1Dict; active: boolean; order: number };

const v1Object = (value: unknown): V1Dict | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as V1Dict : null;
const v1Objects = (value: unknown): V1Dict[] =>
  Array.isArray(value) ? value.map(v1Object).filter((item): item is V1Dict => item !== null) : [];
const v1Strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const v1Find = (value: unknown, id: string): V1Dict | null => v1Objects(value).find((item) => item.id === id) ?? null;
const v1Key = (reference: V1Dict): string => `${String(reference.kind ?? "")}\0${String(reference.id ?? "")}`;
const v1Path = (value: unknown): string => v1Strings(value).join("/");
const v1PathArray = (path: string): string[] => path === "" ? [] : path.split("/");
const v1JoinPath = (parent: string, child: string): string => parent ? `${parent}/${child}` : child;

class V1Context {
  readonly operation: string;
  readonly request: V1Dict;
  readonly root: V1Dict;
  readonly bundle: V1Dict | null;
  readonly selections = new Map<string, V1Dict>();
  readonly effective = new Map<string, Map<string, V1Effective>>();
  readonly effectiveAlternatives = new Map<string, Map<string, V1Effective>>();
  readonly problems: Problem[] = [];

  constructor(operation: string, request: V1Dict) {
    this.operation = operation;
    this.request = request;
    const recipe = v1Object(request.recipe);
    this.bundle = v1Object(request.bundle);
    if ((recipe === null) === (this.bundle === null)) throw new Error("invalid-root");
    if (recipe) {
      this.root = recipe;
    } else {
      const first = v1Object(v1Objects(this.bundle!.documents)[0]);
      const embedded = v1Object(first?.document);
      if (!embedded) throw new Error("invalid-root");
      this.root = embedded;
    }
    const argumentsValue = v1Object(request.arguments);
    if (!argumentsValue) throw new Error("invalid-arguments");
    for (const [index, selection] of v1Objects(argumentsValue.selections).entries()) {
      const path = v1Path(selection.component_path);
      if (this.selections.has(path)) this.addProblem("invalid-binding", `/arguments/selections/${index}/component_path`);
      else this.selections.set(path, selection);
    }
    this.validateSelections();
  }

  addProblem(code: string, pointer?: string): void {
    const problem = { type: `${PROBLEM_BASE}${code}`, ...(pointer === undefined ? {} : { pointer }) };
    if (!this.problems.some((item) => item.type === problem.type && item.pointer === problem.pointer)) this.problems.push(problem);
  }

  refusal(): Envelope {
    this.problems.sort((left, right) => asciiCompare(left.pointer ?? "", right.pointer ?? "") || asciiCompare(left.type, right.type));
    return { operation: this.operation, status: "refused", problems: this.problems };
  }

  recipeForPath(path: string): V1Dict | null {
    let recipe = this.root;
    if (!path) return recipe;
    for (const componentId of path.split("/")) {
      const component = v1Find(recipe.components, componentId);
      if (!component) return null;
      recipe = this.bundleRecipe(v1Object(component.recipe)!);
      if (!recipe) return null;
    }
    return recipe;
  }

  bundleRecipe(reference: V1Dict): V1Dict | null {
    if (!this.bundle) return null;
    for (const entry of v1Objects(this.bundle.documents)) {
      const document = v1Object(entry.document);
      if (!document || document.collection !== reference.collection || document.id !== reference.id || document.revision !== reference.revision) continue;
      if (digestJcs(document) !== reference.sha256 || entry.sha256 !== reference.sha256) return null;
      return document;
    }
    return null;
  }

  validateSelections(): void {
    if (this.selections.size > 1024) this.addProblem("resource-limit", "/arguments/selections");
    for (const [path, selection] of this.selections) {
      const recipe = this.recipeForPath(path);
      if (!recipe) { this.addProblem("invalid-binding", "/arguments/selections"); continue; }
      const bindings = v1Object(selection.bindings) ?? {};
      for (const [id, value] of Object.entries(bindings)) {
        const parameter = v1Find(recipe.parameters, id);
        if (!parameter || !validV1Binding(parameter, value)) this.addProblem("invalid-binding", "/arguments/selections");
      }
      const alternatives = v1Object(selection.alternatives) ?? {};
      for (const [id, value] of Object.entries(alternatives)) {
        const ingredient = v1Find(recipe.ingredients, id);
        const declaration = v1Object(ingredient?.alternatives);
        if (!declaration || typeof value !== "string" || !v1Find(declaration.options, value)) this.addProblem("invalid-binding", "/arguments/selections");
      }
    }
  }

  binding(path: string, parameter: V1Dict): [unknown, boolean] {
    let values = this.effective.get(path);
    if (!values) { values = new Map(); this.effective.set(path, values); }
    const id = String(parameter.id);
    const existing = values.get(id);
    if (existing) return [existing.value, true];
    const supplied = v1Object(this.selections.get(path)?.bindings);
    if (supplied && Object.hasOwn(supplied, id)) {
      const value = supplied[id]; values.set(id, { value, source: "argument" }); return [value, true];
    }
    if (Object.hasOwn(parameter, "default")) {
      values.set(id, { value: parameter.default, source: "default" }); return [parameter.default, true];
    }
    this.addProblem("missing-binding", "/arguments/selections");
    return [undefined, false];
  }

  alternative(path: string, ingredient: V1Dict, required: boolean): [string, boolean] {
    const declaration = v1Object(ingredient.alternatives);
    if (!declaration) return ["", true];
    let values = this.effectiveAlternatives.get(path);
    if (!values) { values = new Map(); this.effectiveAlternatives.set(path, values); }
    const id = String(ingredient.id);
    const supplied = v1Object(this.selections.get(path)?.alternatives);
    if (supplied && typeof supplied[id] === "string") {
      values.set(id, { value: supplied[id], source: "argument" }); return [supplied[id] as string, true];
    }
    if (typeof declaration.default === "string") {
      values.set(id, { value: declaration.default, source: "default" }); return [declaration.default, true];
    }
    if (required) this.addProblem("missing-binding", "/arguments/selections");
    return ["", !required];
  }

  active(recipe: V1Dict, path: string, object: V1Dict): boolean {
    const activation = v1Object(object.activation);
    if (!activation) return true;
    return this.activation(recipe, path, activation)[0];
  }

  activation(recipe: V1Dict, path: string, activation: V1Dict): [boolean, boolean] {
    const kind = String(activation.kind);
    if (["choice_is", "toggle_is", "measurement_compare"].includes(kind)) {
      const parameter = v1Find(recipe.parameters, String(activation.parameter));
      if (!parameter) { this.addProblem("invalid-binding", "/arguments/selections"); return [false, false]; }
      const [value, known] = this.binding(path, parameter);
      if (!known) return [false, false];
      if (kind === "choice_is") return [value === activation.option, true];
      if (kind === "toggle_is") return [value === activation.enabled, true];
      const bound = v1Object(value); const threshold = v1Object(activation.measurement);
      if (!bound || !threshold) { this.addProblem("invalid-binding", "/arguments/selections"); return [false, false]; }
      const left = parseCanonicalDecimal(String(bound.value ?? ""));
      let right = parseCanonicalDecimal(String(threshold.value ?? ""));
      if (typeof left === "string" || typeof right === "string") { this.addProblem("invalid-binding", "/arguments/selections"); return [false, false]; }
      right = convert(right, String(threshold.unit ?? ""), String(bound.unit ?? ""));
      if (typeof right === "string") { this.addProblem(right, "/arguments/selections"); return [false, false]; }
      const comparison = left.numerator * right.denominator < right.numerator * left.denominator ? -1 : left.numerator * right.denominator > right.numerator * left.denominator ? 1 : 0;
      const matches = activation.operator === "equal" ? comparison === 0
        : activation.operator === "less_than" ? comparison < 0
          : activation.operator === "less_than_or_equal" ? comparison <= 0
            : activation.operator === "greater_than" ? comparison > 0 : comparison >= 0;
      return [matches, true];
    }
    if (kind === "all" || kind === "any") {
      const values = v1Objects(activation.conditions);
      if (kind === "all") {
        for (const condition of values) { const result = this.activation(recipe, path, condition); if (!result[1]) return [false, false]; if (!result[0]) return [false, true]; }
        return [true, true];
      }
      for (const condition of values) { const result = this.activation(recipe, path, condition); if (!result[1]) return [false, false]; if (result[0]) return [true, true]; }
      return [false, true];
    }
    if (kind === "not") { const result = this.activation(recipe, path, v1Object(activation.condition)!); return [!result[0], result[1]]; }
    return [false, false];
  }

  method(recipe: V1Dict, path: string): V1MethodNode[] {
    const sequence = v1Objects(v1Object(recipe.method)?.sequence);
    const stack = [...sequence].reverse().map((object) => ({ object, parent: true }));
    const result: V1MethodNode[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      const active = current.parent && this.active(recipe, path, current.object);
      const node = { kind: String(current.object.kind), id: String(current.object.id), object: current.object, active, order: result.length };
      result.push(node);
      if (node.kind === "section") for (const child of [...v1Objects(current.object.sequence)].reverse()) stack.push({ object: child, parent: active });
    }
    return result;
  }

  formula(recipe: V1Dict, path: string, formula: V1Dict): V1FormulaEvaluation | null {
    const terms = v1Objects(formula.terms); const quantities: V1FormulaQuantity[] = [];
    let authoredTotal = integer(0n); let selectedTotal = integer(0n); let unit = "";
    if (formula.kind === "ratio") {
      const target = v1Object(formula.target); if (!target) { this.addProblem("missing-fact", "/recipe/formulas"); return null; }
      const targetValue = positiveDecimal(String(target.value ?? "")); if (typeof targetValue === "string") { this.addProblem(targetValue, "/recipe/formulas"); return null; }
      unit = String(target.unit); const parts: Rational[] = []; let total = integer(0n);
      for (const term of terms) { const part = positiveDecimal(String(term.parts ?? "")); if (typeof part === "string") { this.addProblem(part, "/recipe/formulas"); return null; } parts.push(part); total = add(total, part); }
      terms.forEach((term, index) => {
        const input = v1Object(term.input)!; const value = divide(multiply(targetValue, parts[index]), total);
        const object = v1Find(recipe[`${String(input.kind)}s`], String(input.id)); const active = object !== null && this.active(recipe, path, object);
        quantities.push({ input, value, unit, active }); authoredTotal = add(authoredTotal, value); if (active) selectedTotal = add(selectedTotal, value);
      });
    } else {
      const basisQuantity = v1Object(formula.basis_quantity); if (!basisQuantity) { this.addProblem("missing-fact", "/recipe/formulas"); return null; }
      const basis = positiveDecimal(String(basisQuantity.value ?? "")); if (typeof basis === "string") { this.addProblem(basis, "/recipe/formulas"); return null; }
      unit = String(basisQuantity.unit); const basisRef = v1Object(formula.basis)!; const basisObject = v1Find(recipe[`${String(basisRef.kind)}s`], String(basisRef.id)); const basisActive = basisObject !== null && this.active(recipe, path, basisObject);
      for (const term of terms) {
        const percentage = positiveDecimal(String(term.percentage ?? "")); if (typeof percentage === "string") { this.addProblem(percentage, "/recipe/formulas"); return null; }
        const input = v1Object(term.input)!; const value = divide(multiply(basis, percentage), integer(100n)); const object = v1Find(recipe[`${String(input.kind)}s`], String(input.id)); const active = object !== null && this.active(recipe, path, object);
        quantities.push({ input, value, unit, active }); authoredTotal = add(authoredTotal, value); if (active) selectedTotal = add(selectedTotal, value);
      }
      if (!basisActive && selectedTotal.numerator > 0n) this.addProblem("inactive-reference", "/recipe/formulas");
    }
    return { formula, quantities, authoredTotal, selectedTotal, unit };
  }

  evaluation(): V1Dict {
    const result: V1Dict = { recipe: recipeIdentityV1(this.root), selections: this.effectiveSelection() };
    if (this.bundle) result.bundle_sha256 = digestJcs(this.bundle);
    return result;
  }

  effectiveSelection(): unknown[] {
    const paths = [...new Set([...this.effective.keys(), ...this.effectiveAlternatives.keys()])].sort();
    return paths.map((path) => {
      const recipe = this.recipeForPath(path)!; const values = this.effective.get(path) ?? new Map(); const alternatives = this.effectiveAlternatives.get(path) ?? new Map();
      return {
        component_path: v1PathArray(path),
        bindings: v1Objects(recipe.parameters).flatMap((parameter) => { const value = values.get(String(parameter.id)); return value ? [{ parameter: parameter.id, value: value.value, source: value.source }] : []; }),
        alternatives: v1Objects(recipe.ingredients).flatMap((ingredient) => { const value = alternatives.get(String(ingredient.id)); return value ? [{ ingredient: ingredient.id, option: value.value, source: value.source }] : []; }),
      };
    });
  }
}

export function evaluateRequest(operation: string, request: V1Dict): Envelope {
  if (operation === "convert_quantity") {
    const argumentsValue = v1Object(request.arguments) ?? {};
    return convertQuantity(argumentsValue.quantity as Quantity, String(argumentsValue.target_unit ?? ""), "/arguments/quantity");
  }
  let context: V1Context;
  try { context = new V1Context(operation, request); } catch { return refused(operation, "invalid-operation-arguments"); }
  if (context.problems.length) return context.refusal();
  let envelope: Envelope;
  if (operation === "resolve_selection") envelope = v1ResolveSelection(context);
  else if (operation === "resolve_formula") envelope = v1ResolveFormula(context);
  else if (operation === "scale") envelope = v1Scale(context);
  else if (operation === "reading_order" || operation === "schedule") envelope = v1MethodOperation(context, operation === "schedule");
  else return refused(operation, "invalid-operation-arguments", "/operation");
  if (envelope.status === "ok") envelope.evaluation = context.evaluation();
  return envelope;
}

/** Proves the accepted graph invariants for every distinct activation region. */
export function validateReachableGraphs(recipe: V1Dict): Problem[] {
  const parameters = v1Objects(recipe.parameters);
  const candidates = parameters.map((parameter) => v1ParameterCandidates(recipe, parameter));
  if (candidates.some((values) => values.length === 0)) return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: "/parameters" }];
  const objectCount = Math.max(1, v1SemanticObjectCount(recipe));
  const graphBudget = Math.floor(10000 / objectCount);
  if (graphBudget < 1) return [{ type: `${PROBLEM_BASE}resource-limit`, pointer: "" }];
  const alternatives: V1Dict = {};
  for (const ingredient of v1Objects(recipe.ingredients)) {
    const declaration = v1Object(ingredient.alternatives); if (!declaration) continue;
    alternatives[String(ingredient.id)] = typeof declaration.default === "string" ? declaration.default : v1Objects(declaration.options)[0]?.id;
  }
  const distinct = new Set<string>(); const problems: Problem[] = []; const bindings: V1Dict = {};
  const explore = (index: number): boolean => {
    if (index < parameters.length) {
      const id = String(parameters[index].id);
      for (const candidate of candidates[index]) { bindings[id] = candidate; if (!explore(index + 1)) return false; }
      delete bindings[id]; return true;
    }
    const context = new V1Context("resolve_selection", { recipe, arguments: { selections: [{ component_path: [], bindings: { ...bindings }, alternatives }] } });
    if (context.problems.length) { problems.push(...context.problems); return true; }
    const nodes = context.method(recipe, ""); const signature = v1GraphSignature(context, recipe, nodes);
    if (distinct.has(signature)) return true;
    if (distinct.size >= graphBudget) { problems.push({ type: `${PROBLEM_BASE}resource-limit` }); return false; }
    distinct.add(signature); problems.push(...v1ValidateActiveGraph(context, recipe, nodes)); return true;
  };
  explore(0);
  const seen = new Set<string>();
  return problems
    .sort((left, right) => asciiCompare(left.pointer ?? "", right.pointer ?? "") || asciiCompare(left.type, right.type))
    .filter((item) => { const key = `${item.pointer ?? ""}\0${item.type}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

function v1ParameterCandidates(recipe: V1Dict, parameter: V1Dict): unknown[] {
  if (parameter.kind === "choice") return v1Objects(parameter.options).map((option) => option.id);
  if (parameter.kind === "toggle") return [false, true];
  if (parameter.kind !== "measurement") return [];
  const thresholds: V1Dict[] = []; const stack: unknown[] = [recipe];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) { stack.push(...current); continue; }
    const record = v1Object(current); if (!record) continue;
    if (record.kind === "measurement_compare" && record.parameter === parameter.id) { const measurement = v1Object(record.measurement); if (measurement) thresholds.push(measurement); }
    stack.push(...Object.values(record));
  }
  if (!thresholds.length) return Object.hasOwn(parameter, "default") ? [parameter.default] : [{ kind: "measured", value: "0", unit: parameter.unit }];
  const result: unknown[] = []; const seen = new Set<string>(); const quantum = rational(1n, 10000n);
  for (const threshold of thresholds) {
    const exact = parseCanonicalDecimal(String(threshold.value)); if (typeof exact === "string") continue;
    for (const candidate of [subtract(exact, quantum), exact, add(exact, quantum)]) {
      const value = formatCanonicalDecimal(candidate); if (value === "resource-limit") continue;
      const key = `${String(threshold.unit)}\0${value}`; if (seen.has(key)) continue; seen.add(key);
      result.push({ kind: "measured", value, unit: threshold.unit });
    }
  }
  return result;
}

function v1SemanticObjectCount(value: unknown): number {
  let count = 0; const stack = [value];
  while (stack.length) { const current = stack.pop(); if (Array.isArray(current)) stack.push(...current); else { const record = v1Object(current); if (record) { count += 1; stack.push(...Object.values(record)); } } }
  return count;
}

function v1GraphSignature(context: V1Context, recipe: V1Dict, nodes: V1MethodNode[]): string {
  const parts: string[] = [];
  for (const collection of ["ingredients", "components", "equipment"]) for (const item of v1Objects(recipe[collection])) if (context.active(recipe, "", item)) parts.push(`${collection}:${String(item.id)}`);
  for (const node of nodes) if (node.active) {
    parts.push(`node:${node.kind}:${node.id}`);
    if (node.kind === "step") {
      for (const action of v1Objects(node.object.actions)) if (context.active(recipe, "", action)) parts.push(`action:${node.id}:${String(action.id)}`);
      for (const id of v1Strings(node.object.after)) if (nodes.some((candidate) => candidate.active && candidate.id === id)) parts.push(`after:${id}>${node.id}`);
      for (const field of ["uses", "produces"]) for (const reference of v1Objects(node.object[field])) parts.push(`${field}:${node.id}:${v1Key(reference)}`);
    }
  }
  for (const formula of v1Objects(recipe.formulas)) for (const term of v1Objects(formula.terms)) { const input = v1Object(term.input)!; const target = v1Find(recipe[`${String(input.kind)}s`], String(input.id)); if (target && context.active(recipe, "", target)) parts.push(`formula:${String(formula.id)}:${v1Key(input)}`); }
  return parts.join("|");
}

function v1ValidateActiveGraph(context: V1Context, recipe: V1Dict, nodes: V1MethodNode[]): Problem[] {
  const problems: Problem[] = []; const resources = new Set<string>();
  for (const collection of ["ingredients", "components", "equipment"]) for (const item of v1Objects(recipe[collection])) if (context.active(recipe, "", item)) resources.add(v1Key({ kind: collection === "equipment" ? "equipment" : collection.slice(0, -1), id: item.id }));
  for (const collection of ["preparations", "outputs"]) for (const item of v1Objects(recipe[collection])) resources.add(v1Key({ kind: collection === "preparations" ? "preparation" : "output", id: item.id }));
  const activeSteps = nodes.filter((node) => node.kind === "step" && node.active); const stepIds = new Set(activeSteps.map((node) => node.id));
  const edges = new Map<string, string[]>(); const timingEdges = new Map<string, string[]>(); const producers = new Map<string, number>(); const consumers = new Set<string>();
  for (const node of nodes.filter((candidate) => candidate.active)) {
    const timing = v1Object(node.object.relative_timing); if (!timing) continue;
    const anchor = String(timing.anchor_step);
    if (!stepIds.has(anchor)) { problems.push({ type: `${PROBLEM_BASE}inactive-reference`, pointer: "/method" }); continue; }
    const from = timing.relation === "before" ? node.id : anchor; const to = timing.relation === "before" ? anchor : node.id;
    const children = timingEdges.get(from) ?? []; children.push(to); timingEdges.set(from, children);
  }
  for (const node of activeSteps) {
    if (Array.isArray(node.object.actions) && !v1Objects(node.object.actions).some((action) => context.active(recipe, "", action))) problems.push({ type: `${PROBLEM_BASE}missing-fact`, pointer: "/method" });
    const after: string[] = [];
    for (const dependency of v1Strings(node.object.after)) {
      if (stepIds.has(dependency)) { after.push(dependency); const children = timingEdges.get(dependency) ?? []; children.push(node.id); timingEdges.set(dependency, children); }
    }
    edges.set(node.id, after);
    for (const field of ["uses", "produces"] as const) for (const reference of v1Objects(node.object[field])) {
      const key = v1Key(reference); if (!resources.has(key)) { problems.push({ type: `${PROBLEM_BASE}inactive-reference`, pointer: "/method" }); continue; }
      if (field === "produces") producers.set(key, (producers.get(key) ?? 0) + 1); else if (reference.kind === "preparation") consumers.add(key);
    }
  }
  if (v1StringGraphCycle(edges)) problems.push({ type: `${PROBLEM_BASE}dependency-cycle`, pointer: "/method" });
  if (v1StringGraphCycle(timingEdges)) problems.push({ type: `${PROBLEM_BASE}relative-timing-conflict`, pointer: "/method" });
  for (const [key, count] of producers) if (count > 1) problems.push({ type: `${PROBLEM_BASE}multiple-producers`, pointer: v1ResourcePointer(key) });
  for (const key of consumers) if (!producers.has(key)) problems.push({ type: `${PROBLEM_BASE}missing-producer`, pointer: v1ResourcePointer(key) });
  return problems;
}

function v1StringGraphCycle(edges: Map<string, string[]>): boolean {
  const state = new Map<string, number>();
  const visit = (node: string): boolean => { if (state.get(node) === 1) return true; if (state.get(node) === 2) return false; state.set(node, 1); for (const child of edges.get(node) ?? []) if (visit(child)) return true; state.set(node, 2); return false; };
  return [...edges.keys()].some(visit);
}

function v1ResourcePointer(key: string): string { const [kind, id] = key.split("\0"); const collection = kind === "equipment" ? "equipment" : kind === "preparation" ? "preparations" : `${kind}s`; return `/${collection}/${id}`; }

function v1ResolveSelection(context: V1Context): Envelope {
  const instances: unknown[] = []; const visiting = new Set<string>();
  const visit = (recipe: V1Dict, path: string): boolean => {
    const reference = documentReferenceV1(recipe); if (visiting.has(reference)) { context.addProblem("component-cycle", "/bundle/documents"); return false; } visiting.add(reference);
    for (const parameter of v1Objects(recipe.parameters)) context.binding(path, parameter);
    for (const ingredient of v1Objects(recipe.ingredients)) { context.active(recipe, path, ingredient); context.alternative(path, ingredient, true); }
    const nodes = context.method(recipe, path); const method: unknown[] = []; const actions: unknown[] = [];
    for (const node of nodes) if (node.active) {
      method.push({ kind: node.kind, id: node.id });
      if (node.kind === "step" && Array.isArray(node.object.actions)) {
        const activeActions = v1Objects(node.object.actions).filter((action) => context.active(recipe, path, action)).map((action) => action.id);
        if (!activeActions.length) context.addProblem("missing-fact", "/recipe/method"); else actions.push({ step: node.id, actions: activeActions });
      }
    }
    instances.push({ component_path: v1PathArray(path), recipe: recipeIdentityV1(recipe), ingredients: activeIdsV1(context, recipe, path, recipe.ingredients), components: activeIdsV1(context, recipe, path, recipe.components), equipment: activeIdsV1(context, recipe, path, recipe.equipment), method, actions });
    for (const component of v1Objects(recipe.components)) if (context.active(recipe, path, component)) {
      const child = context.bundleRecipe(v1Object(component.recipe)!); if (!child) { context.addProblem("unresolved-reference", "/bundle/documents"); return false; }
      if (!visit(child, v1JoinPath(path, String(component.id)))) return false;
    }
    visiting.delete(reference); return true;
  };
  visit(context.root, "");
  return context.problems.length ? context.refusal() : { operation: context.operation, status: "ok", result: { active_instances: instances } };
}

function v1ResolveFormula(context: V1Context): Envelope {
  const argumentsValue = v1Object(context.request.arguments)!; const formula = v1Find(context.root.formulas, String(argumentsValue.formula_id ?? ""));
  if (!formula) return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_id");
  const evaluation = context.formula(context.root, "", formula); if (!evaluation) return context.refusal();
  if (evaluation.selectedTotal.numerator === 0n) return { operation: context.operation, status: "not_applicable" };
  const quantities = publicV1FormulaQuantities(evaluation, integer(1n)); if (!quantities) return context.refusal();
  return { operation: context.operation, status: "ok", formula_evaluations: [publicV1FormulaEvaluation("", evaluation)], result: { quantities } };
}

function v1Scale(context: V1Context): Envelope {
  const argumentsValue = v1Object(context.request.arguments)!; const hasFactor = typeof argumentsValue.factor === "string"; const target = v1Object(argumentsValue.formula_target);
  if (hasFactor === (target !== null)) return refused(context.operation, "invalid-operation-arguments", "/arguments");
  let factor: Rational;
  if (hasFactor) { const parsed = positiveDecimal(String(argumentsValue.factor)); if (typeof parsed === "string") return refused(context.operation, "invalid-operation-arguments", "/arguments/factor"); factor = parsed; }
  else {
    const formula = v1Find(context.root.formulas, String(target!.formula_id ?? "")); if (!formula) return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_target/formula_id");
    const evaluation = context.formula(context.root, "", formula); if (!evaluation || evaluation.selectedTotal.numerator <= 0n) return context.problems.length ? context.refusal() : refused(context.operation, "missing-fact", "/arguments/formula_target/formula_id");
    const quantity = v1Object(target!.quantity); if (!quantity || quantity.kind !== "measured") return refused(context.operation, "unsupported-quantity-kind", "/arguments/formula_target/quantity");
    const value = positiveDecimal(String(quantity.value ?? "")); if (typeof value === "string") return refused(context.operation, value, "/arguments/formula_target/quantity/value");
    const converted = convert(value, String(quantity.unit ?? ""), evaluation.unit); if (typeof converted === "string") return refused(context.operation, converted, "/arguments/formula_target/quantity/unit");
    if (v1AnchorFixed(formula) && (converted.numerator * evaluation.selectedTotal.denominator !== evaluation.selectedTotal.numerator * converted.denominator)) return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_target");
    factor = divide(converted, evaluation.selectedTotal);
  }
  const scaled = scaleV1Instance(context, context.root, "", factor, new Set([documentReferenceV1(context.root)]));
  if ("status" in scaled) return scaled;
  if (!scaled.quantities.length) return { operation: context.operation, status: "not_applicable" };
  return { operation: context.operation, status: "ok", ...(scaled.formulaEvaluations.length ? { formula_evaluations: scaled.formulaEvaluations } : {}), result: { quantities: scaled.quantities, component_instances: scaled.instances } };
}

type V1ScaledInstance = { quantities: unknown[]; instances: unknown[]; formulaEvaluations: unknown[] };
function scaleV1Instance(context: V1Context, recipe: V1Dict, path: string, factor: Rational, visiting: Set<string>): V1ScaledInstance | Envelope {
  const formulaValues = new Map<string, { quantity: Quantity; exact: Rational; unit: string }>(); const formulaEvaluations: unknown[] = [];
  for (const formula of v1Objects(recipe.formulas)) {
    const evaluation = context.formula(recipe, path, formula); if (!evaluation) return context.refusal(); if (evaluation.selectedTotal.numerator === 0n) continue;
    const applied = v1AnchorFixed(formula) ? integer(1n) : factor;
    for (const item of evaluation.quantities) if (item.active) { const exact = multiply(item.value, applied); const value = formatCanonicalDecimal(exact); if (value === "resource-limit") return refused(context.operation, value, "/recipe/formulas"); formulaValues.set(v1Key(item.input), { quantity: { kind: "measured", value, unit: item.unit }, exact, unit: item.unit }); }
    formulaEvaluations.push(publicV1FormulaEvaluation(path, evaluation, applied));
  }
  const quantities: unknown[] = []; const instances: unknown[] = [];
  for (const [kind, collection] of [["ingredient", "ingredients"], ["component", "components"]] as const) for (const [index, item] of v1Objects(recipe[collection]).entries()) {
    if (!context.active(recipe, path, item)) continue;
    const input = { kind, id: item.id }; let resolved = formulaValues.get(v1Key(input));
    if (!resolved) {
      const raw = v1Object(item.quantity); if (!raw) return refused(context.operation, "missing-fact", `/recipe/${collection}/${index}/quantity`);
      if (kind === "component" && raw.kind !== "measured") return refused(context.operation, "unsupported-quantity-kind", `/recipe/${collection}/${index}/quantity`);
      const scaled = scaleQuantity(raw as Quantity, factor, `/recipe/${collection}/${index}/quantity`); if (isEnvelope(scaled)) return scaled;
      let exact = integer(0n); if (raw.kind === "measured") { const parsed = parseCanonicalDecimal(String(raw.value)); if (typeof parsed === "string") return refused(context.operation, parsed, `/recipe/${collection}/${index}/quantity/value`); exact = raw.scaling === "fixed" ? parsed : multiply(parsed, factor); }
      resolved = { quantity: scaled, exact, unit: String(raw.unit ?? "") };
    }
    quantities.push({ input, quantity: resolved.quantity });
    if (kind === "component") {
      const child = context.bundleRecipe(v1Object(item.recipe)!); if (!child) return refused(context.operation, "unresolved-reference", "/bundle/documents");
      const output = v1Find(child.outputs, String(item.output)); const yieldValue = v1Object(output?.yield); if (!yieldValue || yieldValue.kind !== "measured") return refused(context.operation, "missing-fact", `/recipe/components/${index}/output`);
      const parsedYield = positiveDecimal(String(yieldValue.value)); if (typeof parsedYield === "string") return refused(context.operation, parsedYield, `/recipe/components/${index}/output`);
      const required = convert(resolved.exact, resolved.unit, String(yieldValue.unit)); if (typeof required === "string") return refused(context.operation, required, `/recipe/components/${index}/quantity/unit`);
      const childFactor = divide(required, parsedYield); const reference = documentReferenceV1(child); if (visiting.has(reference)) return refused(context.operation, "component-cycle", `/recipe/components/${index}/recipe`);
      visiting.add(reference); const childPath = v1JoinPath(path, String(item.id)); const childScaled = scaleV1Instance(context, child, childPath, childFactor, visiting); visiting.delete(reference); if ("status" in childScaled) return childScaled;
      instances.push({ component_path: v1PathArray(childPath), recipe: item.recipe, output: item.output, quantity: resolved.quantity, quantities: childScaled.quantities }, ...childScaled.instances);
      formulaEvaluations.push(...childScaled.formulaEvaluations);
    }
  }
  return { quantities, instances, formulaEvaluations };
}

function v1MethodOperation(context: V1Context, scheduleMode: boolean): Envelope {
  return scheduleMode ? composedScheduleV1(context) : composedReadingV1(context);
}

type V1ComposedStep = { path: string; id: string; after: string[]; duration: bigint; start: bigint; end: bigint; order: number; object: V1Dict };
function v1StepKey(path: string, id: string): string { return `${path}\0${id}`; }

function composedReadingV1(context: V1Context): Envelope {
  const collected = collectReadingV1(context, context.root, "", new Set()); if ("type" in collected) return { operation: context.operation, status: "refused", problems: [collected] };
  if (!collected.steps.length) return refused(context.operation, "missing-fact", "/recipe/method/sequence");
  const index = new Map(collected.steps.map((step, position) => [v1StepKey(step.path, step.id), position])); const indegree = collected.steps.map(() => 0); const dependents = collected.steps.map((): number[] => []);
  for (const [position, step] of collected.steps.entries()) for (const dependency of step.after) { const dependencyIndex = index.get(dependency); if (dependencyIndex === undefined) return refused(context.operation, "unresolved-reference", "/recipe/method"); indegree[position] += 1; dependents[dependencyIndex].push(position); }
  const used = collected.steps.map(() => false); const result: unknown[] = [];
  while (result.length < collected.steps.length) { let selected = -1; for (const [position, step] of collected.steps.entries()) if (!used[position] && indegree[position] === 0 && (selected < 0 || step.order < collected.steps[selected].order)) selected = position; if (selected < 0) return refused(context.operation, "dependency-cycle", "/recipe/method"); used[selected] = true; result.push({ component_path: v1PathArray(collected.steps[selected].path), id: collected.steps[selected].id }); for (const dependent of dependents[selected]) indegree[dependent] -= 1; }
  return { operation: context.operation, status: "ok", result: { steps: result, unplaced_components: collected.notices } };
}

function collectReadingV1(context: V1Context, recipe: V1Dict, path: string, visiting: Set<string>): { steps: V1ComposedStep[]; notices: unknown[] } | Problem {
  const reference = documentReferenceV1(recipe); if (visiting.has(reference)) return { type: `${PROBLEM_BASE}component-cycle`, pointer: "/bundle/documents" }; visiting.add(reference);
  const nodes = context.method(recipe, path); const roots: V1ComposedStep[] = []; const byId = new Map<string, V1ComposedStep>();
  for (const node of nodes) if (node.kind === "step" && node.active) { const step: V1ComposedStep = { path, id: node.id, after: v1Strings(node.object.after).filter((id) => nodes.some((candidate) => candidate.id === id && candidate.active)).map((id) => v1StepKey(path, id)), duration: 0n, start: 0n, end: 0n, order: 0, object: node.object }; roots.push(step); byId.set(node.id, step); }
  const all: V1ComposedStep[] = []; const notices: unknown[] = [];
  for (const component of v1Objects(recipe.components)) if (context.active(recipe, path, component)) { const consumers = componentConsumersV1(nodes, String(component.id)); const childPath = v1JoinPath(path, String(component.id)); if (!consumers.length) { notices.push({ component_path: v1PathArray(childPath), reason: "not-consumed" }); continue; } const child = context.bundleRecipe(v1Object(component.recipe)!); if (!child) return { type: `${PROBLEM_BASE}unresolved-reference`, pointer: "/bundle/documents" }; const collected = collectReadingV1(context, child, childPath, visiting); if ("type" in collected) return collected; const producer = outputProducerV1(context, child, childPath, String(component.output)); if (typeof producer !== "string") return producer; for (const consumer of consumers) byId.get(consumer)!.after.push(v1StepKey(childPath, producer)); all.push(...collected.steps); notices.push(...collected.notices); }
  all.push(...roots); all.forEach((step, index) => { step.order = index; }); visiting.delete(reference); return { steps: all, notices };
}

function composedScheduleV1(context: V1Context): Envelope {
  const collected = collectScheduleV1(context, context.root, "", new Set()); if ("type" in collected) return { operation: context.operation, status: "refused", problems: [collected] };
  if (!collected.steps.length) return refused(context.operation, "missing-fact", "/recipe/method/sequence"); let minimum = collected.steps[0].start; for (const step of collected.steps) if (step.start < minimum) minimum = step.start; for (const step of collected.steps) { step.start -= minimum; step.end -= minimum; }
  collected.steps.sort((left, right) => left.start < right.start ? -1 : left.start > right.start ? 1 : left.order - right.order);
  return { operation: context.operation, status: "ok", result: { steps: collected.steps.map((step) => ({ component_path: v1PathArray(step.path), id: step.id, start: formatElapsed(step.start), duration: formatElapsed(step.duration), end: formatElapsed(step.end) })), unscheduled_components: collected.notices } };
}

function collectScheduleV1(context: V1Context, recipe: V1Dict, path: string, visiting: Set<string>): { steps: V1ComposedStep[]; notices: unknown[] } | Problem {
  const reference = documentReferenceV1(recipe); if (visiting.has(reference)) return { type: `${PROBLEM_BASE}component-cycle`, pointer: "/bundle/documents" }; visiting.add(reference);
  const local = localScheduleV1(context, recipe, path); if ("type" in local) return local; const nodes = context.method(recipe, path); const notices: unknown[] = [];
  for (const component of v1Objects(recipe.components)) if (context.active(recipe, path, component)) { const consumers = componentConsumersV1(nodes, String(component.id)); const childPath = v1JoinPath(path, String(component.id)); if (!consumers.length) { notices.push({ component_path: v1PathArray(childPath), reason: "not-consumed" }); continue; } const child = context.bundleRecipe(v1Object(component.recipe)!); if (!child) return { type: `${PROBLEM_BASE}unresolved-reference`, pointer: "/bundle/documents" }; const childSchedule = collectScheduleV1(context, child, childPath, visiting); if ("type" in childSchedule) return childSchedule; const producerId = outputProducerV1(context, child, childPath, String(component.output)); if (typeof producerId !== "string") return producerId; const producer = childSchedule.steps.find((step) => step.path === childPath && step.id === producerId); if (!producer) return { type: `${PROBLEM_BASE}missing-producer`, pointer: "/bundle/documents" }; const starts = consumers.map((id) => local.find((step) => step.id === id)!.start); const earliest = starts.reduce((left, right) => left < right ? left : right); const shift = earliest - producer.end; for (const step of childSchedule.steps) { step.start += shift; step.end += shift; } local.push(...childSchedule.steps); notices.push(...childSchedule.notices); }
  visiting.delete(reference); return { steps: local, notices };
}

function localScheduleV1(context: V1Context, recipe: V1Dict, path: string): V1ComposedStep[] | Problem {
  const nodes = context.method(recipe, path); const active = nodes.filter((node) => node.kind === "step" && node.active); const steps: Step[] = active.map((node) => ({ id: node.id, after: v1Strings(node.object.after).filter((id) => active.some((candidate) => candidate.id === id)), duration: node.object.duration })); const order = topologicalOrder(steps); if (!Array.isArray(order)) return { type: `${PROBLEM_BASE}dependency-cycle`, pointer: "/recipe/method" }; const durations: bigint[] = [];
  for (const step of steps) { const duration = stepDuration(step.duration); if (typeof duration === "string") return { type: `${PROBLEM_BASE}${duration}`, pointer: "/recipe/method" }; durations.push(duration); }
  const indexById = new Map(steps.map((step, index) => [step.id, index])); const ends = steps.map(() => 0n); const result: V1ComposedStep[] = [];
  for (const [authoredOrder, index] of order.entries()) { let start = 0n; for (const dependency of steps[index].after ?? []) { const end = ends[indexById.get(dependency)!]; if (end > start) start = end; } const end = start + durations[index]; ends[index] = end; result.push({ path, id: steps[index].id, after: [], duration: durations[index], start, end, order: authoredOrder, object: active.find((node) => node.id === steps[index].id)!.object }); }
  return result;
}

function componentConsumersV1(nodes: V1MethodNode[], componentId: string): string[] { return nodes.filter((node) => node.kind === "step" && node.active && v1Objects(node.object.uses).some((reference) => reference.kind === "component" && reference.id === componentId)).map((node) => node.id); }
function outputProducerV1(context: V1Context, recipe: V1Dict, path: string, outputId: string): string | Problem { const producers = context.method(recipe, path).filter((node) => node.kind === "step" && node.active && v1Objects(node.object.produces).some((reference) => reference.kind === "output" && reference.id === outputId)).map((node) => node.id); return producers.length === 1 ? producers[0] : { type: `${PROBLEM_BASE}${producers.length ? "multiple-producers" : "missing-producer"}`, pointer: "/bundle/documents" }; }

function v1Unconsumed(context: V1Context, recipe: V1Dict, path: string): unknown[] {
  const used = new Set<string>(); for (const node of context.method(recipe, path)) if (node.kind === "step" && node.active) for (const reference of v1Objects(node.object.uses)) if (reference.kind === "component") used.add(String(reference.id));
  return v1Objects(recipe.components).filter((component) => context.active(recipe, path, component) && !used.has(String(component.id))).map((component) => ({ component_path: v1PathArray(v1JoinPath(path, String(component.id))), reason: "not-consumed" }));
}

function publicV1FormulaQuantities(evaluation: V1FormulaEvaluation, factor: Rational): unknown[] | null {
  const result: unknown[] = []; for (const item of evaluation.quantities) if (item.active) { const value = formatCanonicalDecimal(multiply(item.value, factor)); if (value === "resource-limit") return null; result.push({ input: item.input, quantity: { kind: "measured", value, unit: item.unit } }); } return result;
}
function publicV1FormulaEvaluation(path: string, evaluation: V1FormulaEvaluation, factor?: Rational): V1Dict {
  const authored = formatCanonicalDecimal(evaluation.authoredTotal); const selected = formatCanonicalDecimal(evaluation.selectedTotal); const result: V1Dict = { component_path: v1PathArray(path), formula_id: evaluation.formula.id, authored_total: { kind: "measured", value: authored, unit: evaluation.unit }, selected_total: { kind: "measured", value: selected, unit: evaluation.unit } };
  if (factor) result.scaled_total = { kind: "measured", value: formatCanonicalDecimal(multiply(evaluation.selectedTotal, factor)), unit: evaluation.unit }; return result;
}
function activeIdsV1(context: V1Context, recipe: V1Dict, path: string, value: unknown): unknown[] { return v1Objects(value).filter((item) => context.active(recipe, path, item)).map((item) => item.id); }
function validV1Binding(parameter: V1Dict, value: unknown): boolean {
  if (parameter.kind === "choice") return typeof value === "string" && v1Find(parameter.options, value) !== null;
  if (parameter.kind === "toggle") return typeof value === "boolean";
  const measurement = v1Object(value); return measurement?.kind === "measured" && typeof measurement.value === "string" && typeof measurement.unit === "string" && unitsCompatible(measurement.unit, String(parameter.unit));
}
function v1AnchorFixed(formula: V1Dict): boolean { return v1Object(formula.kind === "ratio" ? formula.target : formula.basis_quantity)?.scaling === "fixed"; }
function recipeIdentityV1(recipe: V1Dict): V1Dict { return { collection: recipe.collection, id: recipe.id, revision: recipe.revision, sha256: digestJcs(recipe) }; }
function documentReferenceV1(recipe: V1Dict): string { return `${String(recipe.collection)}\0${String(recipe.id)}\0${String(recipe.revision)}\0${digestJcs(recipe)}`; }

function canonicalJcs(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJcs).join(",")}]`;
  const record = value as V1Dict; return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJcs(record[key])}`).join(",")}}`;
}
export function canonicalizeEvaluationResult(value: unknown): string { return canonicalJcs(value); }
function digestJcs(value: unknown): string { return sha256(canonicalJcs(value)); }

function sha256(value: string): string {
  const bytes = new TextEncoder().encode(value); const bitLength = BigInt(bytes.length) * 8n; const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64; const data = new Uint8Array(paddedLength); data.set(bytes); data[bytes.length] = 0x80;
  for (let index = 0; index < 8; index += 1) data[paddedLength - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; const rotate = (word: number, bits: number): number => (word >>> bits) | (word << (32 - bits));
  for (let offset = 0; offset < data.length; offset += 64) { const words = new Uint32Array(64); for (let index = 0; index < 16; index += 1) words[index] = (data[offset+index*4]<<24)|(data[offset+index*4+1]<<16)|(data[offset+index*4+2]<<8)|data[offset+index*4+3]; for (let index=16;index<64;index+=1){const s0=rotate(words[index-15],7)^rotate(words[index-15],18)^(words[index-15]>>>3);const s1=rotate(words[index-2],17)^rotate(words[index-2],19)^(words[index-2]>>>10);words[index]=(words[index-16]+s0+words[index-7]+s1)>>>0;} let [a,b,c,d,e,f,g,h]=hash;for(let index=0;index<64;index+=1){const s1=rotate(e,6)^rotate(e,11)^rotate(e,25);const choice=(e&f)^(~e&g);const t1=(h+s1+choice+constants[index]+words[index])>>>0;const s0=rotate(a,2)^rotate(a,13)^rotate(a,22);const majority=(a&b)^(a&c)^(b&c);const t2=(s0+majority)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;} hash[0]=(hash[0]+a)>>>0;hash[1]=(hash[1]+b)>>>0;hash[2]=(hash[2]+c)>>>0;hash[3]=(hash[3]+d)>>>0;hash[4]=(hash[4]+e)>>>0;hash[5]=(hash[5]+f)>>>0;hash[6]=(hash[6]+g)>>>0;hash[7]=(hash[7]+h)>>>0; }
  return hash.map((word) => word.toString(16).padStart(8,"0")).join("");
}
