import { AdmittedBundle, AdmittedRecipe, type JSONValue, type ResourceBudgets } from "./core.ts";
import { type Envelope } from "./calculus.ts";
export type { Envelope, Quantity } from "./calculus.ts";
export type Operation = "resolve_selection" | "scale" | "resolve_formula" | "convert_quantity" | "reading_order" | "schedule";
export type OperationRequest = {
    operation: Operation;
    arguments: Record<string, JSONValue>;
};
export type OperationInput = AdmittedRecipe | AdmittedBundle | undefined;
/** Evaluate a closed operation over an unforgeable admitted handle. */
export declare function evaluate(request: OperationRequest, input?: OperationInput, budgets?: ResourceBudgets): Envelope;
//# sourceMappingURL=public-calculus.d.ts.map