/** Test-side loaders: schemas + vectors from the repo (Bun runtime only —
 * the browser build embeds schemas at build time instead). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SchemaSet } from "../src/engine-js/index.ts";

export const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

export function loadSchemas(): SchemaSet {
  const core = JSON.parse(
    readFileSync(join(REPO_ROOT, "schema/rcp-core-v1.schema.json"), "utf8"),
  );
  const profiles: SchemaSet["profiles"] = {};
  const dir = join(REPO_ROOT, "schema/profiles");
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".schema.json")) continue;
    profiles[f.replace(".schema.json", "")] = JSON.parse(
      readFileSync(join(dir, f), "utf8"),
    );
  }
  return { core, profiles };
}

export interface VectorVerdict {
  doc: string;
  layer: "l1" | "l2" | "cue";
  valid: boolean;
  profile?: string;
  maturity?: string;
}

export interface Vector {
  source: string;
  parse_ok: boolean;
  expected: VectorVerdict[];
}

export function loadVectors(): Vector[] {
  const dir = join(import.meta.dir, "vectors");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Vector);
}

export function readSource(source: string): string {
  if (source.includes("private/")) {
    throw new Error(`privacy boundary: refusing ${source}`);
  }
  return readFileSync(join(REPO_ROOT, source), "utf8");
}
