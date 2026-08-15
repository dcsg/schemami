import { parseAllDocuments } from "yaml";
import {
  AdmittedBundle,
  AdmittedRecipe,
  admit,
  evaluate,
  parse,
  protocolFloor,
  type Envelope,
  type Problem,
} from "@schemami/sdk";

type Dict = Record<string, unknown>;

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
  resolveFormula(document: Dict, formulaId: string): Envelope;
  schedule(document: Dict): Envelope;
}

const message = (problem: Problem): string => {
  const code = problem.type.slice(problem.type.lastIndexOf("/") + 1);
  return problem.pointer ? `${code} at ${problem.pointer}` : code;
};

const viewerProblems = (problems: Problem[]): ViewerProblem[] => problems.map((problem) => ({
  type: problem.type,
  ...(problem.pointer === undefined ? {} : { pointer: problem.pointer }),
  message: message(problem),
}));

/**
 * Viewer adapter. YAML parsing and UI-friendly messages remain presentation
 * concerns; JSON admission and Calculus delegate to @schemami/sdk.
 */
export function createSchemamiEngine(_schema: Record<string, unknown>): SchemamiEngine {
  const admitted = new WeakMap<Dict, AdmittedRecipe | AdmittedBundle>();
  const invalidOperation = (operation: string): Envelope => ({ operation, status: "refused", problems: [{ type: "https://schemami.dev/problems/invalid-operation-arguments" }] });
  return {
    version: 1,
    async analyze(text: string): Promise<AnalysisResult> {
      let parsedDocuments;
      try {
        parsedDocuments = parseAllDocuments(text, { uniqueKeys: true });
      } catch (error) {
        return { parse: { ok: false, errors: [{ message: error instanceof Error ? error.message : "invalid YAML" }] }, documents: [] };
      }
      const errors = parsedDocuments.flatMap((document) => document.errors.map((error) => ({
        message: error.message,
        line: error.linePos?.[0]?.line,
      })));
      if (errors.length > 0) return { parse: { ok: false, errors }, documents: [] };

      const documents: DocumentAnalysis[] = [];
      for (const source of parsedDocuments) {
        let value: unknown;
        try {
          value = source.toJS({ maxAliasCount: 100 });
          JSON.stringify(value);
        } catch (error) {
          return { parse: { ok: false, errors: [{ message: error instanceof Error ? error.message : "cyclic or excessive YAML alias" }] }, documents: [] };
        }
        if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
        const canonical = value as Dict;
        if (Object.hasOwn(canonical, "rcp")) {
          documents.push({
            id: String(canonical.id ?? ""), valid: false, canonical,
            problems: [{
              type: "https://schemami.dev/problems/unsupported-legacy",
              pointer: "",
              message: "unsupported-legacy",
            }],
          });
          continue;
        }
        const parsed = parse(JSON.stringify(canonical), protocolFloor);
        if (parsed.status === "refused") {
          documents.push({ id: String(canonical.id ?? ""), valid: false, canonical, problems: viewerProblems(parsed.problems) });
          continue;
        }
        const admission = await admit(parsed.parsed, protocolFloor);
        const problems = admission.status === "refused" ? viewerProblems(admission.problems) : [];
        if (admission.status === "recipe") admitted.set(canonical, admission.recipe);
        if (admission.status === "bundle") admitted.set(canonical, admission.bundle);
        documents.push({ id: String(canonical.id ?? ""), valid: problems.length === 0, problems, canonical });
      }
      return { parse: { ok: true, errors: [] }, documents };
    },
    scale: (document, factor) => admitted.has(document) ? evaluate({ operation: "scale", arguments: { factor } }, admitted.get(document)) : invalidOperation("scale"),
    resolveFormula: (document, formulaId) => admitted.has(document) ? evaluate({ operation: "resolve_formula", arguments: { formula_id: formulaId } }, admitted.get(document)) : invalidOperation("resolve_formula"),
    schedule: (document) => admitted.has(document) ? evaluate({ operation: "schedule", arguments: {} }, admitted.get(document)) : invalidOperation("schedule"),
  };
}
