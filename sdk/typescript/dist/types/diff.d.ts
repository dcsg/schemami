import { type AdmittedRecipe, type JSONValue } from "./core.ts";
export type ChangeKind = "added" | "removed" | "renamed" | "modified" | "reordered";
export type DocumentIdentity = {
    collection: string;
    id: string;
    revision: number;
    sha256: string;
};
export type ProtocolChange = {
    kind: ChangeKind;
    pointer: string;
    sourcePointer?: string;
    candidatePointer?: string;
    sourceValue?: JSONValue;
    candidateValue?: JSONValue;
};
export type ComparisonResult = {
    source: DocumentIdentity;
    candidate: DocumentIdentity;
    changes: ProtocolChange[];
    hasChanges: boolean;
};
export declare function compare(source: AdmittedRecipe, candidate: AdmittedRecipe): ComparisonResult;
//# sourceMappingURL=diff.d.ts.map