export type SourceEntity = {
  id: string;
  name: string;
  notes?: string[];
};

export type SourceIngredient = SourceEntity & { quantity?: unknown };
export type SourceRecipe = {
  content_language: string;
  title: string;
  origin?: { country?: string; subdivision?: string; locality?: string };
  notes?: string[];
  ingredients: SourceIngredient[];
  techniques?: SourceEntity[];
  equipment?: SourceEntity[];
  method: { sequence: Array<Record<string, unknown>> };
};

export type SourceLanguageView = {
  contentLanguage: string;
  title: string;
  origin?: { country?: string; subdivision?: string; locality?: string };
  notes: string[];
  ingredients: Array<{ id: string; name: string; notes: string[]; quantity?: unknown }>;
  techniques: Array<{ id: string; name: string; notes: string[] }>;
  equipment: Array<{ id: string; name: string; notes: string[] }>;
  method: { sequence: Array<Record<string, unknown>> };
};

/**
 * Produces the presentation input directly from canonical source-language
 * fields. It deliberately performs no registry lookup, translation, or prose
 * interpretation.
 */
export function sourceLanguageView(recipe: SourceRecipe): SourceLanguageView {
  return {
    contentLanguage: recipe.content_language,
    title: recipe.title,
    ...(recipe.origin === undefined ? {} : { origin: structuredClone(recipe.origin) }),
    notes: [...(recipe.notes ?? [])],
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      notes: [...(ingredient.notes ?? [])],
      ...(ingredient.quantity === undefined ? {} : { quantity: structuredClone(ingredient.quantity) }),
    })),
    techniques: (recipe.techniques ?? []).map((technique) => ({
      id: technique.id,
      name: technique.name,
      notes: [...(technique.notes ?? [])],
    })),
    equipment: (recipe.equipment ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      notes: [...(item.notes ?? [])],
    })),
    method: structuredClone(recipe.method),
  };
}
