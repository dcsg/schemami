import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  sourceLanguageView,
  type SourceRecipe,
} from "../src/schemami/source-view.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

test("unknown local concepts project directly to source-language presentation", () => {
  const source = readFileSync(
    join(REPO_ROOT, "tools", "schemami", "testdata", "local-entities.schemami.yaml"),
    "utf8",
  );
  const recipe = parse(source) as SourceRecipe;
  expect(sourceLanguageView(recipe)).toEqual({
    contentLanguage: "pt-PT",
    title: "Receita com conceitos locais",
    notes: [],
    ingredients: [{ id: "ingrediente-da-casa", name: "Mistura secreta da casa", notes: [] }],
    techniques: [{ id: "dobra-da-casa", name: "Dobra da casa", notes: [] }],
    equipment: [{ id: "panela-x", name: "Panela experimental X", notes: [] }],
    steps: [{
      id: "preparar",
      instruction: "Prepare a mistura segundo a técnica da casa.",
      notes: [],
    }],
  });
});
