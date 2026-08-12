var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/diff.ts
var exports_diff = {};
__export(exports_diff, {
  compare: () => compare
});

// src/calculus.ts
var PROBLEM_BASE = "https://schemami.dev/problems/";
function gcd(left, right) {
  left = left < 0n ? -left : left;
  while (right !== 0n)
    [left, right] = [right, left % right];
  return left;
}
function rational(numerator, denominator) {
  if (denominator === 0n)
    throw new Error("zero denominator");
  if (denominator < 0n)
    [numerator, denominator] = [-numerator, -denominator];
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
var integer = (value) => rational(value, 1n);
var multiply = (left, right) => rational(left.numerator * right.numerator, left.denominator * right.denominator);
var divide = (left, right) => rational(left.numerator * right.denominator, left.denominator * right.numerator);
var add = (left, right) => rational(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
var subtract = (left, right) => add(left, rational(-right.numerator, right.denominator));
var unitTable = {
  "1": { dimension: "unity", factor: integer(1n) },
  g: { dimension: "mass", factor: integer(1n) },
  kg: { dimension: "mass", factor: integer(1000n) },
  mL: { dimension: "volume", factor: integer(1n) },
  L: { dimension: "volume", factor: integer(1000n) },
  "[cup_us]": { dimension: "volume", factor: rational(2365882365n, 10000000n) },
  "[tbs_us]": { dimension: "volume", factor: rational(295735295625n, 20000000000n) },
  "[tsp_us]": { dimension: "volume", factor: rational(295735295625n, 60000000000n) },
  "[foz_us]": { dimension: "volume", factor: rational(295735295625n, 10000000000n) },
  "[cup_m]": { dimension: "volume", factor: integer(240n) }
};
var ambiguousUnits = new Set(["cup", "tbsp", "tsp", "floz"]);
var knownUnit = (unit) => unit === "Cel" || unit === "[degF]" || Object.hasOwn(unitTable, unit);
var unitsCompatible = (left, right) => {
  if (!knownUnit(left) || !knownUnit(right))
    return false;
  if (left === "Cel" || left === "[degF]" || right === "Cel" || right === "[degF]") {
    return (left === "Cel" || left === "[degF]") && (right === "Cel" || right === "[degF]");
  }
  return unitTable[left].dimension === unitTable[right].dimension;
};
var asciiCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
function refused(operation, code, pointer) {
  return {
    operation,
    status: "refused",
    problems: [{ type: `${PROBLEM_BASE}${code}`, ...pointer ? { pointer } : {} }]
  };
}
function parseCanonicalDecimal(raw) {
  if (!raw || raw.startsWith("+") || /[eE]/.test(raw))
    return "invalid-decimal";
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(unsigned);
  if (!match)
    return "invalid-decimal";
  const fraction = match[2] ?? "";
  if (fraction.length > 4 || fraction && fraction.endsWith("0"))
    return "invalid-decimal";
  if (match[1].length + fraction.length > 16)
    return "resource-limit";
  if (negative && unsigned === "0")
    return "invalid-decimal";
  let numerator = BigInt(`${match[1]}${fraction}`);
  if (negative)
    numerator = -numerator;
  return rational(numerator, 10n ** BigInt(fraction.length));
}
function formatCanonicalDecimal(value) {
  const negative = value.numerator < 0n;
  const absolute = negative ? -value.numerator : value.numerator;
  const scaled = absolute * 10000n;
  let quotient = scaled / value.denominator;
  const remainder = scaled % value.denominator;
  const comparison = remainder * 2n - value.denominator;
  if (comparison > 0n || comparison === 0n && quotient % 2n === 1n)
    quotient += 1n;
  const whole = quotient / 10000n;
  const fraction = quotient % 10000n;
  let output = whole.toString();
  if (fraction !== 0n) {
    output += `.${fraction.toString().padStart(4, "0").replace(/0+$/, "")}`;
  }
  if (negative && quotient !== 0n)
    output = `-${output}`;
  if (output.replace(/[-.]/g, "").length > 16)
    return "resource-limit";
  return output;
}
function convert(value, sourceUnit, targetUnit) {
  if (sourceUnit === targetUnit && knownUnit(sourceUnit))
    return value;
  if (sourceUnit === "Cel" && targetUnit === "[degF]") {
    return add(multiply(value, rational(9n, 5n)), integer(32n));
  }
  if (sourceUnit === "[degF]" && targetUnit === "Cel") {
    return multiply(subtract(value, integer(32n)), rational(5n, 9n));
  }
  if ([sourceUnit, targetUnit].some((unit) => unit === "Cel" || unit === "[degF]")) {
    if (!knownUnit(sourceUnit) || !knownUnit(targetUnit))
      return "unknown-unit";
    return "dimension-mismatch";
  }
  const source = unitTable[sourceUnit];
  const target = unitTable[targetUnit];
  if (!source || !target)
    return "unknown-unit";
  if (source.dimension !== target.dimension)
    return "dimension-mismatch";
  return divide(multiply(value, source.factor), target.factor);
}
function convertQuantity(quantity, targetUnit, pointer) {
  const operation = "convert_quantity";
  if (quantity.kind !== "measured")
    return refused(operation, "unsupported-quantity-kind", pointer);
  if (ambiguousUnits.has(quantity.unit ?? ""))
    return refused(operation, "ambiguous-unit", `${pointer}/unit`);
  if (ambiguousUnits.has(targetUnit))
    return refused(operation, "ambiguous-unit");
  const value = parseCanonicalDecimal(quantity.value ?? "");
  if (typeof value === "string")
    return refused(operation, value, `${pointer}/value`);
  const converted = convert(value, quantity.unit ?? "", targetUnit);
  if (typeof converted === "string") {
    const problemPointer = converted === "unknown-unit" && knownUnit(quantity.unit ?? "") ? undefined : `${pointer}/unit`;
    return refused(operation, converted, problemPointer);
  }
  const formatted = formatCanonicalDecimal(converted);
  if (formatted === "resource-limit")
    return refused(operation, formatted, `${pointer}/value`);
  return {
    operation,
    status: "ok",
    result: { quantity: { kind: "measured", value: formatted, unit: targetUnit } }
  };
}
function positiveDecimal(raw) {
  const value = parseCanonicalDecimal(raw);
  if (typeof value === "string")
    return value;
  return value.numerator > 0n ? value : "invalid-decimal";
}
function scaledDecimal(raw, factor) {
  const value = parseCanonicalDecimal(raw);
  if (typeof value === "string")
    return value;
  return formatCanonicalDecimal(multiply(value, factor));
}
function scaleMeasured(quantity, factor, pointer) {
  const value = scaledDecimal(quantity.value ?? "", factor);
  if (value === "invalid-decimal" || value === "resource-limit")
    return refused("scale", value, `${pointer}/value`);
  return { ...quantity, value };
}
function scaleQuantity(quantity, factor, pointer) {
  if (quantity.kind === "measured") {
    return quantity.scaling === "fixed" ? { ...quantity } : scaleMeasured(quantity, factor, pointer);
  }
  if (quantity.kind === "range") {
    const minimum = scaledDecimal(quantity.minimum ?? "", factor);
    if (minimum === "invalid-decimal" || minimum === "resource-limit")
      return refused("scale", minimum, `${pointer}/minimum`);
    const maximum = scaledDecimal(quantity.maximum ?? "", factor);
    if (maximum === "invalid-decimal" || maximum === "resource-limit")
      return refused("scale", maximum, `${pointer}/maximum`);
    return { ...quantity, minimum, maximum };
  }
  if (quantity.kind === "open")
    return structuredClone(quantity);
  return refused("scale", "unsupported-quantity-kind", pointer);
}
function isEnvelope(value) {
  return "operation" in value;
}
function topologicalOrder(steps) {
  const indexById = new Map;
  for (const [index, step] of steps.entries()) {
    if (indexById.has(step.id))
      return { type: `${PROBLEM_BASE}invalid-document`, pointer: `/steps/${index}/id` };
    indexById.set(step.id, index);
  }
  const indegree = steps.map(() => 0);
  const dependents = steps.map(() => []);
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
  const order = [];
  while (order.length < steps.length) {
    const selected = steps.findIndex((_, index) => !used[index] && indegree[index] === 0);
    if (selected === -1)
      return { type: `${PROBLEM_BASE}invalid-document`, pointer: "/steps" };
    used[selected] = true;
    order.push(selected);
    for (const dependent of dependents[selected])
      indegree[dependent] -= 1;
  }
  return order;
}
var durationPattern = /^P(?:(?:([1-9][0-9]*)W)|(?:([1-9][0-9]*)D)?(?:T(?:([1-9][0-9]*)H)?(?:([1-9][0-9]*)M)?(?:([1-9][0-9]*)S)?)?)$/;
function parseDuration(raw) {
  const match = durationPattern.exec(raw);
  if (!match)
    return null;
  const units = [604800n, 86400n, 3600n, 60n, 1n];
  let seconds = 0n;
  for (let index = 0;index < units.length; index += 1) {
    if (match[index + 1])
      seconds += BigInt(match[index + 1]) * units[index];
  }
  return seconds > 0n ? seconds : null;
}
function stepDuration(value) {
  if (value === undefined || value === null)
    return "missing-fact";
  if (typeof value === "string")
    return parseDuration(value) ?? "invalid-operation-arguments";
  if (typeof value !== "object" || Array.isArray(value))
    return "invalid-operation-arguments";
  const window = value;
  const windowProblem = validateDurationWindow(window);
  if (windowProblem)
    return windowProblem;
  const parsed = new Map;
  for (const field of ["minimum", "target", "maximum"]) {
    if (!Object.hasOwn(window, field))
      continue;
    if (typeof window[field] !== "string")
      return "invalid-operation-arguments";
    const duration = parseDuration(window[field]);
    if (duration === null)
      return "invalid-operation-arguments";
    parsed.set(field, duration);
  }
  for (const [leftName, rightName] of [["minimum", "target"], ["target", "maximum"], ["minimum", "maximum"]]) {
    const left = parsed.get(leftName);
    const right = parsed.get(rightName);
    if (left !== undefined && right !== undefined && left > right)
      return "invalid-operation-arguments";
  }
  return parsed.get("target") ?? "missing-fact";
}
function validateDurationWindow(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const window = value;
  const parsed = new Map;
  for (const field of ["minimum", "target", "maximum"]) {
    if (!Object.hasOwn(window, field))
      continue;
    if (typeof window[field] !== "string")
      return "invalid-operation-arguments";
    const duration = parseDuration(window[field]);
    if (duration === null)
      return "invalid-operation-arguments";
    parsed.set(field, duration);
  }
  for (const [leftName, rightName] of [["minimum", "target"], ["target", "maximum"], ["minimum", "maximum"]]) {
    const left = parsed.get(leftName);
    const right = parsed.get(rightName);
    if (left !== undefined && right !== undefined && left > right)
      return "invalid-operation-arguments";
  }
  return null;
}
function formatElapsed(seconds) {
  if (seconds === 0n)
    return "PT0S";
  if (seconds % 604800n === 0n)
    return `P${seconds / 604800n}W`;
  const days = seconds / 86400n;
  let remaining = seconds % 86400n;
  const hours = remaining / 3600n;
  remaining %= 3600n;
  const minutes = remaining / 60n;
  remaining %= 60n;
  let output = "P";
  if (days)
    output += `${days}D`;
  if (hours || minutes || remaining) {
    output += "T";
    if (hours)
      output += `${hours}H`;
    if (minutes)
      output += `${minutes}M`;
    if (remaining)
      output += `${remaining}S`;
  }
  return output;
}
var v1Object = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
var v1Objects = (value) => Array.isArray(value) ? value.map(v1Object).filter((item) => item !== null) : [];
var v1Strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
var v1Find = (value, id) => v1Objects(value).find((item) => item.id === id) ?? null;
var v1Key = (reference) => `${String(reference.kind ?? "")}\x00${String(reference.id ?? "")}`;
var v1Path = (value) => v1Strings(value).join("/");
var v1PathArray = (path) => path === "" ? [] : path.split("/");
var v1JoinPath = (parent, child) => parent ? `${parent}/${child}` : child;

class V1Context {
  operation;
  request;
  root;
  bundle;
  selections = new Map;
  effective = new Map;
  effectiveAlternatives = new Map;
  problems = [];
  recursiveLimit;
  semanticLimit;
  selectedComponentLimit;
  visitedInstances = 0;
  semanticOccurrences = 0;
  enteredInstances = new Set;
  constructor(operation, request, limits = {}) {
    this.operation = operation;
    this.request = request;
    this.recursiveLimit = limits.recursiveLevels ?? 64;
    this.semanticLimit = limits.semanticOccurrences ?? 1e4;
    this.selectedComponentLimit = limits.selectedComponentInstances ?? 1024;
    const recipe = v1Object(request.recipe);
    this.bundle = v1Object(request.bundle);
    if (recipe === null === (this.bundle === null))
      throw new Error("invalid-root");
    if (recipe) {
      this.root = recipe;
    } else {
      const first = v1Object(v1Objects(this.bundle.documents)[0]);
      const embedded = v1Object(first?.document);
      if (!embedded)
        throw new Error("invalid-root");
      this.root = embedded;
    }
    const argumentsValue = v1Object(request.arguments);
    if (!argumentsValue)
      throw new Error("invalid-arguments");
    for (const [index, selection] of v1Objects(argumentsValue.selections).entries()) {
      const path = v1Path(selection.component_path);
      if (this.selections.has(path))
        this.addProblem("invalid-binding", `/arguments/selections/${index}/component_path`);
      else
        this.selections.set(path, selection);
    }
    this.validateSelections();
  }
  addProblem(code, pointer) {
    const problem = { type: `${PROBLEM_BASE}${code}`, ...pointer === undefined ? {} : { pointer } };
    if (!this.problems.some((item) => item.type === problem.type && item.pointer === problem.pointer))
      this.problems.push(problem);
  }
  refusal() {
    this.problems.sort((left, right) => asciiCompare(left.pointer ?? "", right.pointer ?? "") || asciiCompare(left.type, right.type));
    return { operation: this.operation, status: "refused", problems: this.problems };
  }
  recipeForPath(path) {
    let recipe = this.root;
    if (!path)
      return recipe;
    for (const componentId of path.split("/")) {
      const component = v1Find(recipe.components, componentId);
      if (!component)
        return null;
      const child = this.bundleRecipe(v1Object(component.recipe));
      if (!child)
        return null;
      recipe = child;
    }
    return recipe;
  }
  bundleRecipe(reference) {
    if (!this.bundle)
      return null;
    for (const entry of v1Objects(this.bundle.documents)) {
      const document = v1Object(entry.document);
      if (!document || document.collection !== reference.collection || document.id !== reference.id || document.revision !== reference.revision)
        continue;
      if (digestJcs(document) !== reference.sha256 || entry.sha256 !== reference.sha256)
        return null;
      return document;
    }
    return null;
  }
  unresolvedComponentPointer() {
    return this.bundle ? "/bundle/documents" : "/recipe/components";
  }
  validateSelections() {
    if (this.selections.size > this.selectedComponentLimit)
      this.addProblem("resource-limit", "/arguments/selections");
    for (const [path, selection] of this.selections) {
      const recipe = this.recipeForPath(path);
      if (!recipe) {
        this.addProblem("invalid-binding", "/arguments/selections");
        continue;
      }
      const bindings = v1Object(selection.bindings) ?? {};
      for (const [id, value] of Object.entries(bindings)) {
        const parameter = v1Find(recipe.parameters, id);
        if (!parameter || !validV1Binding(parameter, value))
          this.addProblem("invalid-binding", "/arguments/selections");
      }
      const alternatives = v1Object(selection.alternatives) ?? {};
      for (const [id, value] of Object.entries(alternatives)) {
        const ingredient = v1Find(recipe.ingredients, id);
        const declaration = v1Object(ingredient?.alternatives);
        if (!declaration || typeof value !== "string" || !v1Find(declaration.options, value))
          this.addProblem("invalid-binding", "/arguments/selections");
      }
    }
  }
  enterInstance(recipe, path) {
    if (this.enteredInstances.has(path))
      return true;
    this.enteredInstances.add(path);
    const depth = path === "" ? 1 : path.split("/").length + 1;
    this.visitedInstances += 1;
    this.semanticOccurrences += v1SemanticObjectCount(recipe);
    if (depth > this.recursiveLimit || this.visitedInstances > this.selectedComponentLimit || this.semanticOccurrences > this.semanticLimit) {
      this.addProblem("resource-limit", "/bundle/documents");
      return false;
    }
    return true;
  }
  binding(path, parameter) {
    let values = this.effective.get(path);
    if (!values) {
      values = new Map;
      this.effective.set(path, values);
    }
    const id = String(parameter.id);
    const existing = values.get(id);
    if (existing)
      return [existing.value, true];
    const supplied = v1Object(this.selections.get(path)?.bindings);
    if (supplied && Object.hasOwn(supplied, id)) {
      const value = supplied[id];
      values.set(id, { value, source: "argument" });
      return [value, true];
    }
    if (Object.hasOwn(parameter, "default")) {
      values.set(id, { value: parameter.default, source: "default" });
      return [parameter.default, true];
    }
    this.addProblem("missing-binding", "/arguments/selections");
    return [undefined, false];
  }
  alternative(path, ingredient, required) {
    const declaration = v1Object(ingredient.alternatives);
    if (!declaration)
      return ["", true];
    let values = this.effectiveAlternatives.get(path);
    if (!values) {
      values = new Map;
      this.effectiveAlternatives.set(path, values);
    }
    const id = String(ingredient.id);
    const supplied = v1Object(this.selections.get(path)?.alternatives);
    if (supplied && typeof supplied[id] === "string") {
      values.set(id, { value: supplied[id], source: "argument" });
      return [supplied[id], true];
    }
    if (typeof declaration.default === "string") {
      values.set(id, { value: declaration.default, source: "default" });
      return [declaration.default, true];
    }
    if (required)
      this.addProblem("missing-binding", "/arguments/selections");
    return ["", !required];
  }
  active(recipe, path, object) {
    const activation = v1Object(object.activation);
    if (!activation)
      return true;
    return this.activation(recipe, path, activation)[0];
  }
  activation(recipe, path, activation) {
    const kind = String(activation.kind);
    if (["choice_is", "toggle_is", "measurement_compare"].includes(kind)) {
      const parameter = v1Find(recipe.parameters, String(activation.parameter));
      if (!parameter) {
        this.addProblem("invalid-binding", "/arguments/selections");
        return [false, false];
      }
      const [value, known] = this.binding(path, parameter);
      if (!known)
        return [false, false];
      if (kind === "choice_is")
        return [value === activation.option, true];
      if (kind === "toggle_is")
        return [value === activation.enabled, true];
      const bound = v1Object(value);
      const threshold = v1Object(activation.measurement);
      if (!bound || !threshold) {
        this.addProblem("invalid-binding", "/arguments/selections");
        return [false, false];
      }
      const left = parseCanonicalDecimal(String(bound.value ?? ""));
      let right = parseCanonicalDecimal(String(threshold.value ?? ""));
      if (typeof left === "string" || typeof right === "string") {
        this.addProblem("invalid-binding", "/arguments/selections");
        return [false, false];
      }
      right = convert(right, String(threshold.unit ?? ""), String(bound.unit ?? ""));
      if (typeof right === "string") {
        this.addProblem(right, "/arguments/selections");
        return [false, false];
      }
      const comparison = left.numerator * right.denominator < right.numerator * left.denominator ? -1 : left.numerator * right.denominator > right.numerator * left.denominator ? 1 : 0;
      const matches = activation.operator === "equal" ? comparison === 0 : activation.operator === "less_than" ? comparison < 0 : activation.operator === "less_than_or_equal" ? comparison <= 0 : activation.operator === "greater_than" ? comparison > 0 : comparison >= 0;
      return [matches, true];
    }
    if (kind === "all" || kind === "any") {
      const values = v1Objects(activation.conditions);
      if (kind === "all") {
        for (const condition of values) {
          const result = this.activation(recipe, path, condition);
          if (!result[1])
            return [false, false];
          if (!result[0])
            return [false, true];
        }
        return [true, true];
      }
      for (const condition of values) {
        const result = this.activation(recipe, path, condition);
        if (!result[1])
          return [false, false];
        if (result[0])
          return [true, true];
      }
      return [false, true];
    }
    if (kind === "not") {
      const result = this.activation(recipe, path, v1Object(activation.condition));
      return [!result[0], result[1]];
    }
    return [false, false];
  }
  method(recipe, path) {
    const sequence = v1Objects(v1Object(recipe.method)?.sequence);
    const stack = [...sequence].reverse().map((object) => ({ object, parent: true }));
    const result = [];
    while (stack.length) {
      const current = stack.pop();
      const active = current.parent && this.active(recipe, path, current.object);
      const node = { kind: String(current.object.kind), id: String(current.object.id), object: current.object, active, order: result.length };
      result.push(node);
      if (node.kind === "section")
        for (const child of [...v1Objects(current.object.sequence)].reverse())
          stack.push({ object: child, parent: active });
    }
    return result;
  }
  formula(recipe, path, formula) {
    const terms = v1Objects(formula.terms);
    const quantities = [];
    let authoredTotal = integer(0n);
    let selectedTotal = integer(0n);
    let unit = "";
    if (formula.kind === "ratio") {
      const target = v1Object(formula.target);
      if (!target) {
        this.addProblem("missing-fact", "/recipe/formulas");
        return null;
      }
      const targetValue = positiveDecimal(String(target.value ?? ""));
      if (typeof targetValue === "string") {
        this.addProblem(targetValue, "/recipe/formulas");
        return null;
      }
      unit = String(target.unit);
      const parts = [];
      let total = integer(0n);
      for (const term of terms) {
        const part = positiveDecimal(String(term.parts ?? ""));
        if (typeof part === "string") {
          this.addProblem(part, "/recipe/formulas");
          return null;
        }
        parts.push(part);
        total = add(total, part);
      }
      terms.forEach((term, index) => {
        const input = v1Object(term.input);
        const value = divide(multiply(targetValue, parts[index]), total);
        const object = v1Find(recipe[`${String(input.kind)}s`], String(input.id));
        const active = object !== null && this.active(recipe, path, object);
        quantities.push({ input, value, unit, active });
        authoredTotal = add(authoredTotal, value);
        if (active)
          selectedTotal = add(selectedTotal, value);
      });
    } else {
      const basisQuantity = v1Object(formula.basis_quantity);
      if (!basisQuantity) {
        this.addProblem("missing-fact", "/recipe/formulas");
        return null;
      }
      const basis = positiveDecimal(String(basisQuantity.value ?? ""));
      if (typeof basis === "string") {
        this.addProblem(basis, "/recipe/formulas");
        return null;
      }
      unit = String(basisQuantity.unit);
      const basisRef = v1Object(formula.basis);
      const basisObject = v1Find(recipe[`${String(basisRef.kind)}s`], String(basisRef.id));
      const basisActive = basisObject !== null && this.active(recipe, path, basisObject);
      for (const term of terms) {
        const percentage = positiveDecimal(String(term.percentage ?? ""));
        if (typeof percentage === "string") {
          this.addProblem(percentage, "/recipe/formulas");
          return null;
        }
        const input = v1Object(term.input);
        const value = divide(multiply(basis, percentage), integer(100n));
        const object = v1Find(recipe[`${String(input.kind)}s`], String(input.id));
        const active = object !== null && this.active(recipe, path, object);
        quantities.push({ input, value, unit, active });
        authoredTotal = add(authoredTotal, value);
        if (active)
          selectedTotal = add(selectedTotal, value);
      }
      if (!basisActive && selectedTotal.numerator > 0n)
        this.addProblem("inactive-reference", "/recipe/formulas");
    }
    return { formula, quantities, authoredTotal, selectedTotal, unit };
  }
  evaluation() {
    const result = { recipe: recipeIdentityV1(this.root), selections: this.effectiveSelection() };
    if (this.bundle)
      result.bundle_sha256 = digestJcs(this.bundle);
    return result;
  }
  effectiveSelection() {
    const paths = [...new Set([...this.effective.keys(), ...this.effectiveAlternatives.keys()])].sort();
    return paths.map((path) => {
      const recipe = this.recipeForPath(path);
      const values = this.effective.get(path) ?? new Map;
      const alternatives = this.effectiveAlternatives.get(path) ?? new Map;
      return {
        component_path: v1PathArray(path),
        bindings: v1Objects(recipe.parameters).flatMap((parameter) => {
          const value = values.get(String(parameter.id));
          return value ? [{ parameter: parameter.id, value: value.value, source: value.source }] : [];
        }),
        alternatives: v1Objects(recipe.ingredients).flatMap((ingredient) => {
          const value = alternatives.get(String(ingredient.id));
          return value ? [{ ingredient: ingredient.id, option: value.value, source: value.source }] : [];
        })
      };
    });
  }
}
function evaluateRequest(operation, request, limits = {}) {
  if (operation === "convert_quantity") {
    const argumentsValue = v1Object(request.arguments) ?? {};
    return convertQuantity(argumentsValue.quantity, String(argumentsValue.target_unit ?? ""), "/arguments/quantity");
  }
  let context;
  try {
    context = new V1Context(operation, request, limits);
  } catch {
    return refused(operation, "invalid-operation-arguments");
  }
  if (context.problems.length)
    return context.refusal();
  if (!context.enterInstance(context.root, ""))
    return context.refusal();
  let envelope;
  if (operation === "resolve_selection")
    envelope = v1ResolveSelection(context);
  else if (operation === "resolve_formula")
    envelope = v1ResolveFormula(context);
  else if (operation === "scale")
    envelope = v1Scale(context);
  else if (operation === "reading_order" || operation === "schedule")
    envelope = v1MethodOperation(context, operation === "schedule");
  else
    return refused(operation, "invalid-operation-arguments", "/operation");
  if (envelope.status === "ok")
    envelope.evaluation = context.evaluation();
  return envelope;
}
function createAnalysisBudgetState() {
  return { semanticOccurrences: 0, analysisStates: 0 };
}
function validateReachableGraphs(recipe, budgets = { semanticOccurrences: 1e4, analysisStates: 1e4 }, budgetState = createAnalysisBudgetState(), semanticOccurrenceCost = Math.max(1, v1SemanticObjectCount(recipe))) {
  const usedParameters = activationParameterIds(recipe);
  const parameters = v1Objects(recipe.parameters).filter((parameter) => usedParameters.has(String(parameter.id)));
  const candidates = parameters.map((parameter) => v1ParameterCandidates(recipe, parameter));
  if (candidates.some((values) => values.length === 0))
    return [{ type: `${PROBLEM_BASE}invalid-document`, pointer: "/parameters" }];
  const alternatives = {};
  for (const ingredient of v1Objects(recipe.ingredients)) {
    const declaration = v1Object(ingredient.alternatives);
    if (!declaration)
      continue;
    alternatives[String(ingredient.id)] = typeof declaration.default === "string" ? declaration.default : v1Objects(declaration.options)[0]?.id;
  }
  const distinct = new Set;
  const partialStates = new Set;
  const problems = [];
  const bindings = {};
  const explore = (index) => {
    const state = `${index}|${v1ResidualActivationSignature(recipe, bindings)}`;
    if (partialStates.has(state))
      return true;
    partialStates.add(state);
    budgetState.analysisStates += 1;
    if (budgetState.analysisStates > budgets.analysisStates) {
      problems.push({ type: `${PROBLEM_BASE}resource-limit` });
      return false;
    }
    if (index < parameters.length) {
      const id = String(parameters[index].id);
      for (const candidate of candidates[index]) {
        bindings[id] = candidate;
        if (!explore(index + 1))
          return false;
      }
      delete bindings[id];
      return true;
    }
    const context = new V1Context("resolve_selection", { recipe, arguments: { selections: [{ component_path: [], bindings: { ...bindings }, alternatives }] } });
    if (context.problems.length) {
      problems.push(...context.problems);
      return true;
    }
    const nodes = context.method(recipe, "");
    const signature = v1GraphSignature(context, recipe, nodes);
    if (distinct.has(signature))
      return true;
    budgetState.semanticOccurrences += semanticOccurrenceCost;
    if (budgetState.semanticOccurrences > budgets.semanticOccurrences) {
      problems.push({ type: `${PROBLEM_BASE}resource-limit` });
      return false;
    }
    distinct.add(signature);
    problems.push(...v1ValidateActiveGraph(context, recipe, nodes));
    return true;
  };
  explore(0);
  const seen = new Set;
  return problems.sort((left, right) => asciiCompare(left.pointer ?? "", right.pointer ?? "") || asciiCompare(left.type, right.type)).filter((item) => {
    const key = `${item.pointer ?? ""}\x00${item.type}`;
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}
function v1ResidualActivationSignature(recipe, bindings) {
  return normativeActivations(recipe).map((activation) => v1ResidualActivation(activation, bindings)).join(";");
}
function v1ResidualActivation(activation, bindings) {
  const kind = String(activation.kind ?? "");
  if (["choice_is", "toggle_is", "measurement_compare"].includes(kind)) {
    const parameter = String(activation.parameter ?? "");
    if (!Object.hasOwn(bindings, parameter)) {
      if (kind === "choice_is")
        return JSON.stringify(["choice", parameter, activation.option]);
      if (kind === "toggle_is")
        return activation.enabled === false ? `!${JSON.stringify(["toggle", parameter])}` : JSON.stringify(["toggle", parameter]);
      const measurement = v1Object(activation.measurement) ?? {};
      return JSON.stringify(["measurement", parameter, activation.operator, measurement.value, measurement.unit]);
    }
    const value = v1ResidualLeafValue(kind, bindings[parameter], activation);
    return value === null ? "invalid" : value ? "1" : "0";
  }
  if (kind === "not") {
    const condition = v1Object(activation.condition);
    if (!condition)
      return "invalid";
    const value = v1ResidualActivation(condition, bindings);
    if (value === "1")
      return "0";
    if (value === "0")
      return "1";
    if (value.startsWith("!"))
      return value.slice(1);
    return `!(${value})`;
  }
  if (kind === "all" || kind === "any") {
    const identity = kind === "all" ? "1" : "0";
    const absorbing = kind === "all" ? "0" : "1";
    const children = new Set;
    for (const condition of v1Objects(activation.conditions)) {
      const value = v1ResidualActivation(condition, bindings);
      if (value === absorbing)
        return absorbing;
      if (value !== identity)
        children.add(value);
    }
    if (children.size === 0)
      return identity;
    if (children.size === 1)
      return [...children][0];
    return `${kind}(${[...children].sort(asciiCompare).join(",")})`;
  }
  return "invalid";
}
function v1ResidualLeafValue(kind, value, activation) {
  if (kind === "choice_is")
    return value === activation.option;
  if (kind === "toggle_is")
    return value === activation.enabled;
  const bound = v1Object(value);
  const measurement = v1Object(activation.measurement);
  if (!bound || !measurement)
    return null;
  const left = parseCanonicalDecimal(String(bound.value ?? ""));
  let right = parseCanonicalDecimal(String(measurement.value ?? ""));
  if (typeof left === "string" || typeof right === "string")
    return null;
  right = convert(right, String(measurement.unit ?? ""), String(bound.unit ?? ""));
  if (typeof right === "string")
    return null;
  const comparison = left.numerator * right.denominator < right.numerator * left.denominator ? -1 : left.numerator * right.denominator > right.numerator * left.denominator ? 1 : 0;
  if (activation.operator === "equal")
    return comparison === 0;
  if (activation.operator === "less_than")
    return comparison < 0;
  if (activation.operator === "less_than_or_equal")
    return comparison <= 0;
  if (activation.operator === "greater_than")
    return comparison > 0;
  if (activation.operator === "greater_than_or_equal")
    return comparison >= 0;
  return null;
}
function activationParameterIds(recipe) {
  const result = new Set;
  const stack = [...normativeActivations(recipe)];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    const item = v1Object(current);
    if (!item)
      continue;
    if (["choice_is", "toggle_is", "measurement_compare"].includes(String(item.kind)) && typeof item.parameter === "string")
      result.add(item.parameter);
    stack.push(...Object.entries(item).filter(([name]) => !name.startsWith("x-")).map(([, value]) => value));
  }
  return result;
}
function normativeActivations(recipe) {
  const result = [];
  const append = (object) => {
    const activation = v1Object(object.activation);
    if (activation)
      result.push(activation);
  };
  for (const collection of [recipe.ingredients, recipe.components, recipe.equipment])
    for (const object of v1Objects(collection))
      append(object);
  const method = v1Object(recipe.method);
  const stack = v1Objects(method?.sequence);
  while (stack.length) {
    const node = stack.pop();
    append(node);
    for (const action of v1Objects(node.actions))
      append(action);
    stack.push(...v1Objects(node.sequence));
  }
  return result;
}
function v1ParameterCandidates(recipe, parameter) {
  if (parameter.kind === "choice")
    return v1Objects(parameter.options).map((option) => option.id);
  if (parameter.kind === "toggle")
    return [false, true];
  if (parameter.kind !== "measurement")
    return [];
  const thresholds = [];
  const stack = [...normativeActivations(recipe)];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    const record = v1Object(current);
    if (!record)
      continue;
    if (record.kind === "measurement_compare" && record.parameter === parameter.id) {
      const measurement = v1Object(record.measurement);
      if (measurement)
        thresholds.push(measurement);
    }
    stack.push(...Object.entries(record).filter(([name]) => !name.startsWith("x-")).map(([, value]) => value));
  }
  if (!thresholds.length)
    return Object.hasOwn(parameter, "default") ? [parameter.default] : [{ kind: "measured", value: "0", unit: parameter.unit }];
  const result = [];
  const seen = new Set;
  const quantum = rational(1n, 10000n);
  for (const threshold of thresholds) {
    const exact = parseCanonicalDecimal(String(threshold.value));
    if (typeof exact === "string")
      continue;
    for (const candidate of [subtract(exact, quantum), exact, add(exact, quantum)]) {
      const value = formatCanonicalDecimal(candidate);
      if (value === "resource-limit")
        continue;
      const key = `${String(threshold.unit)}\x00${value}`;
      if (seen.has(key))
        continue;
      seen.add(key);
      result.push({ kind: "measured", value, unit: threshold.unit });
    }
  }
  return result;
}
function v1SemanticObjectCount(value) {
  let count = 0;
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current))
      stack.push(...current);
    else {
      const record = v1Object(current);
      if (record) {
        count += 1;
        for (const [name, child] of Object.entries(record))
          if (!name.startsWith("x-"))
            stack.push(child);
      }
    }
  }
  return count;
}
function v1GraphSignature(context, recipe, nodes) {
  const parts = [];
  for (const collection of ["ingredients", "components", "equipment"])
    for (const item of v1Objects(recipe[collection]))
      if (context.active(recipe, "", item))
        parts.push(`${collection}:${String(item.id)}`);
  for (const node of nodes)
    if (node.active) {
      parts.push(`node:${node.kind}:${node.id}`);
      if (node.kind === "step") {
        for (const action of v1Objects(node.object.actions))
          if (context.active(recipe, "", action))
            parts.push(`action:${node.id}:${String(action.id)}`);
        for (const id of v1Strings(node.object.after))
          if (nodes.some((candidate) => candidate.active && candidate.id === id))
            parts.push(`after:${id}>${node.id}`);
        for (const field of ["uses", "produces"])
          for (const reference of v1Objects(node.object[field]))
            parts.push(`${field}:${node.id}:${v1Key(reference)}`);
      }
    }
  for (const formula of v1Objects(recipe.formulas))
    for (const term of v1Objects(formula.terms)) {
      const input = v1Object(term.input);
      const target = v1Find(recipe[`${String(input.kind)}s`], String(input.id));
      if (target && context.active(recipe, "", target))
        parts.push(`formula:${String(formula.id)}:${v1Key(input)}`);
    }
  return parts.join("|");
}
function v1ValidateActiveGraph(context, recipe, nodes) {
  const problems = [];
  const resources = new Set;
  for (const collection of ["ingredients", "components", "equipment"])
    for (const item of v1Objects(recipe[collection]))
      if (context.active(recipe, "", item))
        resources.add(v1Key({ kind: collection === "equipment" ? "equipment" : collection.slice(0, -1), id: item.id }));
  for (const collection of ["preparations", "outputs"])
    for (const item of v1Objects(recipe[collection]))
      resources.add(v1Key({ kind: collection === "preparations" ? "preparation" : "output", id: item.id }));
  const activeSteps = nodes.filter((node) => node.kind === "step" && node.active);
  const stepIds = new Set(activeSteps.map((node) => node.id));
  const edges = new Map;
  const timingEdges = new Map;
  const producers = new Map;
  const consumers = new Set;
  for (const node of nodes.filter((candidate) => candidate.active)) {
    const timing = v1Object(node.object.relative_timing);
    if (!timing)
      continue;
    const anchor = String(timing.anchor_step);
    if (!stepIds.has(anchor)) {
      problems.push({ type: `${PROBLEM_BASE}inactive-reference`, pointer: "/method" });
      continue;
    }
    const from = timing.relation === "before" ? node.id : anchor;
    const to = timing.relation === "before" ? anchor : node.id;
    const children = timingEdges.get(from) ?? [];
    children.push(to);
    timingEdges.set(from, children);
  }
  for (const node of activeSteps) {
    if (Array.isArray(node.object.actions) && !v1Objects(node.object.actions).some((action) => context.active(recipe, "", action)))
      problems.push({ type: `${PROBLEM_BASE}missing-fact`, pointer: "/method" });
    const after = [];
    for (const dependency of v1Strings(node.object.after)) {
      if (stepIds.has(dependency)) {
        after.push(dependency);
        const children = timingEdges.get(dependency) ?? [];
        children.push(node.id);
        timingEdges.set(dependency, children);
      }
    }
    edges.set(node.id, after);
    for (const field of ["uses", "produces"])
      for (const reference of v1Objects(node.object[field])) {
        const key = v1Key(reference);
        if (!resources.has(key)) {
          problems.push({ type: `${PROBLEM_BASE}inactive-reference`, pointer: "/method" });
          continue;
        }
        if (field === "produces")
          producers.set(key, (producers.get(key) ?? 0) + 1);
        else if (reference.kind === "preparation")
          consumers.add(key);
      }
  }
  if (v1StringGraphCycle(edges))
    problems.push({ type: `${PROBLEM_BASE}dependency-cycle`, pointer: "/method" });
  if (v1StringGraphCycle(timingEdges))
    problems.push({ type: `${PROBLEM_BASE}relative-timing-conflict`, pointer: "/method" });
  for (const [key, count] of producers)
    if (count > 1)
      problems.push({ type: `${PROBLEM_BASE}multiple-producers`, pointer: v1ResourcePointer(key) });
  for (const key of consumers)
    if (!producers.has(key))
      problems.push({ type: `${PROBLEM_BASE}missing-producer`, pointer: v1ResourcePointer(key) });
  return problems;
}
function v1StringGraphCycle(edges) {
  const state = new Map;
  const visit = (node) => {
    if (state.get(node) === 1)
      return true;
    if (state.get(node) === 2)
      return false;
    state.set(node, 1);
    for (const child of edges.get(node) ?? [])
      if (visit(child))
        return true;
    state.set(node, 2);
    return false;
  };
  return [...edges.keys()].some(visit);
}
function v1ResourcePointer(key) {
  const [kind, id] = key.split("\x00");
  const collection = kind === "equipment" ? "equipment" : kind === "preparation" ? "preparations" : `${kind}s`;
  return `/${collection}/${id}`;
}
function v1ResolveSelection(context) {
  const instances = [];
  const visiting = new Set;
  const visit = (recipe, path) => {
    if (!context.enterInstance(recipe, path))
      return false;
    const reference = documentReferenceV1(recipe);
    if (visiting.has(reference)) {
      context.addProblem("component-cycle", "/bundle/documents");
      return false;
    }
    visiting.add(reference);
    for (const parameter of v1Objects(recipe.parameters))
      context.binding(path, parameter);
    for (const ingredient of v1Objects(recipe.ingredients)) {
      context.active(recipe, path, ingredient);
      context.alternative(path, ingredient, true);
    }
    const nodes = context.method(recipe, path);
    const method = [];
    const actions = [];
    for (const node of nodes)
      if (node.active) {
        method.push({ kind: node.kind, id: node.id });
        if (node.kind === "step" && Array.isArray(node.object.actions)) {
          const activeActions = v1Objects(node.object.actions).filter((action) => context.active(recipe, path, action)).map((action) => action.id);
          if (!activeActions.length)
            context.addProblem("missing-fact", "/recipe/method");
          else
            actions.push({ step: node.id, actions: activeActions });
        }
      }
    instances.push({ component_path: v1PathArray(path), recipe: recipeIdentityV1(recipe), ingredients: activeIdsV1(context, recipe, path, recipe.ingredients), components: activeIdsV1(context, recipe, path, recipe.components), equipment: activeIdsV1(context, recipe, path, recipe.equipment), method, actions });
    for (const component of v1Objects(recipe.components))
      if (context.active(recipe, path, component)) {
        const child = context.bundleRecipe(v1Object(component.recipe));
        if (!child) {
          context.addProblem("unresolved-reference", context.unresolvedComponentPointer());
          return false;
        }
        if (!visit(child, v1JoinPath(path, String(component.id))))
          return false;
      }
    visiting.delete(reference);
    return true;
  };
  visit(context.root, "");
  return context.problems.length ? context.refusal() : { operation: context.operation, status: "ok", result: { active_instances: instances } };
}
function v1ResolveFormula(context) {
  const argumentsValue = v1Object(context.request.arguments);
  const formula = v1Find(context.root.formulas, String(argumentsValue.formula_id ?? ""));
  if (!formula)
    return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_id");
  const evaluation = context.formula(context.root, "", formula);
  if (!evaluation)
    return context.refusal();
  if (evaluation.selectedTotal.numerator === 0n)
    return { operation: context.operation, status: "not_applicable" };
  const quantities = publicV1FormulaQuantities(evaluation, integer(1n));
  if (!quantities)
    return context.refusal();
  return { operation: context.operation, status: "ok", formula_evaluations: [publicV1FormulaEvaluation("", evaluation)], result: { quantities } };
}
function v1Scale(context) {
  const argumentsValue = v1Object(context.request.arguments);
  const hasFactor = typeof argumentsValue.factor === "string";
  const target = v1Object(argumentsValue.formula_target);
  if (hasFactor === (target !== null))
    return refused(context.operation, "invalid-operation-arguments", "/arguments");
  let factor;
  if (hasFactor) {
    const parsed = positiveDecimal(String(argumentsValue.factor));
    if (typeof parsed === "string")
      return refused(context.operation, "invalid-operation-arguments", "/arguments/factor");
    factor = parsed;
  } else {
    const formula = v1Find(context.root.formulas, String(target.formula_id ?? ""));
    if (!formula)
      return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_target/formula_id");
    const evaluation = context.formula(context.root, "", formula);
    if (!evaluation || evaluation.selectedTotal.numerator <= 0n)
      return context.problems.length ? context.refusal() : refused(context.operation, "missing-fact", "/arguments/formula_target/formula_id");
    const quantity = v1Object(target.quantity);
    if (!quantity || quantity.kind !== "measured")
      return refused(context.operation, "unsupported-quantity-kind", "/arguments/formula_target/quantity");
    const value = positiveDecimal(String(quantity.value ?? ""));
    if (typeof value === "string")
      return refused(context.operation, value, "/arguments/formula_target/quantity/value");
    const converted = convert(value, String(quantity.unit ?? ""), evaluation.unit);
    if (typeof converted === "string")
      return refused(context.operation, converted, "/arguments/formula_target/quantity/unit");
    if (v1AnchorFixed(formula) && converted.numerator * evaluation.selectedTotal.denominator !== evaluation.selectedTotal.numerator * converted.denominator)
      return refused(context.operation, "invalid-operation-arguments", "/arguments/formula_target");
    factor = divide(converted, evaluation.selectedTotal);
  }
  const scaled = scaleV1Instance(context, context.root, "", factor, new Set([documentReferenceV1(context.root)]));
  if ("status" in scaled)
    return scaled;
  if (!scaled.quantities.length)
    return { operation: context.operation, status: "not_applicable" };
  return { operation: context.operation, status: "ok", ...scaled.formulaEvaluations.length ? { formula_evaluations: scaled.formulaEvaluations } : {}, result: { quantities: scaled.quantities, component_instances: scaled.instances } };
}
function scaleV1Instance(context, recipe, path, factor, visiting) {
  if (!context.enterInstance(recipe, path))
    return context.refusal();
  const formulaValues = new Map;
  const formulaEvaluations = [];
  for (const formula of v1Objects(recipe.formulas)) {
    const evaluation = context.formula(recipe, path, formula);
    if (!evaluation)
      return context.refusal();
    if (evaluation.selectedTotal.numerator === 0n)
      continue;
    const applied = v1AnchorFixed(formula) ? integer(1n) : factor;
    for (const item of evaluation.quantities)
      if (item.active) {
        const exact = multiply(item.value, applied);
        const value = formatCanonicalDecimal(exact);
        if (value === "resource-limit")
          return refused(context.operation, value, "/recipe/formulas");
        formulaValues.set(v1Key(item.input), { quantity: { kind: "measured", value, unit: item.unit }, exact, unit: item.unit });
      }
    formulaEvaluations.push(publicV1FormulaEvaluation(path, evaluation, applied));
  }
  const quantities = [];
  const instances = [];
  for (const [kind, collection] of [["ingredient", "ingredients"], ["component", "components"]])
    for (const [index, item] of v1Objects(recipe[collection]).entries()) {
      if (!context.active(recipe, path, item))
        continue;
      const input = { kind, id: item.id };
      let resolved = formulaValues.get(v1Key(input));
      if (!resolved) {
        const raw = v1Object(item.quantity);
        if (!raw)
          return refused(context.operation, "missing-fact", `/recipe/${collection}/${index}/quantity`);
        if (kind === "component" && raw.kind !== "measured")
          return refused(context.operation, "unsupported-quantity-kind", `/recipe/${collection}/${index}/quantity`);
        const scaled = scaleQuantity(raw, factor, `/recipe/${collection}/${index}/quantity`);
        if (isEnvelope(scaled))
          return scaled;
        let exact = integer(0n);
        if (raw.kind === "measured") {
          const parsed = parseCanonicalDecimal(String(raw.value));
          if (typeof parsed === "string")
            return refused(context.operation, parsed, `/recipe/${collection}/${index}/quantity/value`);
          exact = raw.scaling === "fixed" ? parsed : multiply(parsed, factor);
        }
        resolved = { quantity: scaled, exact, unit: String(raw.unit ?? "") };
      }
      quantities.push({ input, quantity: resolved.quantity });
      if (kind === "component") {
        const child = context.bundleRecipe(v1Object(item.recipe));
        if (!child)
          return refused(context.operation, "unresolved-reference", context.unresolvedComponentPointer());
        const output = v1Find(child.outputs, String(item.output));
        const yieldValue = v1Object(output?.yield);
        if (!yieldValue || yieldValue.kind !== "measured")
          return refused(context.operation, "missing-fact", `/recipe/components/${index}/output`);
        const parsedYield = positiveDecimal(String(yieldValue.value));
        if (typeof parsedYield === "string")
          return refused(context.operation, parsedYield, `/recipe/components/${index}/output`);
        const required = convert(resolved.exact, resolved.unit, String(yieldValue.unit));
        if (typeof required === "string")
          return refused(context.operation, required, `/recipe/components/${index}/quantity/unit`);
        const childFactor = divide(required, parsedYield);
        const reference = documentReferenceV1(child);
        if (visiting.has(reference))
          return refused(context.operation, "component-cycle", `/recipe/components/${index}/recipe`);
        visiting.add(reference);
        const childPath = v1JoinPath(path, String(item.id));
        const childScaled = scaleV1Instance(context, child, childPath, childFactor, visiting);
        visiting.delete(reference);
        if ("status" in childScaled)
          return childScaled;
        instances.push({ component_path: v1PathArray(childPath), recipe: item.recipe, output: item.output, quantity: resolved.quantity, quantities: childScaled.quantities }, ...childScaled.instances);
        formulaEvaluations.push(...childScaled.formulaEvaluations);
      }
    }
  return { quantities, instances, formulaEvaluations };
}
function v1MethodOperation(context, scheduleMode) {
  return scheduleMode ? composedScheduleV1(context) : composedReadingV1(context);
}
function v1StepKey(path, id) {
  return `${path}\x00${id}`;
}
function composedReadingV1(context) {
  const collected = collectReadingV1(context, context.root, "", new Set);
  if ("type" in collected)
    return { operation: context.operation, status: "refused", problems: [collected] };
  if (!collected.steps.length)
    return refused(context.operation, "missing-fact", "/recipe/method/sequence");
  const index = new Map(collected.steps.map((step, position) => [v1StepKey(step.path, step.id), position]));
  const indegree = collected.steps.map(() => 0);
  const dependents = collected.steps.map(() => []);
  for (const [position, step] of collected.steps.entries())
    for (const dependency of step.after) {
      const dependencyIndex = index.get(dependency);
      if (dependencyIndex === undefined)
        return refused(context.operation, "unresolved-reference", "/recipe/method");
      indegree[position] += 1;
      dependents[dependencyIndex].push(position);
    }
  const used = collected.steps.map(() => false);
  const result = [];
  while (result.length < collected.steps.length) {
    let selected = -1;
    for (const [position, step] of collected.steps.entries())
      if (!used[position] && indegree[position] === 0 && (selected < 0 || step.order < collected.steps[selected].order))
        selected = position;
    if (selected < 0)
      return refused(context.operation, "dependency-cycle", "/recipe/method");
    used[selected] = true;
    result.push({ component_path: v1PathArray(collected.steps[selected].path), id: collected.steps[selected].id });
    for (const dependent of dependents[selected])
      indegree[dependent] -= 1;
  }
  return { operation: context.operation, status: "ok", result: { steps: result, unplaced_components: collected.notices } };
}
function collectReadingV1(context, recipe, path, visiting) {
  if (!context.enterInstance(recipe, path))
    return context.problems[0];
  const reference = documentReferenceV1(recipe);
  if (visiting.has(reference))
    return { type: `${PROBLEM_BASE}component-cycle`, pointer: "/bundle/documents" };
  visiting.add(reference);
  const nodes = context.method(recipe, path);
  const roots = [];
  const byId = new Map;
  for (const node of nodes)
    if (node.kind === "step" && node.active) {
      const step = { path, id: node.id, after: v1Strings(node.object.after).filter((id) => nodes.some((candidate) => candidate.id === id && candidate.active)).map((id) => v1StepKey(path, id)), duration: 0n, start: 0n, end: 0n, order: 0, object: node.object };
      roots.push(step);
      byId.set(node.id, step);
    }
  const all = [];
  const notices = [];
  for (const component of v1Objects(recipe.components))
    if (context.active(recipe, path, component)) {
      const consumers = componentConsumersV1(nodes, String(component.id));
      const childPath = v1JoinPath(path, String(component.id));
      if (!consumers.length) {
        notices.push({ component_path: v1PathArray(childPath), reason: "not-consumed" });
        continue;
      }
      const child = context.bundleRecipe(v1Object(component.recipe));
      if (!child)
        return { type: `${PROBLEM_BASE}unresolved-reference`, pointer: context.unresolvedComponentPointer() };
      const collected = collectReadingV1(context, child, childPath, visiting);
      if ("type" in collected)
        return collected;
      const producer = outputProducerV1(context, child, childPath, String(component.output));
      if (typeof producer !== "string")
        return producer;
      for (const consumer of consumers)
        byId.get(consumer).after.push(v1StepKey(childPath, producer));
      all.push(...collected.steps);
      notices.push(...collected.notices);
    }
  all.push(...roots);
  all.forEach((step, index) => {
    step.order = index;
  });
  visiting.delete(reference);
  return { steps: all, notices };
}
function composedScheduleV1(context) {
  const collected = collectScheduleV1(context, context.root, "", new Set);
  if ("type" in collected)
    return { operation: context.operation, status: "refused", problems: [collected] };
  if (!collected.steps.length)
    return refused(context.operation, "missing-fact", "/recipe/method/sequence");
  let minimum = collected.steps[0].start;
  for (const step of collected.steps)
    if (step.start < minimum)
      minimum = step.start;
  for (const step of collected.steps) {
    step.start -= minimum;
    step.end -= minimum;
  }
  collected.steps.sort((left, right) => left.start < right.start ? -1 : left.start > right.start ? 1 : left.order - right.order);
  return { operation: context.operation, status: "ok", result: { steps: collected.steps.map((step) => ({ component_path: v1PathArray(step.path), id: step.id, start: formatElapsed(step.start), duration: formatElapsed(step.duration), end: formatElapsed(step.end) })), unscheduled_components: collected.notices } };
}
function collectScheduleV1(context, recipe, path, visiting) {
  if (!context.enterInstance(recipe, path))
    return context.problems[0];
  const reference = documentReferenceV1(recipe);
  if (visiting.has(reference))
    return { type: `${PROBLEM_BASE}component-cycle`, pointer: "/bundle/documents" };
  visiting.add(reference);
  const local = localScheduleV1(context, recipe, path);
  if ("type" in local)
    return local;
  const nodes = context.method(recipe, path);
  const notices = [];
  for (const component of v1Objects(recipe.components))
    if (context.active(recipe, path, component)) {
      const consumers = componentConsumersV1(nodes, String(component.id));
      const childPath = v1JoinPath(path, String(component.id));
      if (!consumers.length) {
        notices.push({ component_path: v1PathArray(childPath), reason: "not-consumed" });
        continue;
      }
      const child = context.bundleRecipe(v1Object(component.recipe));
      if (!child)
        return { type: `${PROBLEM_BASE}unresolved-reference`, pointer: context.unresolvedComponentPointer() };
      const childSchedule = collectScheduleV1(context, child, childPath, visiting);
      if ("type" in childSchedule)
        return childSchedule;
      const producerId = outputProducerV1(context, child, childPath, String(component.output));
      if (typeof producerId !== "string")
        return producerId;
      const producer = childSchedule.steps.find((step) => step.path === childPath && step.id === producerId);
      if (!producer)
        return { type: `${PROBLEM_BASE}missing-producer`, pointer: "/bundle/documents" };
      const starts = consumers.map((id) => local.find((step) => step.id === id).start);
      const earliest = starts.reduce((left, right) => left < right ? left : right);
      const shift = earliest - producer.end;
      for (const step of childSchedule.steps) {
        step.start += shift;
        step.end += shift;
      }
      local.push(...childSchedule.steps);
      notices.push(...childSchedule.notices);
    }
  visiting.delete(reference);
  return { steps: local, notices };
}
function localScheduleV1(context, recipe, path) {
  const nodes = context.method(recipe, path);
  const active = nodes.filter((node) => node.kind === "step" && node.active);
  const steps = active.map((node) => ({ id: node.id, after: v1Strings(node.object.after).filter((id) => active.some((candidate) => candidate.id === id)), duration: node.object.duration }));
  const order = topologicalOrder(steps);
  if (!Array.isArray(order))
    return { type: `${PROBLEM_BASE}dependency-cycle`, pointer: "/recipe/method" };
  const durations = [];
  for (const step of steps) {
    const duration = stepDuration(step.duration);
    if (typeof duration === "string")
      return { type: `${PROBLEM_BASE}${duration}`, pointer: "/recipe/method" };
    durations.push(duration);
  }
  const indexById = new Map(steps.map((step, index) => [step.id, index]));
  const ends = steps.map(() => 0n);
  const result = [];
  for (const [authoredOrder, index] of order.entries()) {
    let start = 0n;
    for (const dependency of steps[index].after ?? []) {
      const end2 = ends[indexById.get(dependency)];
      if (end2 > start)
        start = end2;
    }
    const end = start + durations[index];
    ends[index] = end;
    result.push({ path, id: steps[index].id, after: [], duration: durations[index], start, end, order: authoredOrder, object: active.find((node) => node.id === steps[index].id).object });
  }
  return result;
}
function componentConsumersV1(nodes, componentId) {
  return nodes.filter((node) => node.kind === "step" && node.active && v1Objects(node.object.uses).some((reference) => reference.kind === "component" && reference.id === componentId)).map((node) => node.id);
}
function outputProducerV1(context, recipe, path, outputId) {
  const producers = context.method(recipe, path).filter((node) => node.kind === "step" && node.active && v1Objects(node.object.produces).some((reference) => reference.kind === "output" && reference.id === outputId)).map((node) => node.id);
  return producers.length === 1 ? producers[0] : { type: `${PROBLEM_BASE}${producers.length ? "multiple-producers" : "missing-producer"}`, pointer: "/bundle/documents" };
}
function publicV1FormulaQuantities(evaluation, factor) {
  const result = [];
  for (const item of evaluation.quantities)
    if (item.active) {
      const value = formatCanonicalDecimal(multiply(item.value, factor));
      if (value === "resource-limit")
        return null;
      result.push({ input: item.input, quantity: { kind: "measured", value, unit: item.unit } });
    }
  return result;
}
function publicV1FormulaEvaluation(path, evaluation, factor) {
  const authored = formatCanonicalDecimal(evaluation.authoredTotal);
  const selected = formatCanonicalDecimal(evaluation.selectedTotal);
  const result = { component_path: v1PathArray(path), formula_id: evaluation.formula.id, authored_total: { kind: "measured", value: authored, unit: evaluation.unit }, selected_total: { kind: "measured", value: selected, unit: evaluation.unit } };
  if (factor)
    result.scaled_total = { kind: "measured", value: formatCanonicalDecimal(multiply(evaluation.selectedTotal, factor)), unit: evaluation.unit };
  return result;
}
function activeIdsV1(context, recipe, path, value) {
  return v1Objects(value).filter((item) => context.active(recipe, path, item)).map((item) => item.id);
}
function validV1Binding(parameter, value) {
  if (parameter.kind === "choice")
    return typeof value === "string" && v1Find(parameter.options, value) !== null;
  if (parameter.kind === "toggle")
    return typeof value === "boolean";
  const measurement = v1Object(value);
  return measurement?.kind === "measured" && typeof measurement.value === "string" && typeof measurement.unit === "string" && unitsCompatible(measurement.unit, String(parameter.unit));
}
function v1AnchorFixed(formula) {
  return v1Object(formula.kind === "ratio" ? formula.target : formula.basis_quantity)?.scaling === "fixed";
}
function recipeIdentityV1(recipe) {
  return { collection: recipe.collection, id: recipe.id, revision: recipe.revision, sha256: digestJcs(recipe) };
}
function documentReferenceV1(recipe) {
  return `${String(recipe.collection)}\x00${String(recipe.id)}\x00${String(recipe.revision)}\x00${digestJcs(recipe)}`;
}
function canonicalJcs(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("value is not I-JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map(canonicalJcs).join(",")}]`;
  if (typeof value !== "object" || value === undefined)
    throw new TypeError("value is not JSON");
  const record = value;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJcs(record[key])}`).join(",")}}`;
}
function canonicalJSON(value) {
  return canonicalJcs(value);
}
function canonicalSHA256(value) {
  return sha256(canonicalJcs(value));
}
function digestJcs(value) {
  return sha256(canonicalJcs(value));
}
function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const bitLength = BigInt(bytes.length) * 8n;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 128;
  for (let index = 0;index < 8; index += 1)
    data[paddedLength - 1 - index] = Number(bitLength >> BigInt(index * 8) & 0xffn);
  const constants = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
  const hash = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
  const rotate = (word, bits) => word >>> bits | word << 32 - bits;
  for (let offset = 0;offset < data.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0;index < 16; index += 1)
      words[index] = data[offset + index * 4] << 24 | data[offset + index * 4 + 1] << 16 | data[offset + index * 4 + 2] << 8 | data[offset + index * 4 + 3];
    for (let index = 16;index < 64; index += 1) {
      const s0 = rotate(words[index - 15], 7) ^ rotate(words[index - 15], 18) ^ words[index - 15] >>> 3;
      const s1 = rotate(words[index - 2], 17) ^ rotate(words[index - 2], 19) ^ words[index - 2] >>> 10;
      words[index] = words[index - 16] + s0 + words[index - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0;index < 64; index += 1) {
      const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = e & f ^ ~e & g;
      const t1 = h + s1 + choice + constants[index] + words[index] >>> 0;
      const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = a & b ^ a & c ^ b & c;
      const t2 = s0 + majority >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    hash[0] = hash[0] + a >>> 0;
    hash[1] = hash[1] + b >>> 0;
    hash[2] = hash[2] + c >>> 0;
    hash[3] = hash[3] + d >>> 0;
    hash[4] = hash[4] + e >>> 0;
    hash[5] = hash[5] + f >>> 0;
    hash[6] = hash[6] + g >>> 0;
    hash[7] = hash[7] + h >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

// node_modules/@cfworker/json-schema/dist/esm/deep-compare-strict.js
function deepCompareStrict(a, b) {
  const typeofa = typeof a;
  if (typeofa !== typeof b) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    const length = a.length;
    if (length !== b.length) {
      return false;
    }
    for (let i = 0;i < length; i++) {
      if (!deepCompareStrict(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeofa === "object") {
    if (!a || !b) {
      return a === b;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    const length = aKeys.length;
    if (length !== bKeys.length) {
      return false;
    }
    for (const k of aKeys) {
      if (!deepCompareStrict(a[k], b[k])) {
        return false;
      }
    }
    return true;
  }
  return a === b;
}

// node_modules/@cfworker/json-schema/dist/esm/pointer.js
function encodePointer(p) {
  return encodeURI(escapePointer(p));
}
function escapePointer(p) {
  return p.replace(/~/g, "~0").replace(/\//g, "~1");
}

// node_modules/@cfworker/json-schema/dist/esm/dereference.js
var schemaArrayKeyword = {
  prefixItems: true,
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
var schemaMapKeyword = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependentSchemas: true
};
var ignoredKeyword = {
  id: true,
  $id: true,
  $ref: true,
  $schema: true,
  $anchor: true,
  $vocabulary: true,
  $comment: true,
  default: true,
  enum: true,
  const: true,
  required: true,
  type: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
var initialBaseURI = typeof self !== "undefined" && self.location && self.location.origin !== "null" ? new URL(self.location.origin + self.location.pathname + location.search) : new URL("https://github.com/cfworker");
function dereference(schema, lookup = Object.create(null), baseURI = initialBaseURI, basePointer = "") {
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    const id = schema.$id || schema.id;
    if (id) {
      const url = new URL(id, baseURI.href);
      if (url.hash.length > 1) {
        lookup[url.href] = schema;
      } else {
        url.hash = "";
        if (basePointer === "") {
          baseURI = url;
        } else {
          dereference(schema, lookup, baseURI);
        }
      }
    }
  } else if (schema !== true && schema !== false) {
    return lookup;
  }
  const schemaURI = baseURI.href + (basePointer ? "#" + basePointer : "");
  if (lookup[schemaURI] !== undefined) {
    throw new Error(`Duplicate schema URI "${schemaURI}".`);
  }
  lookup[schemaURI] = schema;
  if (schema === true || schema === false) {
    return lookup;
  }
  if (schema.__absolute_uri__ === undefined) {
    Object.defineProperty(schema, "__absolute_uri__", {
      enumerable: false,
      value: schemaURI
    });
  }
  if (schema.$ref && schema.__absolute_ref__ === undefined) {
    const url = new URL(schema.$ref, baseURI.href);
    url.hash = url.hash;
    Object.defineProperty(schema, "__absolute_ref__", {
      enumerable: false,
      value: url.href
    });
  }
  if (schema.$recursiveRef && schema.__absolute_recursive_ref__ === undefined) {
    const url = new URL(schema.$recursiveRef, baseURI.href);
    url.hash = url.hash;
    Object.defineProperty(schema, "__absolute_recursive_ref__", {
      enumerable: false,
      value: url.href
    });
  }
  if (schema.$anchor) {
    const url = new URL("#" + schema.$anchor, baseURI.href);
    lookup[url.href] = schema;
  }
  for (let key in schema) {
    if (ignoredKeyword[key]) {
      continue;
    }
    const keyBase = `${basePointer}/${encodePointer(key)}`;
    const subSchema = schema[key];
    if (Array.isArray(subSchema)) {
      if (schemaArrayKeyword[key]) {
        const length = subSchema.length;
        for (let i = 0;i < length; i++) {
          dereference(subSchema[i], lookup, baseURI, `${keyBase}/${i}`);
        }
      }
    } else if (schemaMapKeyword[key]) {
      for (let subKey in subSchema) {
        dereference(subSchema[subKey], lookup, baseURI, `${keyBase}/${encodePointer(subKey)}`);
      }
    } else {
      dereference(subSchema, lookup, baseURI, keyBase);
    }
  }
  return lookup;
}

// node_modules/@cfworker/json-schema/dist/esm/format.js
var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
var URL_ = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;
var EMAIL = (input) => {
  if (input[0] === '"')
    return false;
  const [name, host, ...rest] = input.split("@");
  if (!name || !host || rest.length !== 0 || name.length > 64 || host.length > 253)
    return false;
  if (name[0] === "." || name.endsWith(".") || name.includes(".."))
    return false;
  if (!/^[a-z0-9.-]+$/i.test(host) || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(name))
    return false;
  return host.split(".").every((part) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(part));
};
var IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
var IPV6 = /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i;
var DURATION = (input) => input.length > 1 && input.length < 80 && (/^P\d+([.,]\d+)?W$/.test(input) || /^P[\dYMDTHS]*(\d[.,]\d+)?[YMDHS]$/.test(input) && /^P([.,\d]+Y)?([.,\d]+M)?([.,\d]+D)?(T([.,\d]+H)?([.,\d]+M)?([.,\d]+S)?)?$/.test(input));
function bind(r) {
  return r.test.bind(r);
}
var format = {
  date,
  time: time.bind(undefined, false),
  "date-time": date_time,
  duration: DURATION,
  uri,
  "uri-reference": bind(URIREF),
  "uri-template": bind(URITEMPLATE),
  url: bind(URL_),
  email: EMAIL,
  hostname: bind(HOSTNAME),
  ipv4: bind(IPV4),
  ipv6: bind(IPV6),
  regex,
  uuid: bind(UUID),
  "json-pointer": bind(JSON_POINTER),
  "json-pointer-uri-fragment": bind(JSON_POINTER_URI_FRAGMENT),
  "relative-json-pointer": bind(RELATIVE_JSON_POINTER)
};
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function date(str) {
  const matches = str.match(DATE);
  if (!matches)
    return false;
  const year = +matches[1];
  const month = +matches[2];
  const day = +matches[3];
  return month >= 1 && month <= 12 && day >= 1 && day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
function time(full, str) {
  const matches = str.match(TIME);
  if (!matches)
    return false;
  const hour = +matches[1];
  const minute = +matches[2];
  const second = +matches[3];
  const timeZone = !!matches[5];
  return (hour <= 23 && minute <= 59 && second <= 59 || hour == 23 && minute == 59 && second == 60) && (!full || timeZone);
}
var DATE_TIME_SEPARATOR = /t|\s/i;
function date_time(str) {
  const dateTime = str.split(DATE_TIME_SEPARATOR);
  return dateTime.length == 2 && date(dateTime[0]) && time(true, dateTime[1]);
}
var NOT_URI_FRAGMENT = /\/|:/;
var URI_PATTERN = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
function uri(str) {
  return NOT_URI_FRAGMENT.test(str) && URI_PATTERN.test(str);
}
var Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
  if (Z_ANCHOR.test(str))
    return false;
  try {
    new RegExp(str, "u");
    return true;
  } catch (e) {
    return false;
  }
}

// node_modules/@cfworker/json-schema/dist/esm/ucs2-length.js
function ucs2length(s) {
  let result = 0;
  let length = s.length;
  let index = 0;
  let charCode;
  while (index < length) {
    result++;
    charCode = s.charCodeAt(index++);
    if (charCode >= 55296 && charCode <= 56319 && index < length) {
      charCode = s.charCodeAt(index);
      if ((charCode & 64512) == 56320) {
        index++;
      }
    }
  }
  return result;
}

// node_modules/@cfworker/json-schema/dist/esm/validate.js
function validate(instance, schema, draft = "2019-09", lookup = dereference(schema), shortCircuit = true, recursiveAnchor = null, instanceLocation = "#", schemaLocation = "#", evaluated = Object.create(null)) {
  if (schema === true) {
    return { valid: true, errors: [] };
  }
  if (schema === false) {
    return {
      valid: false,
      errors: [
        {
          instanceLocation,
          keyword: "false",
          keywordLocation: instanceLocation,
          error: "False boolean schema."
        }
      ]
    };
  }
  const rawInstanceType = typeof instance;
  let instanceType;
  switch (rawInstanceType) {
    case "boolean":
    case "number":
    case "string":
      instanceType = rawInstanceType;
      break;
    case "object":
      if (instance === null) {
        instanceType = "null";
      } else if (Array.isArray(instance)) {
        instanceType = "array";
      } else {
        instanceType = "object";
      }
      break;
    default:
      throw new Error(`Instances of "${rawInstanceType}" type are not supported.`);
  }
  const { $ref, $recursiveRef, $recursiveAnchor, type: $type, const: $const, enum: $enum, required: $required, not: $not, anyOf: $anyOf, allOf: $allOf, oneOf: $oneOf, if: $if, then: $then, else: $else, format: $format, properties: $properties, patternProperties: $patternProperties, additionalProperties: $additionalProperties, unevaluatedProperties: $unevaluatedProperties, minProperties: $minProperties, maxProperties: $maxProperties, propertyNames: $propertyNames, dependentRequired: $dependentRequired, dependentSchemas: $dependentSchemas, dependencies: $dependencies, prefixItems: $prefixItems, items: $items, additionalItems: $additionalItems, unevaluatedItems: $unevaluatedItems, contains: $contains, minContains: $minContains, maxContains: $maxContains, minItems: $minItems, maxItems: $maxItems, uniqueItems: $uniqueItems, minimum: $minimum, maximum: $maximum, exclusiveMinimum: $exclusiveMinimum, exclusiveMaximum: $exclusiveMaximum, multipleOf: $multipleOf, minLength: $minLength, maxLength: $maxLength, pattern: $pattern, __absolute_ref__, __absolute_recursive_ref__ } = schema;
  const errors = [];
  if ($recursiveAnchor === true && recursiveAnchor === null) {
    recursiveAnchor = schema;
  }
  if ($recursiveRef === "#") {
    const refSchema = recursiveAnchor === null ? lookup[__absolute_recursive_ref__] : recursiveAnchor;
    const keywordLocation = `${schemaLocation}/$recursiveRef`;
    const result = validate(instance, recursiveAnchor === null ? schema : recursiveAnchor, draft, lookup, shortCircuit, refSchema, instanceLocation, keywordLocation, evaluated);
    if (!result.valid) {
      errors.push({
        instanceLocation,
        keyword: "$recursiveRef",
        keywordLocation,
        error: "A subschema had errors."
      }, ...result.errors);
    }
  }
  if ($ref !== undefined) {
    const uri2 = __absolute_ref__ || $ref;
    const refSchema = lookup[uri2];
    if (refSchema === undefined) {
      let message = `Unresolved $ref "${$ref}".`;
      if (__absolute_ref__ && __absolute_ref__ !== $ref) {
        message += `  Absolute URI "${__absolute_ref__}".`;
      }
      message += `
Known schemas:
- ${Object.keys(lookup).join(`
- `)}`;
      throw new Error(message);
    }
    const keywordLocation = `${schemaLocation}/$ref`;
    const result = validate(instance, refSchema, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation, evaluated);
    if (!result.valid) {
      errors.push({
        instanceLocation,
        keyword: "$ref",
        keywordLocation,
        error: "A subschema had errors."
      }, ...result.errors);
    }
    if (draft === "4" || draft === "7") {
      return { valid: errors.length === 0, errors };
    }
  }
  if (Array.isArray($type)) {
    let length = $type.length;
    let valid = false;
    for (let i = 0;i < length; i++) {
      if (instanceType === $type[i] || $type[i] === "integer" && instanceType === "number" && instance % 1 === 0 && instance === instance) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      errors.push({
        instanceLocation,
        keyword: "type",
        keywordLocation: `${schemaLocation}/type`,
        error: `Instance type "${instanceType}" is invalid. Expected "${$type.join('", "')}".`
      });
    }
  } else if ($type === "integer") {
    if (instanceType !== "number" || instance % 1 || instance !== instance) {
      errors.push({
        instanceLocation,
        keyword: "type",
        keywordLocation: `${schemaLocation}/type`,
        error: `Instance type "${instanceType}" is invalid. Expected "${$type}".`
      });
    }
  } else if ($type !== undefined && instanceType !== $type) {
    errors.push({
      instanceLocation,
      keyword: "type",
      keywordLocation: `${schemaLocation}/type`,
      error: `Instance type "${instanceType}" is invalid. Expected "${$type}".`
    });
  }
  if ($const !== undefined) {
    if (instanceType === "object" || instanceType === "array") {
      if (!deepCompareStrict(instance, $const)) {
        errors.push({
          instanceLocation,
          keyword: "const",
          keywordLocation: `${schemaLocation}/const`,
          error: `Instance does not match ${JSON.stringify($const)}.`
        });
      }
    } else if (instance !== $const) {
      errors.push({
        instanceLocation,
        keyword: "const",
        keywordLocation: `${schemaLocation}/const`,
        error: `Instance does not match ${JSON.stringify($const)}.`
      });
    }
  }
  if ($enum !== undefined) {
    if (instanceType === "object" || instanceType === "array") {
      if (!$enum.some((value) => deepCompareStrict(instance, value))) {
        errors.push({
          instanceLocation,
          keyword: "enum",
          keywordLocation: `${schemaLocation}/enum`,
          error: `Instance does not match any of ${JSON.stringify($enum)}.`
        });
      }
    } else if (!$enum.some((value) => instance === value)) {
      errors.push({
        instanceLocation,
        keyword: "enum",
        keywordLocation: `${schemaLocation}/enum`,
        error: `Instance does not match any of ${JSON.stringify($enum)}.`
      });
    }
  }
  if ($not !== undefined) {
    const keywordLocation = `${schemaLocation}/not`;
    const result = validate(instance, $not, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation);
    if (result.valid) {
      errors.push({
        instanceLocation,
        keyword: "not",
        keywordLocation,
        error: 'Instance matched "not" schema.'
      });
    }
  }
  let subEvaluateds = [];
  if ($anyOf !== undefined) {
    const keywordLocation = `${schemaLocation}/anyOf`;
    const errorsLength = errors.length;
    let anyValid = false;
    for (let i = 0;i < $anyOf.length; i++) {
      const subSchema = $anyOf[i];
      const subEvaluated = Object.create(evaluated);
      const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
      errors.push(...result.errors);
      anyValid = anyValid || result.valid;
      if (result.valid) {
        subEvaluateds.push(subEvaluated);
      }
    }
    if (anyValid) {
      errors.length = errorsLength;
    } else {
      errors.splice(errorsLength, 0, {
        instanceLocation,
        keyword: "anyOf",
        keywordLocation,
        error: "Instance does not match any subschemas."
      });
    }
  }
  if ($allOf !== undefined) {
    const keywordLocation = `${schemaLocation}/allOf`;
    const errorsLength = errors.length;
    let allValid = true;
    for (let i = 0;i < $allOf.length; i++) {
      const subSchema = $allOf[i];
      const subEvaluated = Object.create(evaluated);
      const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
      errors.push(...result.errors);
      allValid = allValid && result.valid;
      if (result.valid) {
        subEvaluateds.push(subEvaluated);
      }
    }
    if (allValid) {
      errors.length = errorsLength;
    } else {
      errors.splice(errorsLength, 0, {
        instanceLocation,
        keyword: "allOf",
        keywordLocation,
        error: `Instance does not match every subschema.`
      });
    }
  }
  if ($oneOf !== undefined) {
    const keywordLocation = `${schemaLocation}/oneOf`;
    const errorsLength = errors.length;
    const matches = $oneOf.filter((subSchema, i) => {
      const subEvaluated = Object.create(evaluated);
      const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
      errors.push(...result.errors);
      if (result.valid) {
        subEvaluateds.push(subEvaluated);
      }
      return result.valid;
    }).length;
    if (matches === 1) {
      errors.length = errorsLength;
    } else {
      errors.splice(errorsLength, 0, {
        instanceLocation,
        keyword: "oneOf",
        keywordLocation,
        error: `Instance does not match exactly one subschema (${matches} matches).`
      });
    }
  }
  if (instanceType === "object" || instanceType === "array") {
    Object.assign(evaluated, ...subEvaluateds);
  }
  if ($if !== undefined) {
    const keywordLocation = `${schemaLocation}/if`;
    const conditionResult = validate(instance, $if, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation, evaluated).valid;
    if (conditionResult) {
      if ($then !== undefined) {
        const thenResult = validate(instance, $then, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${schemaLocation}/then`, evaluated);
        if (!thenResult.valid) {
          errors.push({
            instanceLocation,
            keyword: "if",
            keywordLocation,
            error: `Instance does not match "then" schema.`
          }, ...thenResult.errors);
        }
      }
    } else if ($else !== undefined) {
      const elseResult = validate(instance, $else, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${schemaLocation}/else`, evaluated);
      if (!elseResult.valid) {
        errors.push({
          instanceLocation,
          keyword: "if",
          keywordLocation,
          error: `Instance does not match "else" schema.`
        }, ...elseResult.errors);
      }
    }
  }
  if (instanceType === "object") {
    if ($required !== undefined) {
      for (const key of $required) {
        if (!(key in instance)) {
          errors.push({
            instanceLocation,
            keyword: "required",
            keywordLocation: `${schemaLocation}/required`,
            error: `Instance does not have required property "${key}".`
          });
        }
      }
    }
    const keys = Object.keys(instance);
    if ($minProperties !== undefined && keys.length < $minProperties) {
      errors.push({
        instanceLocation,
        keyword: "minProperties",
        keywordLocation: `${schemaLocation}/minProperties`,
        error: `Instance does not have at least ${$minProperties} properties.`
      });
    }
    if ($maxProperties !== undefined && keys.length > $maxProperties) {
      errors.push({
        instanceLocation,
        keyword: "maxProperties",
        keywordLocation: `${schemaLocation}/maxProperties`,
        error: `Instance does not have at least ${$maxProperties} properties.`
      });
    }
    if ($propertyNames !== undefined) {
      const keywordLocation = `${schemaLocation}/propertyNames`;
      for (const key in instance) {
        const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
        const result = validate(key, $propertyNames, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
        if (!result.valid) {
          errors.push({
            instanceLocation,
            keyword: "propertyNames",
            keywordLocation,
            error: `Property name "${key}" does not match schema.`
          }, ...result.errors);
        }
      }
    }
    if ($dependentRequired !== undefined) {
      const keywordLocation = `${schemaLocation}/dependantRequired`;
      for (const key in $dependentRequired) {
        if (key in instance) {
          const required = $dependentRequired[key];
          for (const dependantKey of required) {
            if (!(dependantKey in instance)) {
              errors.push({
                instanceLocation,
                keyword: "dependentRequired",
                keywordLocation,
                error: `Instance has "${key}" but does not have "${dependantKey}".`
              });
            }
          }
        }
      }
    }
    if ($dependentSchemas !== undefined) {
      for (const key in $dependentSchemas) {
        const keywordLocation = `${schemaLocation}/dependentSchemas`;
        if (key in instance) {
          const result = validate(instance, $dependentSchemas[key], draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${keywordLocation}/${encodePointer(key)}`, evaluated);
          if (!result.valid) {
            errors.push({
              instanceLocation,
              keyword: "dependentSchemas",
              keywordLocation,
              error: `Instance has "${key}" but does not match dependant schema.`
            }, ...result.errors);
          }
        }
      }
    }
    if ($dependencies !== undefined) {
      const keywordLocation = `${schemaLocation}/dependencies`;
      for (const key in $dependencies) {
        if (key in instance) {
          const propsOrSchema = $dependencies[key];
          if (Array.isArray(propsOrSchema)) {
            for (const dependantKey of propsOrSchema) {
              if (!(dependantKey in instance)) {
                errors.push({
                  instanceLocation,
                  keyword: "dependencies",
                  keywordLocation,
                  error: `Instance has "${key}" but does not have "${dependantKey}".`
                });
              }
            }
          } else {
            const result = validate(instance, propsOrSchema, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${keywordLocation}/${encodePointer(key)}`);
            if (!result.valid) {
              errors.push({
                instanceLocation,
                keyword: "dependencies",
                keywordLocation,
                error: `Instance has "${key}" but does not match dependant schema.`
              }, ...result.errors);
            }
          }
        }
      }
    }
    const thisEvaluated = Object.create(null);
    let stop = false;
    if ($properties !== undefined) {
      const keywordLocation = `${schemaLocation}/properties`;
      for (const key in $properties) {
        if (!(key in instance)) {
          continue;
        }
        const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
        const result = validate(instance[key], $properties[key], draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, `${keywordLocation}/${encodePointer(key)}`);
        if (result.valid) {
          evaluated[key] = thisEvaluated[key] = true;
        } else {
          stop = shortCircuit;
          errors.push({
            instanceLocation,
            keyword: "properties",
            keywordLocation,
            error: `Property "${key}" does not match schema.`
          }, ...result.errors);
          if (stop)
            break;
        }
      }
    }
    if (!stop && $patternProperties !== undefined) {
      const keywordLocation = `${schemaLocation}/patternProperties`;
      for (const pattern in $patternProperties) {
        const regex2 = new RegExp(pattern, "u");
        const subSchema = $patternProperties[pattern];
        for (const key in instance) {
          if (!regex2.test(key)) {
            continue;
          }
          const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
          const result = validate(instance[key], subSchema, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, `${keywordLocation}/${encodePointer(pattern)}`);
          if (result.valid) {
            evaluated[key] = thisEvaluated[key] = true;
          } else {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "patternProperties",
              keywordLocation,
              error: `Property "${key}" matches pattern "${pattern}" but does not match associated schema.`
            }, ...result.errors);
          }
        }
      }
    }
    if (!stop && $additionalProperties !== undefined) {
      const keywordLocation = `${schemaLocation}/additionalProperties`;
      for (const key in instance) {
        if (thisEvaluated[key]) {
          continue;
        }
        const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
        const result = validate(instance[key], $additionalProperties, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
        if (result.valid) {
          evaluated[key] = true;
        } else {
          stop = shortCircuit;
          errors.push({
            instanceLocation,
            keyword: "additionalProperties",
            keywordLocation,
            error: `Property "${key}" does not match additional properties schema.`
          }, ...result.errors);
        }
      }
    } else if (!stop && $unevaluatedProperties !== undefined) {
      const keywordLocation = `${schemaLocation}/unevaluatedProperties`;
      for (const key in instance) {
        if (!evaluated[key]) {
          const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
          const result = validate(instance[key], $unevaluatedProperties, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
          if (result.valid) {
            evaluated[key] = true;
          } else {
            errors.push({
              instanceLocation,
              keyword: "unevaluatedProperties",
              keywordLocation,
              error: `Property "${key}" does not match unevaluated properties schema.`
            }, ...result.errors);
          }
        }
      }
    }
  } else if (instanceType === "array") {
    if ($maxItems !== undefined && instance.length > $maxItems) {
      errors.push({
        instanceLocation,
        keyword: "maxItems",
        keywordLocation: `${schemaLocation}/maxItems`,
        error: `Array has too many items (${instance.length} > ${$maxItems}).`
      });
    }
    if ($minItems !== undefined && instance.length < $minItems) {
      errors.push({
        instanceLocation,
        keyword: "minItems",
        keywordLocation: `${schemaLocation}/minItems`,
        error: `Array has too few items (${instance.length} < ${$minItems}).`
      });
    }
    const length = instance.length;
    let i = 0;
    let stop = false;
    if ($prefixItems !== undefined) {
      const keywordLocation = `${schemaLocation}/prefixItems`;
      const length2 = Math.min($prefixItems.length, length);
      for (;i < length2; i++) {
        const result = validate(instance[i], $prefixItems[i], draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, `${keywordLocation}/${i}`);
        evaluated[i] = true;
        if (!result.valid) {
          stop = shortCircuit;
          errors.push({
            instanceLocation,
            keyword: "prefixItems",
            keywordLocation,
            error: `Items did not match schema.`
          }, ...result.errors);
          if (stop)
            break;
        }
      }
    }
    if ($items !== undefined) {
      const keywordLocation = `${schemaLocation}/items`;
      if (Array.isArray($items)) {
        const length2 = Math.min($items.length, length);
        for (;i < length2; i++) {
          const result = validate(instance[i], $items[i], draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, `${keywordLocation}/${i}`);
          evaluated[i] = true;
          if (!result.valid) {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "items",
              keywordLocation,
              error: `Items did not match schema.`
            }, ...result.errors);
            if (stop)
              break;
          }
        }
      } else {
        for (;i < length; i++) {
          const result = validate(instance[i], $items, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation);
          evaluated[i] = true;
          if (!result.valid) {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "items",
              keywordLocation,
              error: `Items did not match schema.`
            }, ...result.errors);
            if (stop)
              break;
          }
        }
      }
      if (!stop && $additionalItems !== undefined) {
        const keywordLocation2 = `${schemaLocation}/additionalItems`;
        for (;i < length; i++) {
          const result = validate(instance[i], $additionalItems, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation2);
          evaluated[i] = true;
          if (!result.valid) {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "additionalItems",
              keywordLocation: keywordLocation2,
              error: `Items did not match additional items schema.`
            }, ...result.errors);
          }
        }
      }
    }
    if ($contains !== undefined) {
      if (length === 0 && $minContains === undefined) {
        errors.push({
          instanceLocation,
          keyword: "contains",
          keywordLocation: `${schemaLocation}/contains`,
          error: `Array is empty. It must contain at least one item matching the schema.`
        });
      } else if ($minContains !== undefined && length < $minContains) {
        errors.push({
          instanceLocation,
          keyword: "minContains",
          keywordLocation: `${schemaLocation}/minContains`,
          error: `Array has less items (${length}) than minContains (${$minContains}).`
        });
      } else {
        const keywordLocation = `${schemaLocation}/contains`;
        const errorsLength = errors.length;
        let contained = 0;
        for (let j = 0;j < length; j++) {
          const result = validate(instance[j], $contains, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${j}`, keywordLocation);
          if (result.valid) {
            evaluated[j] = true;
            contained++;
          } else {
            errors.push(...result.errors);
          }
        }
        if (contained >= ($minContains || 0)) {
          errors.length = errorsLength;
        }
        if ($minContains === undefined && $maxContains === undefined && contained === 0) {
          errors.splice(errorsLength, 0, {
            instanceLocation,
            keyword: "contains",
            keywordLocation,
            error: `Array does not contain item matching schema.`
          });
        } else if ($minContains !== undefined && contained < $minContains) {
          errors.push({
            instanceLocation,
            keyword: "minContains",
            keywordLocation: `${schemaLocation}/minContains`,
            error: `Array must contain at least ${$minContains} items matching schema. Only ${contained} items were found.`
          });
        } else if ($maxContains !== undefined && contained > $maxContains) {
          errors.push({
            instanceLocation,
            keyword: "maxContains",
            keywordLocation: `${schemaLocation}/maxContains`,
            error: `Array may contain at most ${$maxContains} items matching schema. ${contained} items were found.`
          });
        }
      }
    }
    if (!stop && $unevaluatedItems !== undefined) {
      const keywordLocation = `${schemaLocation}/unevaluatedItems`;
      for (i;i < length; i++) {
        if (evaluated[i]) {
          continue;
        }
        const result = validate(instance[i], $unevaluatedItems, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation);
        evaluated[i] = true;
        if (!result.valid) {
          errors.push({
            instanceLocation,
            keyword: "unevaluatedItems",
            keywordLocation,
            error: `Items did not match unevaluated items schema.`
          }, ...result.errors);
        }
      }
    }
    if ($uniqueItems) {
      for (let j = 0;j < length; j++) {
        const a = instance[j];
        const ao = typeof a === "object" && a !== null;
        for (let k = 0;k < length; k++) {
          if (j === k) {
            continue;
          }
          const b = instance[k];
          const bo = typeof b === "object" && b !== null;
          if (a === b || ao && bo && deepCompareStrict(a, b)) {
            errors.push({
              instanceLocation,
              keyword: "uniqueItems",
              keywordLocation: `${schemaLocation}/uniqueItems`,
              error: `Duplicate items at indexes ${j} and ${k}.`
            });
            j = Number.MAX_SAFE_INTEGER;
            k = Number.MAX_SAFE_INTEGER;
          }
        }
      }
    }
  } else if (instanceType === "number") {
    if (draft === "4") {
      if ($minimum !== undefined && ($exclusiveMinimum === true && instance <= $minimum || instance < $minimum)) {
        errors.push({
          instanceLocation,
          keyword: "minimum",
          keywordLocation: `${schemaLocation}/minimum`,
          error: `${instance} is less than ${$exclusiveMinimum ? "or equal to " : ""} ${$minimum}.`
        });
      }
      if ($maximum !== undefined && ($exclusiveMaximum === true && instance >= $maximum || instance > $maximum)) {
        errors.push({
          instanceLocation,
          keyword: "maximum",
          keywordLocation: `${schemaLocation}/maximum`,
          error: `${instance} is greater than ${$exclusiveMaximum ? "or equal to " : ""} ${$maximum}.`
        });
      }
    } else {
      if ($minimum !== undefined && instance < $minimum) {
        errors.push({
          instanceLocation,
          keyword: "minimum",
          keywordLocation: `${schemaLocation}/minimum`,
          error: `${instance} is less than ${$minimum}.`
        });
      }
      if ($maximum !== undefined && instance > $maximum) {
        errors.push({
          instanceLocation,
          keyword: "maximum",
          keywordLocation: `${schemaLocation}/maximum`,
          error: `${instance} is greater than ${$maximum}.`
        });
      }
      if ($exclusiveMinimum !== undefined && instance <= $exclusiveMinimum) {
        errors.push({
          instanceLocation,
          keyword: "exclusiveMinimum",
          keywordLocation: `${schemaLocation}/exclusiveMinimum`,
          error: `${instance} is less than ${$exclusiveMinimum}.`
        });
      }
      if ($exclusiveMaximum !== undefined && instance >= $exclusiveMaximum) {
        errors.push({
          instanceLocation,
          keyword: "exclusiveMaximum",
          keywordLocation: `${schemaLocation}/exclusiveMaximum`,
          error: `${instance} is greater than or equal to ${$exclusiveMaximum}.`
        });
      }
    }
    if ($multipleOf !== undefined) {
      const remainder = instance % $multipleOf;
      if (Math.abs(0 - remainder) >= 0.00000011920929 && Math.abs($multipleOf - remainder) >= 0.00000011920929) {
        errors.push({
          instanceLocation,
          keyword: "multipleOf",
          keywordLocation: `${schemaLocation}/multipleOf`,
          error: `${instance} is not a multiple of ${$multipleOf}.`
        });
      }
    }
  } else if (instanceType === "string") {
    const length = $minLength === undefined && $maxLength === undefined ? 0 : ucs2length(instance);
    if ($minLength !== undefined && length < $minLength) {
      errors.push({
        instanceLocation,
        keyword: "minLength",
        keywordLocation: `${schemaLocation}/minLength`,
        error: `String is too short (${length} < ${$minLength}).`
      });
    }
    if ($maxLength !== undefined && length > $maxLength) {
      errors.push({
        instanceLocation,
        keyword: "maxLength",
        keywordLocation: `${schemaLocation}/maxLength`,
        error: `String is too long (${length} > ${$maxLength}).`
      });
    }
    if ($pattern !== undefined && !new RegExp($pattern, "u").test(instance)) {
      errors.push({
        instanceLocation,
        keyword: "pattern",
        keywordLocation: `${schemaLocation}/pattern`,
        error: `String does not match pattern.`
      });
    }
    if ($format !== undefined && format[$format] && !format[$format](instance)) {
      errors.push({
        instanceLocation,
        keyword: "format",
        keywordLocation: `${schemaLocation}/format`,
        error: `String does not match format "${$format}".`
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

// node_modules/@cfworker/json-schema/dist/esm/validator.js
class Validator {
  schema;
  draft;
  shortCircuit;
  lookup;
  constructor(schema, draft = "2019-09", shortCircuit = true) {
    this.schema = schema;
    this.draft = draft;
    this.shortCircuit = shortCircuit;
    this.lookup = dereference(schema);
  }
  validate(instance) {
    return validate(instance, this.schema, this.draft, this.lookup, this.shortCircuit);
  }
  addSchema(schema, id) {
    if (id) {
      schema = { ...schema, $id: id };
    }
    dereference(schema, this.lookup);
  }
}

// src/engine.ts
var PROBLEM_BASE2 = "https://schemami.dev/problems/";
var knownUnits = new Set([
  "1",
  "g",
  "kg",
  "mL",
  "L",
  "Cel",
  "[degF]",
  "[cup_us]",
  "[tbs_us]",
  "[tsp_us]",
  "[foz_us]",
  "[cup_m]"
]);
var MEDIA_FRAGMENTS_SPECIFICATION = "https://www.w3.org/TR/media-frags/";
var object = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
var list = (value) => Array.isArray(value) ? value : [];
function problem(code, pointer, message) {
  return { type: `${PROBLEM_BASE2}${code}`, ...pointer === undefined ? {} : { pointer }, message };
}
function pointerOf(instanceLocation) {
  return instanceLocation.startsWith("#") ? instanceLocation.slice(1) : instanceLocation;
}
function named(items, pointer, problems) {
  const result = new Map;
  for (const [index, value] of list(items).entries()) {
    const item = object(value);
    if (!item)
      continue;
    const id = String(item.id ?? "");
    if (result.has(id)) {
      problems.push(problem("invalid-document", `${pointer}/${index}/id`, `Duplicate local id ${id}.`));
    } else {
      result.set(id, item);
    }
  }
  return result;
}
function resolvePointer(root, pointer) {
  if (pointer === "")
    return true;
  if (!pointer.startsWith("/"))
    return false;
  let current = root;
  for (const rawToken of pointer.slice(1).split("/")) {
    if (/(?:~$|~[^01])/.test(rawToken))
      return false;
    const token = rawToken.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(token) || Number(token) >= current.length)
        return false;
      current = current[Number(token)];
    } else {
      const record = object(current);
      if (!record || !Object.hasOwn(record, token))
        return false;
      current = record[token];
    }
  }
  return true;
}
function decimalUnits(value) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, "0"));
}
function validateQuantity(quantity, pointer, problems) {
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
function structuralProblems(document) {
  const problems = [];
  for (const [index, value] of list(document.ingredients).entries()) {
    const quantity = object(object(value)?.quantity);
    if (quantity?.kind === "open")
      validateQuantity(quantity, `/ingredients/${index}/quantity`, problems);
  }
  const formula = object(document.formula);
  if (formula) {
    for (const field of ["target", "basis_quantity"]) {
      const quantity = object(formula[field]);
      if (quantity?.kind === "open")
        validateQuantity(quantity, `/formula/${field}`, problems);
    }
  }
  return problems;
}
function parseNptTime(value) {
  if (!/^(?:[0-9]+(?:\.[0-9]+)?|[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?|[0-9]+:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?)$/.test(value))
    return null;
  const parts = value.split(":");
  const secondsText = parts.at(-1);
  const [wholeSeconds, fraction = ""] = secondsText.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  let numerator = BigInt(wholeSeconds) * denominator + BigInt(fraction || "0");
  if (parts.length >= 2) {
    const minutes = BigInt(parts.at(-2));
    if (minutes > 59n || BigInt(wholeSeconds) > 59n)
      return null;
    numerator += minutes * 60n * denominator;
  }
  if (parts.length === 3)
    numerator += BigInt(parts[0]) * 3600n * denominator;
  return { numerator, denominator };
}
function validateSelector(selector, pointer, problems) {
  if (selector.conforms_to !== MEDIA_FRAGMENTS_SPECIFICATION)
    return;
  for (const component of String(selector.value ?? "").split("&")) {
    if (!component.startsWith("t="))
      continue;
    const raw = component.slice(2).replace(/^npt:/, "");
    const parts = raw.split(",");
    if (parts.length > 2 || parts.length === 0 || parts.length === 2 && parts[1] === "") {
      problems.push(problem("invalid-document", pointer, "Invalid W3C media temporal fragment."));
      continue;
    }
    const start = parts[0] === "" ? null : parseNptTime(parts[0]);
    const end = parts.length === 2 ? parseNptTime(parts[1]) : null;
    if (parts[0] !== "" && !start || parts.length === 2 && !end || !start && !end) {
      problems.push(problem("invalid-document", pointer, "Invalid W3C normal play time."));
      continue;
    }
    if (start && end && start.numerator * end.denominator >= end.numerator * start.denominator) {
      problems.push(problem("invalid-document", pointer, "W3C media temporal fragment start must be less than end."));
    }
  }
}
function semanticProblemsV1(document, budgets = { recursiveLevels: 64, semanticOccurrences: 1e4, analysisStates: 1e4 }, budgetState = createAnalysisBudgetState(), options = {}) {
  const problems = [];
  const add2 = (code, pointer, message) => {
    problems.push(problem(code, pointer, message));
  };
  try {
    Intl.getCanonicalLocales(String(document.content_language ?? ""));
  } catch {
    add2("invalid-document", "/content_language", "content_language is not a well-formed BCP 47 tag.");
  }
  const origin = object(document.origin);
  if (origin && typeof origin.country === "string" && typeof origin.subdivision === "string" && !origin.subdivision.startsWith(`${origin.country}-`))
    add2("invalid-document", "/origin/subdivision", "Subdivision must belong to origin country.");
  const collections = new Map;
  for (const name of ["parameters", "ingredients", "components", "preparations", "outputs", "techniques", "equipment", "formulas", "sources", "evidence"])
    collections.set(name, named(document[name], `/${name}`, problems));
  const parameters = collections.get("parameters");
  for (const [index, parameter] of list(document.parameters).map(object).entries())
    if (parameter) {
      if (parameter.kind === "choice") {
        const seen = new Set;
        for (const [optionIndex, option] of list(parameter.options).map(object).entries())
          if (option) {
            const id = String(option.id);
            if (seen.has(id))
              add2("invalid-document", `/parameters/${index}/options/${optionIndex}/id`, `Duplicate option ${id}.`);
            seen.add(id);
          }
        if (typeof parameter.default === "string" && !seen.has(parameter.default))
          add2("unresolved-reference", `/parameters/${index}/default`, `Unknown option ${parameter.default}.`);
      }
    }
  let semanticObjects = 0;
  const objectStack = [document];
  while (objectStack.length) {
    const current = objectStack.pop();
    if (Array.isArray(current))
      objectStack.push(...current);
    else {
      const record = object(current);
      if (record) {
        semanticObjects += 1;
        for (const [name, child] of Object.entries(record))
          if (!name.startsWith("x-"))
            objectStack.push(child);
      }
    }
  }
  if (options.chargeStaticSemanticOccurrences !== false)
    budgetState.semanticOccurrences += semanticObjects;
  if (budgetState.semanticOccurrences > budgets.semanticOccurrences)
    return [problem("resource-limit", undefined, "Document exceeds the configured semantic-occurrence budget.")];
  const method = [];
  const methodIDs = new Map;
  const stack = [...list(object(document.method)?.sequence).entries()].reverse().map(([index, value]) => ({ value, pointer: `/method/sequence/${index}`, depth: 1 }));
  while (stack.length) {
    const current = stack.pop();
    const value = object(current.value);
    if (!value)
      continue;
    if (current.depth > budgets.recursiveLevels) {
      add2("resource-limit", current.pointer, "Method exceeds the configured recursive-depth budget.");
      break;
    }
    const id = String(value.id);
    const prior = methodIDs.get(id);
    if (prior)
      add2("invalid-document", `${current.pointer}/id`, `Duplicate method id ${id}; first declared at ${prior}.`);
    else
      methodIDs.set(id, current.pointer);
    method.push({ kind: String(value.kind), id, value, pointer: current.pointer });
    if (value.kind === "section")
      for (const [index, child] of [...list(value.sequence).entries()].reverse())
        stack.push({ value: child, pointer: `${current.pointer}/sequence/${index}`, depth: current.depth + 1 });
  }
  if (problems.some((item) => item.type === `${PROBLEM_BASE2}resource-limit`))
    return [problem("resource-limit", "", "Document exceeds the configured recursive-depth budget.")];
  const steps = new Map(method.filter((entry) => entry.kind === "step").map((entry) => [entry.id, entry]));
  const resourceCollection = (kind) => kind === "preparation" ? "preparations" : kind === "output" ? "outputs" : kind === "equipment" ? "equipment" : `${kind}s`;
  const validateReference = (reference, pointer) => {
    const collection = resourceCollection(String(reference.kind));
    if (!collections.get(collection)?.has(String(reference.id)))
      add2("unresolved-reference", pointer, `Unknown ${String(reference.kind)} ${String(reference.id)}.`);
  };
  const validateActivation = (activation, pointer, depth = 1) => {
    if (depth > budgets.recursiveLevels) {
      add2("resource-limit", pointer, "Activation exceeds the configured recursive-depth budget.");
      return;
    }
    const kind = String(activation.kind);
    if (["choice_is", "toggle_is", "measurement_compare"].includes(kind)) {
      const parameter = parameters.get(String(activation.parameter));
      const expected = kind === "choice_is" ? "choice" : kind === "toggle_is" ? "toggle" : "measurement";
      if (!parameter)
        add2("unresolved-reference", `${pointer}/parameter`, `Unknown parameter ${String(activation.parameter)}.`);
      else if (parameter.kind !== expected)
        add2("invalid-document", pointer, `${kind} requires a ${expected} parameter.`);
      else if (kind === "choice_is" && !list(parameter.options).map(object).some((option) => option?.id === activation.option))
        add2("unresolved-reference", `${pointer}/option`, `Unknown option ${String(activation.option)}.`);
    } else if (kind === "all" || kind === "any")
      list(activation.conditions).map(object).forEach((condition, index) => {
        if (condition)
          validateActivation(condition, `${pointer}/conditions/${index}`, depth + 1);
      });
    else if (kind === "not") {
      const condition = object(activation.condition);
      if (condition)
        validateActivation(condition, `${pointer}/condition`, depth + 1);
    }
  };
  const validateCompletion = (completion, pointer, depth = 1) => {
    if (depth > budgets.recursiveLevels) {
      add2("resource-limit", pointer, "Completion exceeds the configured recursive-depth budget.");
      return;
    }
    if (completion.kind === "all" || completion.kind === "any")
      list(completion.conditions).map(object).forEach((condition, index) => {
        if (condition)
          validateCompletion(condition, `${pointer}/conditions/${index}`, depth + 1);
      });
  };
  const activationSites = [];
  for (const collection of ["ingredients", "components", "equipment"])
    list(document[collection]).map(object).forEach((value, index) => {
      const activation = object(value?.activation);
      if (activation)
        activationSites.push([activation, `/${collection}/${index}/activation`]);
    });
  for (const entry of method) {
    const timing = object(entry.value.relative_timing);
    if (timing && !steps.has(String(timing.anchor_step)))
      add2("unresolved-reference", `${entry.pointer}/relative_timing/anchor_step`, `Unknown step ${String(timing.anchor_step)}.`);
    const activation = object(entry.value.activation);
    if (activation)
      activationSites.push([activation, `${entry.pointer}/activation`]);
    const completion = object(entry.value.completion);
    if (completion)
      validateCompletion(completion, `${entry.pointer}/completion`);
    if (entry.kind !== "step")
      continue;
    for (const dependency of list(entry.value.after).map(String))
      if (dependency === entry.id || !steps.has(dependency))
        add2("unresolved-reference", `${entry.pointer}/after`, `Invalid step dependency ${dependency}.`);
    for (const field of ["uses", "produces"])
      list(entry.value[field]).map(object).forEach((reference, index) => {
        if (reference)
          validateReference(reference, `${entry.pointer}/${field}/${index}`);
      });
    for (const field of ["techniques", "equipment"])
      list(entry.value[field]).map(String).forEach((id) => {
        if (!collections.get(field)?.has(id))
          add2("unresolved-reference", `${entry.pointer}/${field}`, `Unknown ${field} ${id}.`);
      });
    if (validateDurationWindow(entry.value.duration))
      add2("invalid-document", `${entry.pointer}/duration`, "Duration window is not ordered.");
    const parentUses = new Set(list(entry.value.uses).map(object).filter(Boolean).map((reference) => `${String(reference.kind)}\x00${String(reference.id)}`));
    const parentProduces = new Set(list(entry.value.produces).map(object).filter(Boolean).map((reference) => `${String(reference.kind)}\x00${String(reference.id)}`));
    const actionIDs = new Set;
    for (const [actionIndex, action] of list(entry.value.actions).map(object).entries())
      if (action) {
        const actionID = String(action.id);
        if (actionIDs.has(actionID))
          add2("invalid-document", `${entry.pointer}/actions/${actionIndex}/id`, `Duplicate action ${actionID}.`);
        actionIDs.add(actionID);
        const actionActivation = object(action.activation);
        if (actionActivation)
          activationSites.push([actionActivation, `${entry.pointer}/actions/${actionIndex}/activation`]);
        const actionCompletion = object(action.completion);
        if (actionCompletion)
          validateCompletion(actionCompletion, `${entry.pointer}/actions/${actionIndex}/completion`);
        for (const field of ["uses", "produces"])
          list(action[field]).map(object).forEach((reference, index) => {
            if (!reference)
              return;
            validateReference(reference, `${entry.pointer}/actions/${actionIndex}/${field}/${index}`);
            const key = `${String(reference.kind)}\x00${String(reference.id)}`;
            if (!(field === "uses" ? parentUses : parentProduces).has(key))
              add2("invalid-document", `${entry.pointer}/actions/${actionIndex}/${field}/${index}`, "Action references must be a subset of the containing step.");
          });
      }
  }
  activationSites.forEach(([activation, pointer]) => validateActivation(activation, pointer));
  if (problems.some((item) => item.type === `${PROBLEM_BASE2}resource-limit`))
    return [problem("resource-limit", "", "Document exceeds the configured recursive-depth budget.")];
  const claimed = new Map;
  for (const [formulaIndex, formula] of list(document.formulas).map(object).entries())
    if (formula) {
      const seen = new Set;
      const basis = object(formula.basis);
      const basisKey = basis ? `${String(basis.kind)}\x00${String(basis.id)}` : "";
      let basisIndex = -1;
      if (basis)
        validateReference(basis, `/formulas/${formulaIndex}/basis`);
      for (const [termIndex, term] of list(formula.terms).map(object).entries())
        if (term) {
          const input = object(term.input);
          validateReference(input, `/formulas/${formulaIndex}/terms/${termIndex}/input`);
          const key = `${String(input.kind)}\x00${String(input.id)}`;
          if (seen.has(key))
            add2("invalid-document", `/formulas/${formulaIndex}/terms/${termIndex}/input`, "Formula repeats an input.");
          seen.add(key);
          if (claimed.has(key))
            add2("invalid-document", `/formulas/${formulaIndex}/terms/${termIndex}/input`, "Input has more than one formula authority.");
          claimed.set(key, String(formula.id));
          const collection = collections.get(resourceCollection(String(input.kind)));
          if (object(collection?.get(String(input.id))?.quantity))
            add2("invalid-document", `/formulas/${formulaIndex}/terms/${termIndex}/input`, "Formula input also has an explicit quantity.");
          if (key === basisKey)
            basisIndex = termIndex;
        }
      if (formula.kind === "percentage" && (basisIndex < 0 || object(list(formula.terms)[basisIndex])?.percentage !== "100"))
        add2("invalid-document", `/formulas/${formulaIndex}/basis`, "Percentage basis must occur once at 100 percent.");
    }
  for (const [index, component] of list(document.components).map(object).entries())
    if (component) {
      const key = `component\x00${String(component.id)}`;
      if (Object.hasOwn(component, "quantity") === claimed.has(key))
        add2("invalid-document", `/components/${index}`, "Component must have exactly one quantity authority.");
    }
  const walk = [{ value: document, pointer: "" }];
  while (walk.length) {
    const current = walk.pop();
    if (Array.isArray(current.value))
      current.value.forEach((child, index) => walk.push({ value: child, pointer: `${current.pointer}/${index}` }));
    else {
      const record = object(current.value);
      if (!record)
        continue;
      if (["measured", "range", "open"].includes(String(record.kind)))
        validateQuantity(record, current.pointer, problems);
      for (const [key, child] of Object.entries(record))
        if (!key.startsWith("x-"))
          walk.push({ value: child, pointer: `${current.pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}` });
    }
  }
  const sources = collections.get("sources");
  for (const [index, evidence] of list(document.evidence).map(object).entries())
    if (evidence) {
      if (typeof evidence.source === "string" && !sources.has(evidence.source))
        add2("unresolved-reference", `/evidence/${index}/source`, `Unknown evidence source ${evidence.source}.`);
      const pointer = String(evidence.pointer ?? "");
      if (!resolvePointer(document, pointer))
        add2("invalid-document", `/evidence/${index}/pointer`, "Evidence pointer does not identify an existing value.");
      const selector = object(evidence.selector);
      if (selector)
        validateSelector(selector, `/evidence/${index}/selector`, problems);
    }
  for (const graphProblem of validateReachableGraphs(document, budgets, budgetState, semanticObjects))
    problems.push({ ...graphProblem, message: "Reachable active graph violates a Schemami invariant." });
  if (problems.some((item) => item.type === `${PROBLEM_BASE2}resource-limit`))
    return [problem("resource-limit", "", "Document exceeds the configured request budget.")];
  const unique = new Map;
  for (const item of problems)
    unique.set(`${item.pointer ?? ""}\x00${item.type}`, item);
  return [...unique.values()].sort((left, right) => (left.pointer ?? "") < (right.pointer ?? "") ? -1 : (left.pointer ?? "") > (right.pointer ?? "") ? 1 : left.type < right.type ? -1 : left.type > right.type ? 1 : 0);
}
function createSchemamiEngine(schema) {
  const validator = new Validator(schema, "2020-12", false);
  return {
    version: 1,
    async analyze(text, budgets = { recursiveLevels: 64, semanticOccurrences: 1e4, analysisStates: 1e4 }, budgetState = createAnalysisBudgetState(), options = {}) {
      let value = null;
      try {
        value = object(JSON.parse(text));
      } catch (error) {
        return { parse: { ok: false, errors: [{ message: error instanceof Error ? error.message : "invalid JSON" }] }, documents: [] };
      }
      if (!value)
        return { parse: { ok: false, errors: [{ message: "document root must be an object" }] }, documents: [] };
      let problems = [];
      if (Object.hasOwn(value, "rcp"))
        problems = [problem("unsupported-legacy", "", "RCP input is not supported by Schemami v1.")];
      else {
        problems = structuralProblems(value);
        if (problems.length === 0) {
          const result = validator.validate(value);
          problems = result.errors.map((error) => problem("invalid-document", pointerOf(error.instanceLocation), error.error));
        }
        if (problems.length === 0)
          problems = semanticProblemsV1(value, budgets, budgetState, options);
      }
      return { parse: { ok: true, errors: [] }, documents: [{ id: String(value.id ?? ""), valid: problems.length === 0, problems, canonical: value }] };
    },
    scale: (document, factor) => evaluateRequest("scale", { recipe: document, arguments: { factor } }),
    resolveFormula: (document, formulaId) => evaluateRequest("resolve_formula", { recipe: document, arguments: { formula_id: formulaId } }),
    schedule: (document) => evaluateRequest("schedule", { recipe: document, arguments: {} })
  };
}

// src/generated.ts
var EMBEDDED_SCHEMA = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://schemami.dev/schema/schemami/1/core.schema.json", title: "Schemami Core v1", $ref: "#/$defs/recipe", $defs: { localId: { type: "string", minLength: 1, maxLength: 128, pattern: "^[a-z0-9][a-z0-9_-]*$" }, decimal: { type: "string", pattern: "^(?:0|-?(?:0\\.[0-9]{0,3}[1-9]|[1-9][0-9]{0,15}|[1-9][0-9]{0,14}\\.[1-9]|[1-9][0-9]{0,13}\\.[0-9][1-9]|[1-9][0-9]{0,12}\\.[0-9]{0,2}[1-9]|[1-9][0-9]{0,11}\\.[0-9]{0,3}[1-9]))$" }, positiveDecimal: { type: "string", pattern: "^(?:0\\.[0-9]{0,3}[1-9]|[1-9][0-9]{0,15}|[1-9][0-9]{0,14}\\.[1-9]|[1-9][0-9]{0,13}\\.[0-9][1-9]|[1-9][0-9]{0,12}\\.[0-9]{0,2}[1-9]|[1-9][0-9]{0,11}\\.[0-9]{0,3}[1-9])$" }, confidence: { type: "string", pattern: "^(?:0|0\\.(?:[0-9]{0,3}[1-9])|1)$" }, duration: { type: "string", pattern: "^P(?:(?:[1-9][0-9]*W)|(?:[1-9][0-9]*D(?:T(?:[1-9][0-9]*H(?:[1-9][0-9]*M(?:[1-9][0-9]*S)?)?|[1-9][0-9]*M(?:[1-9][0-9]*S)?|[1-9][0-9]*S))?)?|T(?:[1-9][0-9]*H(?:[1-9][0-9]*M(?:[1-9][0-9]*S)?)?|[1-9][0-9]*M(?:[1-9][0-9]*S)?|[1-9][0-9]*S))$" }, notes: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } }, externalReferences: { type: "array", minItems: 1, items: { type: "string", format: "uri" }, uniqueItems: true }, durationWindow: { type: "object", minProperties: 1, additionalProperties: false, properties: { minimum: { $ref: "#/$defs/duration" }, target: { $ref: "#/$defs/duration" }, maximum: { $ref: "#/$defs/duration" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, measuredQuantity: { type: "object", required: ["kind", "value", "unit"], additionalProperties: false, properties: { kind: { const: "measured" }, value: { $ref: "#/$defs/positiveDecimal" }, unit: { type: "string", minLength: 1 }, scaling: { enum: ["linear", "fixed"] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, yieldQuantity: { type: "object", required: ["kind", "value", "unit"], additionalProperties: false, properties: { kind: { const: "measured" }, value: { $ref: "#/$defs/positiveDecimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, signedMeasured: { type: "object", required: ["kind", "value", "unit"], additionalProperties: false, properties: { kind: { const: "measured" }, value: { $ref: "#/$defs/decimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, signedRange: { type: "object", required: ["kind", "minimum", "maximum", "unit"], additionalProperties: false, properties: { kind: { const: "range" }, minimum: { $ref: "#/$defs/decimal" }, maximum: { $ref: "#/$defs/decimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, measurement: { oneOf: [{ $ref: "#/$defs/signedMeasured" }, { $ref: "#/$defs/signedRange" }] }, quantityGuide: { oneOf: [{ $ref: "#/$defs/measuredQuantity" }, { type: "object", required: ["kind", "minimum", "maximum", "unit"], additionalProperties: false, properties: { kind: { const: "range" }, minimum: { $ref: "#/$defs/positiveDecimal" }, maximum: { $ref: "#/$defs/positiveDecimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, quantity: { oneOf: [{ $ref: "#/$defs/measuredQuantity" }, { type: "object", required: ["kind", "minimum", "maximum", "unit"], additionalProperties: false, properties: { kind: { const: "range" }, minimum: { $ref: "#/$defs/positiveDecimal" }, maximum: { $ref: "#/$defs/positiveDecimal" }, unit: { type: "string", minLength: 1 }, scaling: { enum: ["linear", "fixed"] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "qualifier"], additionalProperties: false, properties: { kind: { const: "open" }, qualifier: { enum: ["to_taste", "as_needed", "to_consistency"] }, guide: { $ref: "#/$defs/quantityGuide" }, scaling: { enum: ["linear", "fixed"] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, entity: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/notes" }, external_references: { $ref: "#/$defs/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, equipmentEntity: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, activation: { $ref: "#/$defs/activation" }, notes: { $ref: "#/$defs/notes" }, external_references: { $ref: "#/$defs/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, alternativeOption: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/notes" }, external_references: { $ref: "#/$defs/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, alternatives: { type: "object", required: ["options"], additionalProperties: false, properties: { options: { type: "array", minItems: 2, items: { $ref: "#/$defs/alternativeOption" } }, default: { $ref: "#/$defs/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, ingredient: { type: "object", required: ["id"], oneOf: [{ required: ["name"] }, { required: ["alternatives"] }], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, alternatives: { $ref: "#/$defs/alternatives" }, quantity: { $ref: "#/$defs/quantity" }, activation: { $ref: "#/$defs/activation" }, notes: { $ref: "#/$defs/notes" }, external_references: { $ref: "#/$defs/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, recipeReference: { type: "object", required: ["collection", "id", "revision", "sha256"], additionalProperties: false, properties: { collection: { $ref: "#/$defs/localId" }, id: { $ref: "#/$defs/localId" }, revision: { type: "integer", minimum: 1 }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, inputReference: { type: "object", required: ["kind", "id"], additionalProperties: false, properties: { kind: { enum: ["ingredient", "component"] }, id: { $ref: "#/$defs/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, useReference: { type: "object", required: ["kind", "id"], additionalProperties: false, properties: { kind: { enum: ["ingredient", "component", "preparation"] }, id: { $ref: "#/$defs/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, produceReference: { type: "object", required: ["kind", "id"], additionalProperties: false, properties: { kind: { enum: ["preparation", "output"] }, id: { $ref: "#/$defs/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, choiceOption: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, parameter: { oneOf: [{ type: "object", required: ["id", "kind", "name", "options"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, kind: { const: "choice" }, name: { type: "string", minLength: 1 }, options: { type: "array", minItems: 2, items: { $ref: "#/$defs/choiceOption" } }, default: { $ref: "#/$defs/localId" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["id", "kind", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, kind: { const: "toggle" }, name: { type: "string", minLength: 1 }, default: { type: "boolean" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["id", "kind", "name", "unit"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, kind: { const: "measurement" }, name: { type: "string", minLength: 1 }, unit: { type: "string", minLength: 1 }, default: { $ref: "#/$defs/signedMeasured" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, activation: { oneOf: [{ type: "object", required: ["kind", "parameter", "option"], additionalProperties: false, properties: { kind: { const: "choice_is" }, parameter: { $ref: "#/$defs/localId" }, option: { $ref: "#/$defs/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "parameter", "enabled"], additionalProperties: false, properties: { kind: { const: "toggle_is" }, parameter: { $ref: "#/$defs/localId" }, enabled: { type: "boolean" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "parameter", "operator", "measurement"], additionalProperties: false, properties: { kind: { const: "measurement_compare" }, parameter: { $ref: "#/$defs/localId" }, operator: { enum: ["equal", "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal"] }, measurement: { $ref: "#/$defs/signedMeasured" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "conditions"], additionalProperties: false, properties: { kind: { enum: ["all", "any"] }, conditions: { type: "array", minItems: 2, items: { $ref: "#/$defs/activation" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "condition"], additionalProperties: false, properties: { kind: { const: "not" }, condition: { $ref: "#/$defs/activation" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, completion: { oneOf: [{ type: "object", required: ["kind", "cue"], additionalProperties: false, properties: { kind: { const: "observation" }, cue: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "name", "target"], additionalProperties: false, properties: { kind: { const: "measurement" }, name: { type: "string", minLength: 1 }, target: { $ref: "#/$defs/measurement" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "conditions"], additionalProperties: false, properties: { kind: { enum: ["all", "any"] }, conditions: { type: "array", minItems: 2, items: { $ref: "#/$defs/completion" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, guidance: { type: "object", required: ["cue", "instruction"], additionalProperties: false, properties: { cue: { type: "string", minLength: 1 }, instruction: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, environmentMeasurement: { type: "object", required: ["name", "target"], additionalProperties: false, properties: { name: { type: "string", minLength: 1 }, target: { $ref: "#/$defs/measurement" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, environment: { type: "object", minProperties: 1, additionalProperties: false, properties: { location: { type: "string", minLength: 1 }, measurements: { type: "array", minItems: 1, items: { $ref: "#/$defs/environmentMeasurement" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, relativeTiming: { type: "object", required: ["anchor_step", "relation", "offset"], additionalProperties: false, properties: { anchor_step: { $ref: "#/$defs/localId" }, relation: { enum: ["before", "after"] }, offset: { oneOf: [{ type: "object", required: ["kind", "duration"], additionalProperties: false, properties: { kind: { const: "elapsed" }, duration: { $ref: "#/$defs/duration" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "days"], additionalProperties: false, properties: { kind: { const: "calendar_days" }, days: { type: "integer", minimum: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, action: { type: "object", required: ["id", "instruction"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, instruction: { type: "string", minLength: 1 }, uses: { type: "array", minItems: 1, items: { $ref: "#/$defs/useReference" }, uniqueItems: true }, produces: { type: "array", minItems: 1, items: { $ref: "#/$defs/produceReference" }, uniqueItems: true }, techniques: { type: "array", minItems: 1, items: { $ref: "#/$defs/localId" }, uniqueItems: true }, equipment: { type: "array", minItems: 1, items: { $ref: "#/$defs/localId" }, uniqueItems: true }, completion: { $ref: "#/$defs/completion" }, guidance: { type: "array", minItems: 1, items: { $ref: "#/$defs/guidance" } }, environment: { $ref: "#/$defs/environment" }, activation: { $ref: "#/$defs/activation" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, step: { type: "object", required: ["kind", "id"], oneOf: [{ required: ["instruction"] }, { required: ["actions"] }], additionalProperties: false, properties: { kind: { const: "step" }, id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, instruction: { type: "string", minLength: 1 }, actions: { type: "array", minItems: 1, items: { $ref: "#/$defs/action" } }, after: { type: "array", minItems: 1, items: { $ref: "#/$defs/localId" }, uniqueItems: true }, uses: { type: "array", minItems: 1, items: { $ref: "#/$defs/useReference" }, uniqueItems: true }, produces: { type: "array", minItems: 1, items: { $ref: "#/$defs/produceReference" }, uniqueItems: true }, duration: { oneOf: [{ $ref: "#/$defs/duration" }, { $ref: "#/$defs/durationWindow" }] }, techniques: { type: "array", minItems: 1, items: { $ref: "#/$defs/localId" }, uniqueItems: true }, equipment: { type: "array", minItems: 1, items: { $ref: "#/$defs/localId" }, uniqueItems: true }, completion: { $ref: "#/$defs/completion" }, guidance: { type: "array", minItems: 1, items: { $ref: "#/$defs/guidance" } }, environment: { $ref: "#/$defs/environment" }, activation: { $ref: "#/$defs/activation" }, relative_timing: { $ref: "#/$defs/relativeTiming" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, section: { type: "object", required: ["kind", "id", "name", "sequence"], additionalProperties: false, properties: { kind: { const: "section" }, id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, sequence: { type: "array", minItems: 1, items: { $ref: "#/$defs/methodNode" } }, environment: { $ref: "#/$defs/environment" }, activation: { $ref: "#/$defs/activation" }, relative_timing: { $ref: "#/$defs/relativeTiming" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, methodNode: { oneOf: [{ $ref: "#/$defs/section" }, { $ref: "#/$defs/step" }] }, method: { type: "object", required: ["sequence"], additionalProperties: false, properties: { sequence: { type: "array", items: { $ref: "#/$defs/methodNode" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, preparation: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, output: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, yield: { $ref: "#/$defs/yieldQuantity" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, component: { type: "object", required: ["id", "name", "recipe", "output"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, recipe: { $ref: "#/$defs/recipeReference" }, output: { $ref: "#/$defs/localId" }, quantity: { $ref: "#/$defs/quantity" }, activation: { $ref: "#/$defs/activation" }, notes: { $ref: "#/$defs/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, formula: { oneOf: [{ type: "object", required: ["id", "kind", "terms"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, kind: { const: "ratio" }, terms: { type: "array", minItems: 2, items: { type: "object", required: ["input", "parts"], additionalProperties: false, properties: { input: { $ref: "#/$defs/inputReference" }, parts: { $ref: "#/$defs/positiveDecimal" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } }, target: { $ref: "#/$defs/measuredQuantity" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["id", "kind", "basis", "terms"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, name: { type: "string", minLength: 1 }, kind: { const: "percentage" }, basis: { $ref: "#/$defs/inputReference" }, terms: { type: "array", minItems: 1, items: { type: "object", required: ["input", "percentage"], additionalProperties: false, properties: { input: { $ref: "#/$defs/inputReference" }, percentage: { $ref: "#/$defs/positiveDecimal" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } }, basis_quantity: { $ref: "#/$defs/measuredQuantity" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, source: { type: "object", required: ["id", "uri"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, uri: { type: "string", minLength: 1, format: "uri-reference" }, media_type: { type: "string", minLength: 3, maxLength: 255 }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, selector: { type: "object", required: ["kind", "value", "conforms_to"], additionalProperties: false, properties: { kind: { const: "fragment" }, value: { type: "string", minLength: 1, maxLength: 2048, pattern: "^[^#]+$" }, conforms_to: { type: "string", format: "uri" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, evidence: { type: "object", required: ["id", "pointer"], additionalProperties: false, properties: { id: { $ref: "#/$defs/localId" }, source: { $ref: "#/$defs/localId" }, pointer: { type: "string", pattern: "^(?:$|/(?:[^~/]|~[01])*)+$" }, raw_text: { type: "string" }, confidence: { $ref: "#/$defs/confidence" }, selector: { $ref: "#/$defs/selector" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, origin: { type: "object", minProperties: 1, anyOf: [{ required: ["country"] }, { required: ["subdivision"] }, { required: ["locality"] }], additionalProperties: false, properties: { country: { type: "string", pattern: "^[A-Z]{2}$" }, subdivision: { type: "string", pattern: "^[A-Z]{2}-[A-Z0-9]{1,3}$" }, locality: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, lineage: { type: "object", required: ["derived_from"], additionalProperties: false, properties: { derived_from: { type: "array", minItems: 1, items: { $ref: "#/$defs/recipeReference" }, uniqueItems: true } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, recipe: { type: "object", required: ["schemami", "collection", "id", "revision", "content_language", "title", "ingredients", "method"], additionalProperties: false, properties: { schemami: { const: "1" }, collection: { $ref: "#/$defs/localId" }, id: { $ref: "#/$defs/localId" }, revision: { type: "integer", minimum: 1 }, content_language: { type: "string", minLength: 2, maxLength: 128 }, title: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/notes" }, origin: { $ref: "#/$defs/origin" }, parameters: { type: "array", minItems: 1, items: { $ref: "#/$defs/parameter" } }, ingredients: { type: "array", items: { $ref: "#/$defs/ingredient" } }, components: { type: "array", minItems: 1, items: { $ref: "#/$defs/component" } }, preparations: { type: "array", minItems: 1, items: { $ref: "#/$defs/preparation" } }, outputs: { type: "array", minItems: 1, items: { $ref: "#/$defs/output" } }, techniques: { type: "array", minItems: 1, items: { $ref: "#/$defs/entity" } }, equipment: { type: "array", minItems: 1, items: { $ref: "#/$defs/equipmentEntity" } }, formulas: { type: "array", minItems: 1, items: { $ref: "#/$defs/formula" } }, method: { $ref: "#/$defs/method" }, lineage: { $ref: "#/$defs/lineage" }, sources: { type: "array", minItems: 1, items: { $ref: "#/$defs/source" } }, evidence: { type: "array", minItems: 1, items: { $ref: "#/$defs/evidence" } }, external_references: { $ref: "#/$defs/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } } };
var EMBEDDED_BUNDLE_SCHEMA = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://schemami.dev/schema/schemami/1/bundle.schema.json", title: "Schemami Bundle v1", type: "object", required: ["schemami", "root", "documents"], additionalProperties: false, properties: { schemami: { const: "1" }, root: { $ref: "#/$defs/core/recipeReference" }, documents: { type: "array", minItems: 1, maxItems: 1024, items: { type: "object", required: ["sha256", "document"], additionalProperties: false, properties: { sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, document: { $ref: "#/$defs/core/recipe" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} }, $defs: { core: { localId: { type: "string", minLength: 1, maxLength: 128, pattern: "^[a-z0-9][a-z0-9_-]*$" }, decimal: { type: "string", pattern: "^(?:0|-?(?:0\\.[0-9]{0,3}[1-9]|[1-9][0-9]{0,15}|[1-9][0-9]{0,14}\\.[1-9]|[1-9][0-9]{0,13}\\.[0-9][1-9]|[1-9][0-9]{0,12}\\.[0-9]{0,2}[1-9]|[1-9][0-9]{0,11}\\.[0-9]{0,3}[1-9]))$" }, positiveDecimal: { type: "string", pattern: "^(?:0\\.[0-9]{0,3}[1-9]|[1-9][0-9]{0,15}|[1-9][0-9]{0,14}\\.[1-9]|[1-9][0-9]{0,13}\\.[0-9][1-9]|[1-9][0-9]{0,12}\\.[0-9]{0,2}[1-9]|[1-9][0-9]{0,11}\\.[0-9]{0,3}[1-9])$" }, confidence: { type: "string", pattern: "^(?:0|0\\.(?:[0-9]{0,3}[1-9])|1)$" }, duration: { type: "string", pattern: "^P(?:(?:[1-9][0-9]*W)|(?:[1-9][0-9]*D(?:T(?:[1-9][0-9]*H(?:[1-9][0-9]*M(?:[1-9][0-9]*S)?)?|[1-9][0-9]*M(?:[1-9][0-9]*S)?|[1-9][0-9]*S))?)?|T(?:[1-9][0-9]*H(?:[1-9][0-9]*M(?:[1-9][0-9]*S)?)?|[1-9][0-9]*M(?:[1-9][0-9]*S)?|[1-9][0-9]*S))$" }, notes: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } }, externalReferences: { type: "array", minItems: 1, items: { type: "string", format: "uri" }, uniqueItems: true }, durationWindow: { type: "object", minProperties: 1, additionalProperties: false, properties: { minimum: { $ref: "#/$defs/core/duration" }, target: { $ref: "#/$defs/core/duration" }, maximum: { $ref: "#/$defs/core/duration" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, measuredQuantity: { type: "object", required: ["kind", "value", "unit"], additionalProperties: false, properties: { kind: { const: "measured" }, value: { $ref: "#/$defs/core/positiveDecimal" }, unit: { type: "string", minLength: 1 }, scaling: { enum: ["linear", "fixed"] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, yieldQuantity: { type: "object", required: ["kind", "value", "unit"], additionalProperties: false, properties: { kind: { const: "measured" }, value: { $ref: "#/$defs/core/positiveDecimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, signedMeasured: { type: "object", required: ["kind", "value", "unit"], additionalProperties: false, properties: { kind: { const: "measured" }, value: { $ref: "#/$defs/core/decimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, signedRange: { type: "object", required: ["kind", "minimum", "maximum", "unit"], additionalProperties: false, properties: { kind: { const: "range" }, minimum: { $ref: "#/$defs/core/decimal" }, maximum: { $ref: "#/$defs/core/decimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, measurement: { oneOf: [{ $ref: "#/$defs/core/signedMeasured" }, { $ref: "#/$defs/core/signedRange" }] }, quantityGuide: { oneOf: [{ $ref: "#/$defs/core/measuredQuantity" }, { type: "object", required: ["kind", "minimum", "maximum", "unit"], additionalProperties: false, properties: { kind: { const: "range" }, minimum: { $ref: "#/$defs/core/positiveDecimal" }, maximum: { $ref: "#/$defs/core/positiveDecimal" }, unit: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, quantity: { oneOf: [{ $ref: "#/$defs/core/measuredQuantity" }, { type: "object", required: ["kind", "minimum", "maximum", "unit"], additionalProperties: false, properties: { kind: { const: "range" }, minimum: { $ref: "#/$defs/core/positiveDecimal" }, maximum: { $ref: "#/$defs/core/positiveDecimal" }, unit: { type: "string", minLength: 1 }, scaling: { enum: ["linear", "fixed"] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "qualifier"], additionalProperties: false, properties: { kind: { const: "open" }, qualifier: { enum: ["to_taste", "as_needed", "to_consistency"] }, guide: { $ref: "#/$defs/core/quantityGuide" }, scaling: { enum: ["linear", "fixed"] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, entity: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/core/notes" }, external_references: { $ref: "#/$defs/core/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, equipmentEntity: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, activation: { $ref: "#/$defs/core/activation" }, notes: { $ref: "#/$defs/core/notes" }, external_references: { $ref: "#/$defs/core/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, alternativeOption: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/core/notes" }, external_references: { $ref: "#/$defs/core/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, alternatives: { type: "object", required: ["options"], additionalProperties: false, properties: { options: { type: "array", minItems: 2, items: { $ref: "#/$defs/core/alternativeOption" } }, default: { $ref: "#/$defs/core/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, ingredient: { type: "object", required: ["id"], oneOf: [{ required: ["name"] }, { required: ["alternatives"] }], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, alternatives: { $ref: "#/$defs/core/alternatives" }, quantity: { $ref: "#/$defs/core/quantity" }, activation: { $ref: "#/$defs/core/activation" }, notes: { $ref: "#/$defs/core/notes" }, external_references: { $ref: "#/$defs/core/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, recipeReference: { type: "object", required: ["collection", "id", "revision", "sha256"], additionalProperties: false, properties: { collection: { $ref: "#/$defs/core/localId" }, id: { $ref: "#/$defs/core/localId" }, revision: { type: "integer", minimum: 1 }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, inputReference: { type: "object", required: ["kind", "id"], additionalProperties: false, properties: { kind: { enum: ["ingredient", "component"] }, id: { $ref: "#/$defs/core/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, useReference: { type: "object", required: ["kind", "id"], additionalProperties: false, properties: { kind: { enum: ["ingredient", "component", "preparation"] }, id: { $ref: "#/$defs/core/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, produceReference: { type: "object", required: ["kind", "id"], additionalProperties: false, properties: { kind: { enum: ["preparation", "output"] }, id: { $ref: "#/$defs/core/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, choiceOption: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, parameter: { oneOf: [{ type: "object", required: ["id", "kind", "name", "options"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, kind: { const: "choice" }, name: { type: "string", minLength: 1 }, options: { type: "array", minItems: 2, items: { $ref: "#/$defs/core/choiceOption" } }, default: { $ref: "#/$defs/core/localId" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["id", "kind", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, kind: { const: "toggle" }, name: { type: "string", minLength: 1 }, default: { type: "boolean" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["id", "kind", "name", "unit"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, kind: { const: "measurement" }, name: { type: "string", minLength: 1 }, unit: { type: "string", minLength: 1 }, default: { $ref: "#/$defs/core/signedMeasured" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, activation: { oneOf: [{ type: "object", required: ["kind", "parameter", "option"], additionalProperties: false, properties: { kind: { const: "choice_is" }, parameter: { $ref: "#/$defs/core/localId" }, option: { $ref: "#/$defs/core/localId" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "parameter", "enabled"], additionalProperties: false, properties: { kind: { const: "toggle_is" }, parameter: { $ref: "#/$defs/core/localId" }, enabled: { type: "boolean" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "parameter", "operator", "measurement"], additionalProperties: false, properties: { kind: { const: "measurement_compare" }, parameter: { $ref: "#/$defs/core/localId" }, operator: { enum: ["equal", "less_than", "less_than_or_equal", "greater_than", "greater_than_or_equal"] }, measurement: { $ref: "#/$defs/core/signedMeasured" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "conditions"], additionalProperties: false, properties: { kind: { enum: ["all", "any"] }, conditions: { type: "array", minItems: 2, items: { $ref: "#/$defs/core/activation" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "condition"], additionalProperties: false, properties: { kind: { const: "not" }, condition: { $ref: "#/$defs/core/activation" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, completion: { oneOf: [{ type: "object", required: ["kind", "cue"], additionalProperties: false, properties: { kind: { const: "observation" }, cue: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "name", "target"], additionalProperties: false, properties: { kind: { const: "measurement" }, name: { type: "string", minLength: 1 }, target: { $ref: "#/$defs/core/measurement" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "conditions"], additionalProperties: false, properties: { kind: { enum: ["all", "any"] }, conditions: { type: "array", minItems: 2, items: { $ref: "#/$defs/core/completion" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, guidance: { type: "object", required: ["cue", "instruction"], additionalProperties: false, properties: { cue: { type: "string", minLength: 1 }, instruction: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, environmentMeasurement: { type: "object", required: ["name", "target"], additionalProperties: false, properties: { name: { type: "string", minLength: 1 }, target: { $ref: "#/$defs/core/measurement" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, environment: { type: "object", minProperties: 1, additionalProperties: false, properties: { location: { type: "string", minLength: 1 }, measurements: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/environmentMeasurement" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, relativeTiming: { type: "object", required: ["anchor_step", "relation", "offset"], additionalProperties: false, properties: { anchor_step: { $ref: "#/$defs/core/localId" }, relation: { enum: ["before", "after"] }, offset: { oneOf: [{ type: "object", required: ["kind", "duration"], additionalProperties: false, properties: { kind: { const: "elapsed" }, duration: { $ref: "#/$defs/core/duration" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["kind", "days"], additionalProperties: false, properties: { kind: { const: "calendar_days" }, days: { type: "integer", minimum: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, action: { type: "object", required: ["id", "instruction"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, instruction: { type: "string", minLength: 1 }, uses: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/useReference" }, uniqueItems: true }, produces: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/produceReference" }, uniqueItems: true }, techniques: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/localId" }, uniqueItems: true }, equipment: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/localId" }, uniqueItems: true }, completion: { $ref: "#/$defs/core/completion" }, guidance: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/guidance" } }, environment: { $ref: "#/$defs/core/environment" }, activation: { $ref: "#/$defs/core/activation" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, step: { type: "object", required: ["kind", "id"], oneOf: [{ required: ["instruction"] }, { required: ["actions"] }], additionalProperties: false, properties: { kind: { const: "step" }, id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, instruction: { type: "string", minLength: 1 }, actions: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/action" } }, after: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/localId" }, uniqueItems: true }, uses: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/useReference" }, uniqueItems: true }, produces: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/produceReference" }, uniqueItems: true }, duration: { oneOf: [{ $ref: "#/$defs/core/duration" }, { $ref: "#/$defs/core/durationWindow" }] }, techniques: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/localId" }, uniqueItems: true }, equipment: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/localId" }, uniqueItems: true }, completion: { $ref: "#/$defs/core/completion" }, guidance: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/guidance" } }, environment: { $ref: "#/$defs/core/environment" }, activation: { $ref: "#/$defs/core/activation" }, relative_timing: { $ref: "#/$defs/core/relativeTiming" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, section: { type: "object", required: ["kind", "id", "name", "sequence"], additionalProperties: false, properties: { kind: { const: "section" }, id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, sequence: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/methodNode" } }, environment: { $ref: "#/$defs/core/environment" }, activation: { $ref: "#/$defs/core/activation" }, relative_timing: { $ref: "#/$defs/core/relativeTiming" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, methodNode: { oneOf: [{ $ref: "#/$defs/core/section" }, { $ref: "#/$defs/core/step" }] }, method: { type: "object", required: ["sequence"], additionalProperties: false, properties: { sequence: { type: "array", items: { $ref: "#/$defs/core/methodNode" } } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, preparation: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, output: { type: "object", required: ["id", "name"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, yield: { $ref: "#/$defs/core/yieldQuantity" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, component: { type: "object", required: ["id", "name", "recipe", "output"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, recipe: { $ref: "#/$defs/core/recipeReference" }, output: { $ref: "#/$defs/core/localId" }, quantity: { $ref: "#/$defs/core/quantity" }, activation: { $ref: "#/$defs/core/activation" }, notes: { $ref: "#/$defs/core/notes" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, formula: { oneOf: [{ type: "object", required: ["id", "kind", "terms"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, kind: { const: "ratio" }, terms: { type: "array", minItems: 2, items: { type: "object", required: ["input", "parts"], additionalProperties: false, properties: { input: { $ref: "#/$defs/core/inputReference" }, parts: { $ref: "#/$defs/core/positiveDecimal" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } }, target: { $ref: "#/$defs/core/measuredQuantity" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, { type: "object", required: ["id", "kind", "basis", "terms"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, name: { type: "string", minLength: 1 }, kind: { const: "percentage" }, basis: { $ref: "#/$defs/core/inputReference" }, terms: { type: "array", minItems: 1, items: { type: "object", required: ["input", "percentage"], additionalProperties: false, properties: { input: { $ref: "#/$defs/core/inputReference" }, percentage: { $ref: "#/$defs/core/positiveDecimal" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } }, basis_quantity: { $ref: "#/$defs/core/measuredQuantity" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }] }, source: { type: "object", required: ["id", "uri"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, uri: { type: "string", minLength: 1, format: "uri-reference" }, media_type: { type: "string", minLength: 3, maxLength: 255 }, sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, selector: { type: "object", required: ["kind", "value", "conforms_to"], additionalProperties: false, properties: { kind: { const: "fragment" }, value: { type: "string", minLength: 1, maxLength: 2048, pattern: "^[^#]+$" }, conforms_to: { type: "string", format: "uri" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, evidence: { type: "object", required: ["id", "pointer"], additionalProperties: false, properties: { id: { $ref: "#/$defs/core/localId" }, source: { $ref: "#/$defs/core/localId" }, pointer: { type: "string", pattern: "^(?:$|/(?:[^~/]|~[01])*)+$" }, raw_text: { type: "string" }, confidence: { $ref: "#/$defs/core/confidence" }, selector: { $ref: "#/$defs/core/selector" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, origin: { type: "object", minProperties: 1, anyOf: [{ required: ["country"] }, { required: ["subdivision"] }, { required: ["locality"] }], additionalProperties: false, properties: { country: { type: "string", pattern: "^[A-Z]{2}$" }, subdivision: { type: "string", pattern: "^[A-Z]{2}-[A-Z0-9]{1,3}$" }, locality: { type: "string", minLength: 1 } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, lineage: { type: "object", required: ["derived_from"], additionalProperties: false, properties: { derived_from: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/recipeReference" }, uniqueItems: true } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } }, recipe: { type: "object", required: ["schemami", "collection", "id", "revision", "content_language", "title", "ingredients", "method"], additionalProperties: false, properties: { schemami: { const: "1" }, collection: { $ref: "#/$defs/core/localId" }, id: { $ref: "#/$defs/core/localId" }, revision: { type: "integer", minimum: 1 }, content_language: { type: "string", minLength: 2, maxLength: 128 }, title: { type: "string", minLength: 1 }, notes: { $ref: "#/$defs/core/notes" }, origin: { $ref: "#/$defs/core/origin" }, parameters: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/parameter" } }, ingredients: { type: "array", items: { $ref: "#/$defs/core/ingredient" } }, components: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/component" } }, preparations: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/preparation" } }, outputs: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/output" } }, techniques: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/entity" } }, equipment: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/equipmentEntity" } }, formulas: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/formula" } }, method: { $ref: "#/$defs/core/method" }, lineage: { $ref: "#/$defs/core/lineage" }, sources: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/source" } }, evidence: { type: "array", minItems: 1, items: { $ref: "#/$defs/core/evidence" } }, external_references: { $ref: "#/$defs/core/externalReferences" } }, patternProperties: { "^x-[a-z0-9]+(?:-[a-z0-9]+)*$": {} } } } } };

// src/core.ts
var protocolFloor = Object.freeze({
  recursiveLevels: 64,
  semanticOccurrences: 1e4,
  analysisStates: 1e4,
  bundleDocuments: 1024,
  selectedComponentInstances: 1024
});
var PROBLEM_BASE3 = "https://schemami.dev/problems/";
var constructionToken = Symbol("schemami-admission");
var parsedHandles = new WeakSet;
var admittedRecipeHandles = new WeakSet;
var admittedBundleHandles = new WeakSet;

class ParsedDocument {
  #submitted;
  #value;
  constructor(submitted, value, token) {
    if (token !== constructionToken)
      throw new TypeError("Schemami handles must be created by parse/admit");
    this.#submitted = submitted.slice();
    this.#value = clone(value);
    parsedHandles.add(this);
  }
  get submittedJSON() {
    return this.#submitted.slice();
  }
  get value() {
    return clone(this.#value);
  }
  static parse(input, _budgets = protocolFloor) {
    let text;
    let bytes;
    try {
      if (typeof input === "string") {
        text = input;
        bytes = new TextEncoder().encode(input);
      } else {
        bytes = input.slice();
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      }
      scanStrictJSON(text);
      const value = JSON.parse(text);
      if (!isObject(value) || hasLoneSurrogate(value) || hasInvalidNumber(value))
        return refusal("invalid-document");
      return { status: "parsed", parsed: new ParsedDocument(bytes, value, constructionToken) };
    } catch {
      return refusal("invalid-json");
    }
  }
}

class AdmittedRecipe extends ParsedDocument {
  #canonical;
  sha256;
  constructor(parsed, token) {
    super(parsed.submittedJSON, parsed.value, token);
    const text = canonicalJSON(parsed.value);
    this.#canonical = new TextEncoder().encode(text);
    this.sha256 = canonicalSHA256(parsed.value);
    admittedRecipeHandles.add(this);
  }
  get canonicalJSON() {
    return this.#canonical.slice();
  }
  static async admit(parsed, budgets) {
    if (!parsedHandles.has(parsed))
      return refusal("invalid-document");
    const analysis = await createSchemamiEngine(EMBEDDED_SCHEMA).analyze(JSON.stringify(parsed.value), budgets);
    if (!analysis.parse.ok || analysis.documents.length !== 1)
      return refusal("invalid-document");
    const problems = normalize(analysis.documents[0].problems);
    return problems.length ? { status: "refused", problems } : { status: "recipe", recipe: new AdmittedRecipe(parsed, constructionToken) };
  }
}

class AdmittedBundle extends ParsedDocument {
  #canonical;
  sha256;
  constructor(parsed, token) {
    super(parsed.submittedJSON, parsed.value, token);
    const text = canonicalJSON(parsed.value);
    this.#canonical = new TextEncoder().encode(text);
    this.sha256 = canonicalSHA256(parsed.value);
    admittedBundleHandles.add(this);
  }
  get canonicalJSON() {
    return this.#canonical.slice();
  }
  static async admit(parsed, budgets = protocolFloor) {
    if (!parsedHandles.has(parsed))
      return refusal("invalid-document");
    const problems = await validateBundle(parsed.value, budgets);
    return problems.length ? { status: "refused", problems } : { status: "bundle", bundle: new AdmittedBundle(parsed, constructionToken) };
  }
}
function parse(input, _budgets = protocolFloor) {
  return ParsedDocument.parse(input, _budgets);
}
async function admit(parsed, budgets = protocolFloor) {
  if (!parsedHandles.has(parsed))
    return refusal("invalid-document");
  const value = parsed.value;
  if ("root" in value || "documents" in value) {
    return AdmittedBundle.admit(parsed, budgets);
  }
  return AdmittedRecipe.admit(parsed, budgets);
}
function isAdmittedRecipe(value) {
  return typeof value === "object" && value !== null && admittedRecipeHandles.has(value);
}
function isAdmittedBundle(value) {
  return typeof value === "object" && value !== null && admittedBundleHandles.has(value);
}
function canonicalJSON2(value) {
  return new TextEncoder().encode(canonicalJSON(value));
}
function sha2562(value) {
  return canonicalSHA256(value);
}
function refusal(code) {
  return { status: "refused", problems: [{ type: `${PROBLEM_BASE3}${code}` }] };
}
function normalize(values) {
  const unique = new Map;
  for (const value of values) {
    const item = { type: value.type, ...value.pointer === undefined ? {} : { pointer: value.pointer } };
    unique.set(`${value.pointer ?? ""}\x00${value.type}`, item);
  }
  return [...unique.values()].sort((a, b) => ascii(a.pointer ?? "", b.pointer ?? "") || ascii(a.type, b.type));
}
function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function clone(value) {
  if (Array.isArray(value))
    return value.map((item) => clone(item));
  if (isObject(value)) {
    const result = Object.create(null);
    for (const [key, child] of Object.entries(value)) {
      Object.defineProperty(result, key, { value: clone(child), enumerable: true, writable: true, configurable: true });
    }
    return result;
  }
  return value;
}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
async function validateBundle(bundle, budgets) {
  const structural = new Validator(EMBEDDED_BUNDLE_SCHEMA, "2020-12", false).validate(bundle);
  if (structural.errors.length > 0)
    return structural.errors.map((error) => ({ type: `${PROBLEM_BASE3}invalid-document`, pointer: error.instanceLocation.startsWith("#") ? error.instanceLocation.slice(1) : error.instanceLocation }));
  if (bundle.schemami !== "1" || !isObject(bundle.root) || !Array.isArray(bundle.documents) || bundle.documents.length === 0)
    return [{ type: `${PROBLEM_BASE3}invalid-document` }];
  if (bundle.documents.length > budgets.bundleDocuments)
    return [{ type: `${PROBLEM_BASE3}resource-limit` }];
  const staticOccurrences = protocolObjectCount(bundle);
  if (staticOccurrences > budgets.semanticOccurrences)
    return [{ type: `${PROBLEM_BASE3}resource-limit`, pointer: "/documents" }];
  const allowed = new Set(["schemami", "root", "documents"]);
  if (Object.keys(bundle).some((key) => !allowed.has(key) && !/^x-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)))
    return [{ type: `${PROBLEM_BASE3}invalid-document` }];
  const engine = createSchemamiEngine(EMBEDDED_SCHEMA);
  const budgetState = createAnalysisBudgetState();
  budgetState.semanticOccurrences = staticOccurrences;
  const byReference = new Map;
  const ordered = [];
  for (let index = 0;index < bundle.documents.length; index += 1) {
    const entry = bundle.documents[index];
    if (!isObject(entry) || typeof entry.sha256 !== "string" || !isObject(entry.document))
      return [{ type: `${PROBLEM_BASE3}invalid-document`, pointer: `/documents/${index}` }];
    const analysis = await engine.analyze(JSON.stringify(entry.document), budgets, budgetState, { chargeStaticSemanticOccurrences: false });
    if (!analysis.documents[0]?.valid)
      return normalize(analysis.documents[0]?.problems ?? []).map((problem2) => ({ ...problem2, pointer: `/documents/${index}/document${problem2.pointer ?? ""}` }));
    const digest = canonicalSHA256(entry.document);
    if (digest !== entry.sha256)
      return [{ type: `${PROBLEM_BASE3}invalid-document`, pointer: `/documents/${index}/sha256` }];
    const reference = recipeReference(entry.document, digest);
    if (byReference.has(reference))
      return [{ type: `${PROBLEM_BASE3}invalid-document`, pointer: `/documents/${index}` }];
    byReference.set(reference, entry.document);
    ordered.push(reference);
  }
  if (ordered[0] !== referenceKey(bundle.root))
    return [{ type: `${PROBLEM_BASE3}invalid-document`, pointer: "/documents/0" }];
  for (let index = 2;index < ordered.length; index += 1)
    if (!(ordered[index - 1] < ordered[index]))
      return [{ type: `${PROBLEM_BASE3}invalid-document`, pointer: `/documents/${index}` }];
  const visiting = new Set;
  const reached = new Set;
  const visit = (reference, depth) => {
    if (depth > budgets.recursiveLevels)
      return { type: `${PROBLEM_BASE3}resource-limit`, pointer: "/documents" };
    if (visiting.has(reference))
      return { type: `${PROBLEM_BASE3}component-cycle`, pointer: "/documents" };
    if (reached.has(reference))
      return null;
    const recipe = byReference.get(reference);
    if (!recipe)
      return { type: `${PROBLEM_BASE3}unresolved-reference`, pointer: "/documents" };
    visiting.add(reference);
    reached.add(reference);
    for (const component of Array.isArray(recipe.components) ? recipe.components : []) {
      if (!isObject(component) || !isObject(component.recipe))
        continue;
      const problem2 = visit(referenceKey(component.recipe), depth + 1);
      if (problem2)
        return problem2;
    }
    visiting.delete(reference);
    return null;
  };
  const graphProblem = visit(ordered[0], 1);
  if (graphProblem)
    return [graphProblem];
  if (reached.size !== ordered.length)
    return [{ type: `${PROBLEM_BASE3}invalid-document`, pointer: "/documents" }];
  return [];
}
function recipeReference(recipe, digest) {
  return `${String(recipe.collection)}\x00${String(recipe.id)}\x00${String(recipe.revision).padStart(20, "0")}\x00${digest}`;
}
function referenceKey(reference) {
  return `${String(reference.collection)}\x00${String(reference.id)}\x00${String(reference.revision).padStart(20, "0")}\x00${String(reference.sha256)}`;
}
function protocolObjectCount(value) {
  let count = 0;
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    if (isObject(current)) {
      count += 1;
      for (const [name, child] of Object.entries(current))
        if (!name.startsWith("x-"))
          stack.push(child);
    }
  }
  return count;
}
function hasLoneSurrogate(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string") {
      for (let i = 0;i < current.length; i += 1) {
        const code = current.charCodeAt(i);
        if (code >= 55296 && code <= 56319) {
          const next = current.charCodeAt(++i);
          if (!(next >= 56320 && next <= 57343))
            return true;
        } else if (code >= 56320 && code <= 57343)
          return true;
      }
    } else if (Array.isArray(current))
      stack.push(...current);
    else if (isObject(current)) {
      for (const [key, child] of Object.entries(current)) {
        stack.push(key, child);
      }
    }
  }
  return false;
}
function hasInvalidNumber(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "number" && !Number.isFinite(current))
      return true;
    if (Array.isArray(current))
      stack.push(...current);
    else if (isObject(current))
      stack.push(...Object.values(current));
  }
  return false;
}
function scanStrictJSON(text) {
  enforceParserDepth(text);
  let i = 0;
  const ws = () => {
    while (/[\t\n\r ]/.test(text[i] ?? ""))
      i += 1;
  };
  const string = () => {
    const start = i;
    if (text[i++] !== '"')
      throw 0;
    while (i < text.length) {
      if (text[i] === '"') {
        i += 1;
        return JSON.parse(text.slice(start, i));
      }
      if (text[i] === "\\")
        i += 2;
      else
        i += 1;
    }
    throw 0;
  };
  const number = (raw) => {
    const parsed = Number(raw);
    const mantissa = raw.split(/[eE]/, 1)[0];
    if (!Number.isFinite(parsed) || parsed === 0 && /[1-9]/.test(mantissa) || !integerLexemeIsExact(raw, parsed))
      throw 0;
  };
  const value = () => {
    ws();
    if (text[i] === "{") {
      i += 1;
      ws();
      const seen = new Set;
      if (text[i] === "}") {
        i += 1;
        return;
      }
      for (;; ) {
        ws();
        const key = string();
        if (seen.has(key))
          throw 0;
        seen.add(key);
        ws();
        if (text[i++] !== ":")
          throw 0;
        value();
        ws();
        if (text[i] === ",") {
          i += 1;
          continue;
        }
        if (text[i] !== "}")
          throw 0;
        i += 1;
        return;
      }
    }
    if (text[i] === "[") {
      i += 1;
      ws();
      if (text[i] === "]") {
        i += 1;
        return;
      }
      for (;; ) {
        value();
        ws();
        if (text[i] === ",") {
          i += 1;
          continue;
        }
        if (text[i] !== "]")
          throw 0;
        i += 1;
        return;
      }
    }
    if (text[i] === '"') {
      string();
      return;
    }
    const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));
    if (!match)
      throw 0;
    if (match[0] !== "true" && match[0] !== "false" && match[0] !== "null")
      number(match[0]);
    i += match[0].length;
  };
  value();
  ws();
  if (i !== text.length)
    throw 0;
}
function enforceParserDepth(text) {
  let depth = 0, inString = false, escaped = false;
  for (const character of text) {
    if (inString) {
      if (escaped)
        escaped = false;
      else if (character === "\\")
        escaped = true;
      else if (character === '"')
        inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      depth += 1;
      if (depth > 256)
        throw 0;
    } else if (character === "}" || character === "]")
      depth -= 1;
  }
}
function integerLexemeIsExact(raw, parsed) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match || !Number.isInteger(parsed))
    return true;
  const exponent = Number(match[4] ?? "0");
  if (!Number.isSafeInteger(exponent))
    return false;
  const fraction = match[3] ?? "";
  let coefficient = BigInt(`${match[1]}${match[2]}${fraction}`);
  const scale = exponent - fraction.length;
  if (scale >= 0)
    coefficient *= 10n ** BigInt(scale);
  else {
    const divisor = 10n ** BigInt(-scale);
    if (coefficient % divisor !== 0n)
      return true;
    coefficient /= divisor;
  }
  return BigInt(parsed) === coefficient;
}

// src/diff.ts
function compare(source, candidate) {
  if (!isAdmittedRecipe(source) || !isAdmittedRecipe(candidate))
    throw new TypeError("SchemamiDiff requires admitted recipes");
  const changes = [];
  compareValues(source.value, candidate.value, "", "", changes);
  const order = { removed: 0, added: 1, renamed: 2, modified: 3, reordered: 4 };
  changes.sort((a, b) => ascii2(a.pointer, b.pointer) || order[a.kind] - order[b.kind] || ascii2(String(a.sourcePointer ?? ""), String(b.sourcePointer ?? "")));
  return { source: identity(source), candidate: identity(candidate), changes, hasChanges: changes.length > 0 };
}
function compareValues(source, candidate, sp, cp, out) {
  if (equal(source, candidate))
    return;
  if (object2(source) && object2(candidate)) {
    const keys = [...new Set([...Object.keys(source), ...Object.keys(candidate)])].sort();
    for (const key of keys) {
      const hs = Object.hasOwn(source, key), hc = Object.hasOwn(candidate, key), s = pointer(sp, key), c = pointer(cp, key);
      if (!hs)
        out.push(change("added", undefined, c, undefined, candidate[key]));
      else if (!hc)
        out.push(change("removed", s, undefined, source[key], undefined));
      else
        compareValues(source[key], candidate[key], s, c, out);
    }
    return;
  }
  if (Array.isArray(source) && Array.isArray(candidate)) {
    const sourceIds = identified(source), candidateIds = identified(candidate);
    if (sourceIds && candidateIds) {
      compareIdentified(source, candidate, sourceIds, candidateIds, sp, cp, out);
      return;
    }
    if (sameMultiset(source, candidate)) {
      out.push(change("reordered", sp, cp, source, candidate));
      return;
    }
    const common = Math.min(source.length, candidate.length);
    for (let i = 0;i < common; i += 1)
      compareValues(source[i], candidate[i], pointer(sp, String(i)), pointer(cp, String(i)), out);
    for (let i = common;i < source.length; i += 1)
      out.push(change("removed", pointer(sp, String(i)), undefined, source[i], undefined));
    for (let i = common;i < candidate.length; i += 1)
      out.push(change("added", undefined, pointer(cp, String(i)), undefined, candidate[i]));
    return;
  }
  out.push(change(cp.endsWith("/name") ? "renamed" : "modified", sp, cp, source, candidate));
}
function identified(values) {
  const ids = [];
  const seen = new Set;
  for (const value of values) {
    if (!object2(value) || typeof value.id !== "string" || seen.has(value.id))
      return null;
    seen.add(value.id);
    ids.push(value.id);
  }
  return ids;
}
function compareIdentified(source, candidate, sourceIds, candidateIds, sp, cp, out) {
  const si = new Map(sourceIds.map((id, index) => [id, index])), ci = new Map(candidateIds.map((id, index) => [id, index]));
  for (const id of [...new Set([...sourceIds, ...candidateIds])].sort()) {
    const left = si.get(id), right = ci.get(id);
    if (left === undefined)
      out.push(change("added", undefined, pointer(cp, String(right)), undefined, candidate[right]));
    else if (right === undefined)
      out.push(change("removed", pointer(sp, String(left)), undefined, source[left], undefined));
    else
      compareValues(source[left], candidate[right], pointer(sp, String(left)), pointer(cp, String(right)), out);
  }
  const common = new Set(sourceIds.filter((id) => ci.has(id)));
  const leftOrder = sourceIds.filter((id) => common.has(id)), rightOrder = candidateIds.filter((id) => common.has(id));
  if (!equal(leftOrder, rightOrder))
    out.push(change("reordered", sp, cp, leftOrder, rightOrder));
}
function change(kind, sp, cp, sv, cv) {
  return { kind, pointer: cp ?? sp ?? "", ...sp === undefined ? {} : { sourcePointer: sp }, ...cp === undefined ? {} : { candidatePointer: cp }, ...sv === undefined ? {} : { sourceValue: sv }, ...cv === undefined ? {} : { candidateValue: cv } };
}
function object2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function equal(a, b) {
  if (a === b)
    return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((value, index) => equal(value, b[index]));
  if (object2(a) && object2(b)) {
    const left = Object.keys(a).sort(), right = Object.keys(b).sort();
    return left.length === right.length && left.every((key, index) => key === right[index] && equal(a[key], b[key]));
  }
  return false;
}
function sameMultiset(a, b) {
  if (a.length !== b.length || equal(a, b))
    return false;
  const remaining = [...b];
  for (const item of a) {
    const index = remaining.findIndex((candidate) => equal(item, candidate));
    if (index < 0)
      return false;
    remaining.splice(index, 1);
  }
  return true;
}
function pointer(base, token) {
  return `${base}/${token.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
function identity(document) {
  const value = document.value;
  return { collection: String(value.collection), id: String(value.id), revision: Number(value.revision), sha256: document.sha256 };
}
function ascii2(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
export {
  compare
};
