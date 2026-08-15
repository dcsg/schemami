export type JSONValue = null | boolean | number | string | JSONValue[] | {
    [key: string]: JSONValue;
};
export type JSONObject = {
    [key: string]: JSONValue;
};
export type Problem = {
    type: string;
    pointer?: string;
    details?: JSONValue;
};
export type ResourceBudgets = {
    recursiveLevels: number;
    semanticOccurrences: number;
    analysisStates: number;
    bundleDocuments: number;
    selectedComponentInstances: number;
};
export declare const protocolFloor: Readonly<ResourceBudgets>;
export declare class ParsedDocument {
    #private;
    protected constructor(submitted: Uint8Array, value: JSONObject, token: symbol);
    get submittedJSON(): Uint8Array;
    get value(): JSONObject;
    static parse(input: string | Uint8Array, _budgets?: ResourceBudgets): ParseResult;
}
export declare class AdmittedRecipe extends ParsedDocument {
    #private;
    readonly sha256: string;
    private constructor();
    get canonicalJSON(): Uint8Array;
    static admit(parsed: ParsedDocument, budgets: ResourceBudgets): Promise<AdmissionResult>;
}
export declare class AdmittedBundle extends ParsedDocument {
    #private;
    readonly sha256: string;
    private constructor();
    get canonicalJSON(): Uint8Array;
    static admit(parsed: ParsedDocument, budgets?: ResourceBudgets): Promise<AdmissionResult>;
}
export type ParseResult = {
    status: "parsed";
    parsed: ParsedDocument;
} | {
    status: "refused";
    problems: Problem[];
};
export type AdmissionResult = {
    status: "recipe";
    recipe: AdmittedRecipe;
} | {
    status: "bundle";
    bundle: AdmittedBundle;
} | {
    status: "refused";
    problems: Problem[];
};
export declare function parse(input: string | Uint8Array, _budgets?: ResourceBudgets): ParseResult;
export declare function admit(parsed: ParsedDocument, budgets?: ResourceBudgets): Promise<AdmissionResult>;
export declare function isAdmittedRecipe(value: unknown): value is AdmittedRecipe;
export declare function isAdmittedBundle(value: unknown): value is AdmittedBundle;
export declare function canonicalJSON(value: JSONValue): Uint8Array;
export declare function sha256(value: JSONValue): string;
//# sourceMappingURL=core.d.ts.map