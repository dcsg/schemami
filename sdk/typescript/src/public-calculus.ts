import {
  AdmittedBundle,
  AdmittedRecipe,
  isAdmittedBundle,
  isAdmittedRecipe,
  protocolFloor,
  type JSONValue,
  type ResourceBudgets,
} from "./core.ts";
import { evaluateRequest as evaluateUnchecked, type Envelope } from "./calculus.ts";

export type { Envelope, Quantity } from "./calculus.ts";

export type Operation = "resolve_selection" | "scale" | "resolve_formula" | "convert_quantity" | "reading_order" | "schedule";
export type OperationRequest = { operation: Operation; arguments: Record<string, JSONValue> };
export type OperationInput = AdmittedRecipe | AdmittedBundle | undefined;

const PROBLEM = "https://schemami.dev/problems/invalid-operation-arguments";

/** Evaluate a closed operation over an unforgeable admitted handle. */
export function evaluate(request: OperationRequest, input?: OperationInput, budgets: ResourceBudgets = protocolFloor): Envelope {
  try {
    if (!validArguments(request.operation, request.arguments)) return refused(request.operation);
    const wire: Record<string, unknown> = { arguments: request.arguments };
    if (request.operation === "convert_quantity") {
      if (input !== undefined) return refused(request.operation);
    } else if (isAdmittedRecipe(input)) {
      wire.recipe = input.value;
    } else if (isAdmittedBundle(input)) {
      wire.bundle = input.value;
    } else {
      return refused(request.operation);
    }
    return evaluateUnchecked(request.operation, wire, budgets);
  } catch {
    return refused(request.operation);
  }
}

function refused(operation: string): Envelope {
  return { operation, status: "refused", problems: [{ type: PROBLEM }] };
}

function validArguments(operation: Operation, args: Record<string, JSONValue>): boolean {
  if (args === null || typeof args !== "object" || Array.isArray(args)) return false;
  const allowed: Record<Operation, ReadonlySet<string>> = {
    convert_quantity: new Set(["quantity", "target_unit"]),
    resolve_selection: new Set(["selections"]),
    resolve_formula: new Set(["formula_id", "selections"]),
    scale: new Set(["factor", "formula_target", "selections"]),
    reading_order: new Set(["selections"]),
    schedule: new Set(["selections"]),
  };
  if (Object.keys(args).some((key) => !allowed[operation].has(key))) return false;
  if (operation === "convert_quantity") return measuredQuantity(args.quantity) && typeof args.target_unit === "string";
  if (operation === "resolve_formula") return typeof args.formula_id === "string";
  // Cross-field semantic rules (including factor XOR formula_target) belong to
  // the Calculus operation so its normative pointer-addressed refusal survives.
  if (operation === "scale" && args.formula_target !== undefined) {
    if (!closedObject(args.formula_target, new Set(["formula_id","quantity"])) || typeof args.formula_target.formula_id !== "string" || !measuredQuantity(args.formula_target.quantity)) return false;
  }
  return validSelections(args.selections);
}

function isObject(value: unknown): value is Record<string, JSONValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function closedObject(value: unknown, allowed: ReadonlySet<string>): value is Record<string, JSONValue> {
  return isObject(value) && Object.keys(value).every((key)=>allowed.has(key));
}

function measuredQuantity(value: unknown): boolean {
  return closedObject(value,new Set(["kind","value","unit"])) && value.kind==="measured" && typeof value.value==="string" && typeof value.unit==="string";
}

function validSelections(value: JSONValue | undefined): boolean {
  if(value===undefined)return true;if(!Array.isArray(value))return false;
  return value.every((selection)=>{
    if(!closedObject(selection,new Set(["component_path","bindings","alternatives"]))||!Array.isArray(selection.component_path)||!selection.component_path.every((id)=>typeof id==="string"))return false;
    if(selection.bindings!==undefined){if(!isObject(selection.bindings))return false;for(const binding of Object.values(selection.bindings))if(!(typeof binding==="string"||typeof binding==="boolean"||measuredQuantity(binding)))return false;}
    return selection.alternatives===undefined||(isObject(selection.alternatives)&&Object.values(selection.alternatives).every((option)=>typeof option==="string"));
  });
}
