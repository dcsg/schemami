/**
 * v0.2 JS engine (ADR-002; DS-TOOL-002): YAML 1.2 parse via `yaml`,
 * L1 validation via @cfworker/json-schema, mirroring rcplint's
 * composition — core ∧ profile[kind], core-only + explicit warning when
 * no profile exists for the kind (DS-VAL-001). Verdict parity with
 * rcplint is held by the conformance-vector suite, not by trust
 * (SAC-TOOL-002): disagreements are fixed HERE, never by editing vectors.
 *
 * Schemas are injected (build embeds them; tests load from the repo) so
 * the engine stays pure and the browser build needs no filesystem.
 */
import { parseAllDocuments } from "yaml";
import { Validator } from "@cfworker/json-schema";
import type {
  AnalysisResult,
  Capabilities,
  ClampResult,
  Diagnostic,
  DocumentAnalysis,
  ParseError,
  RcpEngine,
  TimelineEntry,
} from "../engine.ts";
import * as calc from "../calc/index.ts";

export interface SchemaSet {
  core: Record<string, unknown>;
  /** kind -> profile schema (x-rcp-maturity read from each). */
  profiles: Record<string, Record<string, unknown>>;
}

function pointerOf(instanceLocation: string): string {
  // cfworker reports "#/a/b"; the engine contract uses bare JSON pointers.
  return instanceLocation.startsWith("#") ? instanceLocation.slice(1) : instanceLocation;
}

export function createJsEngine(schemas: SchemaSet): RcpEngine {
  const core = new Validator(schemas.core as never, "2020-12", false);
  const profiles = new Map<string, { v: Validator; maturity: string | null }>();
  for (const [kind, schema] of Object.entries(schemas.profiles)) {
    profiles.set(kind, {
      v: new Validator(schema as never, "2020-12", false),
      maturity: (schema["x-rcp-maturity"] as string) ?? null,
    });
  }

  const capabilities: Capabilities = { l1: true, clamp: true, timeline: true };

  return {
    version: 1,
    capabilities,
    async analyze(text: string): Promise<AnalysisResult> {
      const parseErrors: ParseError[] = [];
      const documents: DocumentAnalysis[] = [];

      // uniqueKeys: true — duplicate mapping keys are a parse ERROR, the
      // posture the repo learned the hard way (a python parser silently
      // swallowed one; the Go harness rejects them; so do we).
      const parsed = parseAllDocuments(text, { uniqueKeys: true });
      for (const doc of parsed) {
        for (const err of doc.errors) {
          parseErrors.push({ message: err.message, line: err.linePos?.[0]?.line });
        }
      }
      if (parseErrors.length > 0) {
        return { parse: { ok: false, errors: parseErrors }, documents: [] };
      }

      for (const doc of parsed) {
        const value = doc.toJS() as Record<string, unknown> | null;
        if (value === null || typeof value !== "object") continue;
        const kind = String(value["kind"] ?? "");
        const verdicts: Diagnostic[] = [];

        const coreResult = core.validate(value);
        for (const e of coreResult.errors) {
          verdicts.push({
            layer: "l1",
            pointer: pointerOf(e.instanceLocation),
            message: e.error,
            severity: "error",
          });
        }

        const prof = profiles.get(kind);
        if (prof) {
          const pr = prof.v.validate(value);
          for (const e of pr.errors) {
            verdicts.push({
              layer: "l1",
              pointer: pointerOf(e.instanceLocation),
              message: `profile[${kind}]: ${e.error}`,
              severity: "error",
            });
          }
        } else {
          verdicts.push({
            layer: "l1",
            pointer: "",
            message: `core-only — no profile for kind "${kind}" (DS-VAL-001)`,
            severity: "warning",
          });
        }

        documents.push({
          id: String(value["id"] ?? ""),
          kind,
          profile: prof ? kind : null,
          maturity: prof ? prof.maturity : null,
          valid: verdicts.every((v) => v.severity !== "error"),
          verdicts,
          canonical: value,
        });
      }
      return { parse: { ok: true, errors: [] }, documents };
    },

    /**
     * Fail-closed scaling via the TS Recipe Calculus (vector-conformant
     * — src/calc replays calculus/vectors/). Refusal strings are the
     * Calculus's normative messages, which EMBED the authored pt/en
     * reasons verbatim; the engine passes them through opaque rather
     * than pretending to re-split authored text.
     */
    async scale(canonical: unknown, factor: number): Promise<ClampResult> {
      const doc = (canonical ?? {}) as Record<string, unknown>;
      const findings: calc.Findings = { refusals: [], warnings: [] };
      calc.enforceConstraints(String(doc["id"] ?? "doc"), doc, factor, findings);
      if (!Number.isFinite(factor) || factor <= 0) {
        return { accepted: false, reasons: [{ pt: `fator de escala inválido: ${factor}` }] };
      }
      if (findings.refusals.length > 0) {
        return { accepted: false, reasons: findings.refusals.map((r) => ({ pt: r })) };
      }
      const scaled = calc.scale(doc, factor);
      if (scaled === null) {
        return { accepted: false, reasons: [{ pt: `fator de escala inválido: ${factor}` }] };
      }
      return { accepted: true, reasons: [], scaled };
    },

    /** Timeline derivation via the TS Recipe Calculus (two-stage schedule). */
    async schedule(canonical: unknown): Promise<TimelineEntry[]> {
      const doc = (canonical ?? {}) as Record<string, unknown>;
      return calc.schedule(doc).entries.map((e) => ({
        item: e.item,
        start: { min: e.start.Min, target: e.start.Target, max: e.start.Max },
        duration: { min: e.duration.Min, target: e.duration.Target, max: e.duration.Max },
      }));
    },
  };
}
