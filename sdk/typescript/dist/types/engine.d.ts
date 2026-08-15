import { type AnalysisBudgetState, type Envelope } from "./calculus.ts";
type Dict = Record<string, unknown>;
export type ViewerProblem = {
    type: string;
    pointer?: string;
    message: string;
};
export type DocumentAnalysis = {
    id: string;
    valid: boolean;
    problems: ViewerProblem[];
    canonical: Dict;
};
export type AnalysisResult = {
    parse: {
        ok: boolean;
        errors: Array<{
            message: string;
            line?: number;
        }>;
    };
    documents: DocumentAnalysis[];
};
export type AnalysisBudgets = {
    recursiveLevels: number;
    semanticOccurrences: number;
    analysisStates: number;
};
export type AnalysisOptions = {
    chargeStaticSemanticOccurrences?: boolean;
};
export interface SchemamiEngine {
    readonly version: 1;
    analyze(text: string, budgets?: AnalysisBudgets, budgetState?: AnalysisBudgetState, options?: AnalysisOptions): Promise<AnalysisResult>;
    scale(document: Dict, factor: string): Envelope;
    resolveFormula(document: Dict, formulaId: string): Envelope;
    schedule(document: Dict): Envelope;
}
export declare function createSchemamiEngine(schema: Record<string, unknown>): SchemamiEngine;
export {};
//# sourceMappingURL=engine.d.ts.map