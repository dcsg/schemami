export type Problem = { type: string; pointer?: string };
export type Envelope = {
  operation: string;
  status: "ok" | "refused" | "not_applicable";
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
type UnitDefinition = { dimension: "mass" | "volume"; factor: Rational };

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
  const target = (value as Record<string, unknown>).target;
  if (typeof target !== "string") return "missing-fact";
  return parseDuration(target) ?? "invalid-operation-arguments";
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
