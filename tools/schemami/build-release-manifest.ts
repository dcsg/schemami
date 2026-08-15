#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Artifact = {
  kind: "schema" | "conformance" | "problem";
  path: string;
  url: string;
  media_type: "application/json" | "application/schema+json" | "text/html";
};

const root = resolve(import.meta.dir, "../..");
const mapPath = resolve(root, "release/schemami-v1.0.0/contract-map.json");
const output = resolve(process.argv[2] ?? resolve(root, "release/schemami-v1.0.0.manifest.json"));
const mapBytes = readFileSync(mapPath);
const contract = JSON.parse(mapBytes.toString("utf8")) as { release: string; artifacts: Artifact[] };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

assert(contract.release === "schemami-v1.0.0", "release contract has the wrong release identifier");
assert(Array.isArray(contract.artifacts) && contract.artifacts.length === 26, "release contract must contain 26 artifacts");

const paths = new Set<string>();
const urls = new Set<string>();
const expectedProblems = [
  "ambiguous-unit", "dependency-cycle", "dimension-mismatch", "duplicate-object-member",
  "inactive-reference", "invalid-decimal", "invalid-document", "invalid-json",
  "invalid-operation-arguments", "missing-fact", "missing-producer", "multiple-producers",
  "relative-timing-conflict", "resource-limit", "unknown-unit", "unresolved-reference",
  "unsupported-legacy", "unsupported-quantity-kind",
];

const artifacts = contract.artifacts.map((artifact) => {
  assert(!paths.has(artifact.path), `duplicate release path: ${artifact.path}`);
  assert(!urls.has(artifact.url), `duplicate release URL: ${artifact.url}`);
  assert(artifact.url.startsWith("https://schemami.dev/"), `non-canonical release URL: ${artifact.url}`);
  assert(["application/json", "application/schema+json", "text/html"].includes(artifact.media_type), `unsupported media type: ${artifact.media_type}`);
  paths.add(artifact.path);
  urls.add(artifact.url);

  const localPath = resolve(root, artifact.path);
  const bytes = readFileSync(localPath);
  if (artifact.kind === "schema" || artifact.kind === "conformance") {
    const value = JSON.parse(bytes.toString("utf8"));
    if (artifact.kind === "schema") assert(value.$id === artifact.url, `schema identity drift: ${artifact.path}`);
  } else {
    const html = bytes.toString("utf8");
    assert(html.includes("<!doctype html>"), `problem page is not HTML: ${artifact.path}`);
    assert(html.includes(`<link rel="canonical" href="${artifact.url}">`), `problem canonical URL drift: ${artifact.path}`);
    assert(html.includes(`<meta name="schemami-problem-type" content="${artifact.url}">`), `problem identity drift: ${artifact.path}`);
  }
  return { ...artifact, sha256: sha256(bytes), bytes: statSync(localPath).size };
});

const actualProblems = contract.artifacts
  .filter((artifact) => artifact.kind === "problem")
  .map((artifact) => artifact.url.split("/").at(-1)!)
  .sort();
assert(JSON.stringify(actualProblems) === JSON.stringify(expectedProblems), "published problem set drift");

const manifest = {
  manifest_version: 1,
  release: "schemami-v1.0.0",
  manifest_url: "https://schemami.dev/releases/schemami-v1.0.0.json",
  source_commit: git("rev-parse", "HEAD"),
  source_tree: git("rev-parse", "HEAD^{tree}"),
  source_committed_at: git("show", "-s", "--format=%cI", "HEAD"),
  contract_map_sha256: sha256(mapBytes),
  artifacts,
};

mkdirSync(dirname(output), { recursive: true });
const temporary = `${output}.tmp-${process.pid}`;
writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
renameSync(temporary, output);
console.log(`release manifest: wrote ${output} for ${manifest.source_commit}`);
