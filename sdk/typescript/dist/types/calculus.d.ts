export type Problem = {
    type: string;
    pointer?: string;
};
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
export type Ingredient = {
    id: string;
    quantity?: Quantity;
};
export type FormulaTerm = {
    ingredient: string;
    parts?: string;
    percentage?: string;
};
export type Formula = {
    kind: string;
    basis?: string;
    terms: FormulaTerm[];
    target?: Quantity;
    basis_quantity?: Quantity;
};
export type Recipe = {
    ingredients: Ingredient[];
    formula?: Formula;
};
export type Step = {
    id: string;
    after?: string[];
    duration?: unknown;
};
export declare function convertQuantity(quantity: Quantity, targetUnit: string, pointer: string): Envelope;
export declare function resolveFormula(formula: Formula, pointer: string): Envelope;
export declare function scale(recipe: Recipe, factorRaw: string): Envelope;
export declare function readingOrder(steps: Step[]): Envelope;
export declare function validateDurationWindow(value: unknown): "invalid-operation-arguments" | null;
export declare function schedule(steps: Step[]): Envelope;
type V1Dict = Record<string, unknown>;
export declare function evaluateRequest(operation: string, request: V1Dict, limits?: {
    recursiveLevels?: number;
    semanticOccurrences?: number;
    analysisStates?: number;
    selectedComponentInstances?: number;
}): Envelope;
export type AnalysisBudgetState = {
    semanticOccurrences: number;
    analysisStates: number;
};
export type GraphAnalysisBudgets = {
    semanticOccurrences: number;
    analysisStates: number;
};
export declare function createAnalysisBudgetState(): AnalysisBudgetState;
/** Proves the accepted graph invariants for every distinct activation region. */
export declare function validateReachableGraphs(recipe: V1Dict, budgets?: GraphAnalysisBudgets, budgetState?: AnalysisBudgetState, semanticOccurrenceCost?: number): Problem[];
export declare function canonicalizeEvaluationResult(value: unknown): string;
/** RFC 8785 canonical JSON for an admitted I-JSON value. */
export declare function canonicalJSON(value: unknown): string;
/** Lowercase SHA-256 of RFC 8785 canonical JSON. */
export declare function canonicalSHA256(value: unknown): string;
export {};
//# sourceMappingURL=calculus.d.ts.map