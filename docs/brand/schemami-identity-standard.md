# Schemami identity standard

**Version:** 1.0.0<br>
**Decision:** Identity A / Bounded Savor<br>
**Approved:** 10 August 2026

This document governs Schemami’s visual identity. The files under
[`design-system/assets`](../../design-system/assets) and the tokens under
[`design-system/tokens`](../../design-system/tokens) are the implementation
source. Do not rebuild the logo from screenshots or use values sampled from a
concept board.

## Identity idea

Schemami combines dependable structure with culinary meaning.

- The open **brackets** make the developer and schema context immediate.
- The structured **S** is both a document and a process.
- The three **nodes** represent meaningful connections among ingredients,
  methods and registry identities.
- The serif **wordmark** supplies warmth; the interface typography stays calm
  and technical.

The symbol must always retain both brackets, a legible S and all three nodes.

## Asset inventory

### Primary lockups

| Asset | Use |
|---|---|
| `schemami-lockup-color.svg` | Preferred horizontal signature on Page or white |
| `schemami-lockup-ink.svg` | One-color printing, engraving and constrained surfaces |
| `schemami-lockup-reversed.svg` | Ink or Marine backgrounds |
| `schemami-wordmark-ink.svg` | When the mark is already present nearby |
| `schemami-wordmark-reversed.svg` | Wordmark-only use on approved dark backgrounds |

The wordmarks are Fraunces outlines shaped with HarfBuzz. They are portable and
must not be replaced by editable SVG text.

### Marks and icons

| Asset | Use |
|---|---|
| `schemami-mark-color.svg` | Transparent full-color master |
| `schemami-mark-tile.svg` | Social avatar, repository image and application tile |
| `schemami-mark-ink.svg` | One-color master |
| `schemami-mark-reversed.svg` | Reversed one-color master |
| `schemami-icon-16.svg` | 16 px favicon or compact status surface |
| `schemami-icon-24.svg` | Navigation, package registry and toolbar |
| `schemami-icon-32.svg` | Compact application and documentation header |

The optical icons deliberately use heavier strokes and larger nodes. Do not
create them by downscaling the 128-unit master.

## Lockup rules

### Clear space

Use one node diameter as the minimum clear space on every side of a mark or
lockup. In the 128-unit master, one node diameter is 12 units. No text, rule,
container edge or unrelated illustration may enter that space.

### Minimum size

- Horizontal lockup: 140 CSS pixels wide on screen; 32 mm in print.
- Master standalone mark: 48 CSS pixels.
- Below 48 pixels: use the matching 32, 24 or 16 pixel optical asset.
- Wordmark alone: 96 CSS pixels wide.

If the available space is smaller than 16 pixels, use a platform-provided
monochrome glyph slot or no mark. Do not remove nodes to force a smaller asset.

### Approved backgrounds

- Full color: Page, Page 50 or white.
- One-color Ink: Page, white or very light neutral photography with sufficient
  quiet space.
- Reversed: Ink 900/950 or Marine 700–950.

Do not place the full-color mark directly on Clay, Brass, photographs, gradients
or colors outside the token system. Use a Page tile when the host surface cannot
be controlled.

### Never

- close the brackets;
- recolor individual nodes;
- rotate, skew, condense or add effects;
- typeset a substitute wordmark;
- put the mark inside a chef hat, plate, utensil or generic AI sparkle;
- animate nodes in a way that implies calculation succeeded before validation;
- use color alone to explain what the nodes mean.

## Color

### Identity anchors

| Name | Hex | Role |
|---|---|---|
| Page | `#FBF7EF` | Default brand ground |
| Ink | `#231A20` | Text, brackets and structural anchor |
| Marine | `#235D73` | Connected S, primary action and developer trust |
| Clay | `#A94436` | Authored warmth, expressive secondary and middle node |
| Brass | `#D09A22` | First/last nodes and sparse signal |

Page and Ink are part of the identity, not interchangeable neutrals. Brass is
scarce: reserve it for connection nodes, selected data points and short signals.
It is never the default action color and never carries white body text.

### Anchor contrast

| Pair | Ratio |
|---|---:|
| Ink / Page | 15.85:1 |
| White / Marine | 7.28:1 |
| White / Clay | 5.89:1 |
| Ink / Brass | 6.72:1 |
| Marine / Page | 6.81:1 |
| Clay / Page | 5.51:1 |

Use semantic tokens in interfaces. The five anchors are not a complete UI
palette. The token source adds ramps, statuses, syntax, data colors and separate
light/dark aliases; every generated critical pair is checked automatically.

### Color hierarchy

1. Page and Ink establish the field.
2. Marine carries actions, links and technical structure.
3. Clay provides selective authored emphasis.
4. Brass signals a connection or moment of attention.
5. Functional success, warning and danger use their own semantic tokens and a
   text or icon cue.

## Typography

### Fraunces — brand and display

Use Fraunces for the outlined wordmark, hero headings, major section headings
and selected editorial quotations. Do not use it for navigation, forms, tables,
errors or dense documentation.

Recommended CSS settings:

```css
font-family: "Fraunces", Georgia, serif;
font-variation-settings: "opsz" 72, "wght" 700, "SOFT" 72, "WONK" 1;
font-weight: 700;
line-height: 1.08;
letter-spacing: -0.025em;
```

For very large heroes, increase `opsz` toward 100 and `SOFT` toward 78. Keep
`WONK` at `1`; it is part of the warm, irregular construction.

### IBM Plex Sans — interface and reading

Use Plex Sans for body copy, navigation, controls, tables, errors and long-form
documentation. The production package contains 400, 500 and 600. Use 400 for
prose, 500 for compact UI and 600 for emphasis; avoid simulated bold.

- Minimum default body size: 16 px / 1 rem.
- Prose line height: 1.65.
- UI line height: 1.35.
- Comfortable prose measure: 55–68 characters.

### IBM Plex Mono — protocol language

Use Plex Mono for code, identifiers, measurements, validation codes, registry
IDs and short technical labels. Never use monospace for paragraphs merely to
make a surface feel “developer.”

- Code line height: 1.55.
- Preserve tabular values and source punctuation.
- Do not uppercase recipe or registry values.

### Coverage and fallbacks

The bundled files cover Latin and Latin Extended. They support the current
English and Portuguese brand corpus. A new supported script requires reviewed
font files, shaping tests and updated fallbacks before release. Silent platform
fallback is not an approved localization strategy.

## Layout and visual language

- Use visible rules, annotations and bounded surfaces to make relationships
  inspectable.
- Prefer one or two columns for technical reading; avoid dashboard density when
  the task is understanding a recipe document.
- Use the Page ground generously. White is an elevated surface, not the default
  page color.
- Corners are restrained: 4–12 px for controls and cards; the rounded logo tile
  is not a license for pill-shaped everything.
- Use diagrams to show provenance, calculation and method flow. Decorative food
  photography must not substitute for protocol evidence.

## Motion

Motion should explain a state change: input resolving to a registry identity,
method nodes revealing dependency, or validation refusing a calculation.

- Standard transition: 120–200 ms.
- Complex explanatory transition: no more than 320 ms.
- Respect `prefers-reduced-motion`; essential state must remain visible without
  animation.
- Never use continuous node pulsing, parallax or decorative stirring motion.

## Accessibility requirements

- WCAG AA is the minimum for text and interactive boundaries.
- Focus is always visible and never represented by color change alone.
- Validation states include an icon or label plus exact text.
- Charts and graphs add shape, line style, label or pattern to hue.
- Light, dark and forced-colors modes are first-class outputs.
- Visual comfort overrides a technically passing palette. Repeated-reading
  fatigue is a rejection signal, as demonstrated during the identity decision.

## Governance

Changes to the mark geometry, wordmark outlines, five identity anchors or type
families require a recorded identity decision and a major design-system version.
New semantic tokens, optical exports or component aliases can ship in minor
versions after contrast and specimen checks. Generated files are never edited
by hand.
