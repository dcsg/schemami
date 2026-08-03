# 08 — Implicit sub-recipes: from mention to method

**Date:** 2026-08-03 · **Status:** research complete, feeds FEAT-REG-006 /
PRD-004 · **Method:** three parallel web-verified survey tracks (formats &
standards; professional culinary tradition; ontologies & knowledge graphs —
the last verified against the downloaded `foodon.owl` itself, axiom by
axiom) plus two primary-source observations by Daniel (Peterson's *Sauces*
4e; the sauce→roux case that started this). Appended to the research bundle
per its append-only rule.

## The question

A recipe's method says "faça um roux" without declaring a component. The
reader deserves a path from the mention to the method — and, per the
recorded end goal, to *doing* the method at the right time ("the stock is
made the day before"). What does the field know about this problem, and
what must RCP build?

## Findings

### F1 — No format resolves implicit preparations; the only working device is authored intermediates

Schema.org has no sub-recipe mechanism at all (`recipeIngredient` is Text;
only generic `hasPart`/`isBasedOn` with no quantity semantics). RecipeMD
allows a Markdown link as an ingredient name, spec silent on everything
else. ORF and Meal-Master: nothing. The one genuinely novel device found:
cooklang-chef's step-product references (`@&(~1)dough`) — a typed pointer
to *the output of a previous step*, i.e. authored intermediates. Prose
recovery is NLP territory: recipe flow-graph corpora (Mori 2014; Yamakata
2020; MM-ReS) recover intermediates as annotated DAG nodes at edge-F1
≈ 71% — unreliable. RCP's stance is confirmed: intermediates are
**authored, never inferred** (decision #3's DAG anchoring already says
this).

### F2 — Reference-with-scaling exists once in the wild, and the failure modes without discipline are documented

Cooklang is the only *format* specifying the arithmetic: sub-recipe as
ingredient-with-path plus multiplier (`@./sauces/Hollandaise{150%g}`),
`{4%servings}` resolving against the target's metadata; the unit form is
still experimental. Everyone else does app-database references — and the
bug trackers document exactly what breaks without protocol discipline:
Grocy computed wrong amounts beyond 2 nesting levels (#1806) and went down
on circular inclusion until a loop guard landed (#875); Mealie's slug-based
identity collapses across groups (#6652); Tandoor can embed a recipe in a
step but cannot scale it (#3346, open). Nobody has a versioning story —
every reference is by mutable path, name or slug. RCP already ships the
countermeasures these bugs argue for: `componentRef` with version pins,
lint-enforced DAG acyclicity, kind-prefixed stable ids.

### F3 — The professional tradition settled this in 1903: bases are recipes with batch yields, consumed by reference, at depth

Escoffier's *Guide Culinaire* gives roux explicit proportions ("pour un
kilogramme: 500 g de beurre clarifié, 600 g de farine tamisée" — 1903
scans, fr.wikisource) and fonds "pour 10 litres"; derivative sauces are
authored as *deltas over named bases* — a reference-resolution model on
paper. The real hierarchy is deeper than the "five mother sauces" meme
(nine grandes sauces; Hollandaise was a petite sauce, Mayonnaise WAS a
mother) and chains four levels deep: roux → Espagnole → Demi-glace →
Bordelaise. Modern costing systems agree end-to-end: sub-recipes are
yield-bearing recipes consumed as ingredients (meez costs per quart with
change propagation to every parent; Apicbase warns costing is wrong unless
NET yield is declared; MarketMan nests unboundedly). Consequences: one
level of nesting contradicts 120 years of practice; yield must carry
loss/net data; batch size, par levels and holding windows are
*operational* attributes (app-side, #19), not definitional ones.

### F4 — The recipe-vs-technique boundary is a property of the source, not the concept

Daniel's primary observation, now systematically confirmed. Peterson's
*Sauces* files roux under Liaisons as running prose — yet the prose
contains ratio proportions ("equal volumes"), timings and variants: a
complete recipe wearing a technique's clothes. Escoffier makes it a batch
recipe. Across knowledge systems the same concept lands everywhere:
Wikipedia = substance (Edible thickening agents); Wikibooks Cookbook =
technique (the page IS the procedure); Wikidata = both at once (P31 food
ingredient AND sauce, no process link); FoodOn = absent; schema.org =
inexpressible either way. **No surveyed system treats roux as a concept
with a canonical producing procedure.** The ubiquitous language's two-axis
model (nature × consumption position; docs/ubiquitous-language.md) is the
direct answer: never encode this boundary in a type.

### F5 — Ontologies dissolve the intermediate, and process detail rots into prose exactly at the interesting boundary

FoodOn has no roux, ganache or mirepoix; Wikidata's béchamel lists
butter/flour/milk directly and never points at roux — the intermediate is
dissolved out of the model. FoodOn's one real concept→process pattern
(`food (pickled) ≡ … output of some pickling`) covers 72 *generic state
classes*, never a named preparation; `derives from` (4004 uses, vs 117 for
`output of`) is documented by FoodOn itself as "process shorthand".
Sourdough starter's four process facets sit in an `rdfs:comment` string —
the enum/registry/prose failure mode in the wild, in the flagship food
ontology. The FoodOn requirements paper (Semantic Web 2024) names the
blockers: OWL cannot assert a process output identical to its input, and
there is no generic "step" entity for recipe modeling. Research KGs go the
other way and derive identity from graph position (flow graphs tag
intermediates `F` like any food; SIMMR's intermediate IS the instruction
node; the 2025 action-centric ontology leaves them deliberately unnamed).
Asserted, curated identity for preparations — RCP's registry posture — is
the road not taken anywhere.

### F6 — Stage-forked identity is a recurring shape the model should treat first-class

Escoffier's three roux differ only by cook time; Portugal's pontos de
açúcar are ~12 named, temperature-indexed stages of ONE calda (officially
in vocational catalogue UFCD 8293). One preparation whose identity forks
on a measured checkpoint beats N near-duplicate sibling classes. Open
design question for PRD-004: whether stage outcomes live on the
preparation class (registry), the recipe (endpoint-linked yields), or
both.

### F7 — The concept↔canonical-recipe bridge is open space

Wikibooks Cookbook is the nearest human-curated prior art (one page per
concept, the page is the canonical procedure) but the link is one-way
prose. Cooklang's reference is recipe→recipe by path, not
concept→recipe. Editorial canonical-linking practice at cooking sites
could not be verified. A typed, resolvable, *bidirectional*
concept↔canonical-recipe edge — with curation (steward-picked canonical,
user's own recipe shadowing it) and private-vs-published-aware
resolution — does not exist anywhere surveyed. FEAT-REG-006 builds into
open space; the compensation is that RCP already owns every prerequisite
(registry identity, componentRef versioning, DAG discipline, the
schedule derivation for prerequisite placement).

### F8 — A caveat the project should keep honest

Public sources conflate massa velha / isco / finto / massa-mãe as regional
synonyms; the massa-velha ≠ isco distinction this project maintains is
project-internal knowledge (correct or not, it is not publicly codified).
Keep asserting it — but know it is ours to defend, and a candidate for
documentation with witnesses (provenance machinery exists for exactly
this).

## Design implications for FEAT-REG-006 / PRD-004

1. Authored intermediates only; extraction lifts or references, never
   infers (F1; extraction contract already binding).
2. The reference is an ingredient-position link with yield-based scaling
   arithmetic defined ONCE in the Calculus — the exact unsolved problem
   Tandoor names (F2, F3); depth unbounded, cycles lint-rejected, version
   pins mandatory (Grocy/Mealie's bugs as the negative proof).
3. The bridge is concept↔recipe, bidirectional, curated, resolution
   respecting the private boundary; canonical is curation (F4, F7).
4. Net yield / loss on component recipes before costing or scaling ever
   crosses the boundary honestly (F3).
5. Stage-forked outcomes: decide the modeling home in PRD-004 (F6).
6. End goal held throughout: load the method, DO the procedure, and let
   the schedule place it — including before t0 (prerequisite placement,
   FEAT-CALC-002 across the reference edge).

*Track reports with full source URLs preserved in the session record;
key primary sources: cooklang.org/docs/spec, fr.wikisource Guide
Culinaire 1903 pp. 28/33-34, FoodOn foodon.owl + foodon.org/design,
Semantic Web 10.3233/SW-223096, aclanthology L14-1594 & 2020.lrec-1.638,
Grocy #875/#1806, Mealie #6652, Tandoor #3346, Peterson Sauces 4e
(Liaisons: An Overview → Flour → Roux).*
