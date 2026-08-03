/**
 * RCP viewer engine interface — v1 (ADR-002; DS-TOOL-001).
 *
 * THE FORWARD-COMPATIBILITY ARTIFACT. The UI depends on this interface and
 * nothing behind it. The v0.2 implementation is the JS engine
 * (src/engine-js/); the full-playground WASM build of the Go core
 * implements this same contract later and drops in without UI changes —
 * the UI reads `capabilities` and lights up whatever the engine offers.
 *
 * Contract rules (pinned by tests in src/engine-js/engine.test.ts):
 *  - analyze() NEVER throws on bad input: parse failures come back as
 *    { parse: { ok: false, errors }, verdicts: [], canonical: null }.
 *  - Every diagnostic is layer-tagged (l1 | l2 | cue) so rendering and
 *    conformance comparison can be capability-scoped.
 *  - `canonical` is the parsed document(s) as plain JSON — the render
 *    layer's only input. Multi-document sources yield one entry each.
 *  - scale() is RESERVED for the clamp-capable engine; an engine without
 *    the `clamp` capability MUST NOT define it.
 */

export type Layer = "l1" | "l2" | "cue";

export interface Capabilities {
  l1: true;
  l2?: boolean;
  cue?: boolean;
  clamp?: boolean;
}

export interface Diagnostic {
  layer: Layer;
  /** JSON pointer into the document ("" = whole document). */
  pointer: string;
  message: string;
  severity: "error" | "warning";
}

export interface ParseError {
  message: string;
  line?: number;
}

export interface DocumentAnalysis {
  id: string;
  kind: string;
  /** Profile kind composed with core, or null when core-only. */
  profile: string | null;
  /** x-rcp-maturity of the applied profile, or null. */
  maturity: string | null;
  valid: boolean;
  verdicts: Diagnostic[];
  /** The parsed document as plain JSON — the render layer's only input. */
  canonical: unknown;
}

export interface AnalysisResult {
  parse: { ok: boolean; errors: ParseError[] };
  documents: DocumentAnalysis[];
}

export interface ClampResult {
  accepted: boolean;
  reasons: { pt?: string; en?: string }[];
}

export interface RcpEngine {
  readonly version: 1;
  readonly capabilities: Capabilities;
  analyze(text: string): Promise<AnalysisResult>;
  /** Reserved: only clamp-capable engines define this. */
  scale?(canonical: unknown, factor: number): Promise<ClampResult>;
}
