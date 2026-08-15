# Schemami design system

**Version:** 1.0.0<br>
**Identity:** A / Bounded Savor<br>
**Status:** production foundation

This directory is the implementation source for Schemami’s visual identity and
cross-application design foundations. It provides self-hosted fonts, portable
SVG assets, source tokens, generated CSS and Swift colors, baseline components
and automated contrast validation.

It does not prescribe the interface of applications built on the protocol.
Schemami products share foundations and behavior standards; recipe viewers,
bakery schedulers and ingestion tools still own their task-specific UX.

## Structure

```text
design-system/
├── assets/
│   ├── fonts/              # Licensed Latin + Latin-Extended WOFF2 files
│   └── logos/              # Portable outlined lockups and optical icons
├── generated/
│   ├── schemami.css        # CSS custom properties with light/dark modes
│   ├── schemami.resolved.json
│   └── SchemamiTokens.swift
├── scripts/
│   ├── build-brand-assets.py
│   ├── build-tokens.mjs
│   └── requirements.txt
├── styles/
│   ├── fonts.css
│   └── foundation.css
├── tokens/
│   └── schemami.tokens.json
├── specimen.template.html   # Source for the visual reference
└── specimen.html            # Generated self-contained visual reference
```

## Use on the web

Import the complete foundation:

```css
@import url("/design-system/styles/foundation.css");
```

Or consume only the layers you need:

```css
@import url("/design-system/styles/fonts.css");
@import url("/design-system/generated/schemami.css");
```

Use semantic variables in application code:

```css
.recipe-card {
  color: var(--sm-semantic-color-text-primary);
  background: var(--sm-semantic-color-background-surface);
  border: var(--sm-border-hairline) solid var(--sm-semantic-color-border-subtle);
  border-radius: var(--sm-component-card-radius);
}
```

Do not bind components directly to `--sm-color-marine-600` or another primitive
unless the value is identity artwork. Semantic aliases preserve meaning across
themes and future adjustments.

## Themes

The default is light. Automatic dark mode applies when the user prefers dark
and the document has not selected a theme.

```html
<html data-theme="dark">
```

Use `data-theme="light"` to opt out of automatic dark mode for a controlled
surface. Never implement dark mode by inverting values or applying a global
filter.

The self-contained design-system specimen includes a persistent System / Light /
Dark switch. Product interfaces may adapt that control to their own settings
architecture, but must expose the same three behaviors when they offer a manual
theme preference. Brand and research reports are fixed reading documents; they
do not act as theme demonstrations.

Forced-colors and reduced-motion behavior is included in `foundation.css`.
Applications must still test their own components and charts in those modes.

## Token architecture

### Primitive

Raw identity and functional ramps: `color.marine.600`, `space.4`,
`font.size.md`, `radius.lg`. Primitive names describe ingredients, not usage.

### Semantic

Purpose-based aliases: `semantic.color.text.primary`,
`semantic.color.action.primary.background`, `semantic.color.status.danger`.
Dark mode overrides these paths while components keep the same meaning.

### Component

Shared decisions such as button height, field padding, card radius and focus-ring
width. Component tokens may reference semantic or primitive tokens.

The JSON uses DTCG-style `$type`, `$value`, group inheritance and references.
Generated outputs resolve those references for platforms that do not consume the
source format directly.

## Build and validate

From the repository root:

```sh
node design-system/scripts/build-tokens.mjs
```

The token build:

1. validates token references and cycles;
2. generates CSS light/dark variables;
3. generates resolved JSON;
4. generates SwiftUI colors;
5. checks 22 critical text, action, focus, border and status pairs against WCAG
   contrast thresholds.

Generated files are committed for consumers that do not run the build. Never
edit them directly.

Build the self-contained specimen after the tokens:

```sh
node design-system/scripts/build-specimen.mjs
```

The specimen generator embeds the canonical CSS, fonts and SVGs into one HTML
file for reliable local review. Edit `specimen.template.html`, never the output.

### Rebuild logo outlines

Logo geometry is generated only when the approved wordmark or source font
settings change:

```sh
python3 -m pip install -r design-system/scripts/requirements.txt
python3 design-system/scripts/build-brand-assets.py
```

The script instantiates Fraunces at the approved axes, shapes `schemami` with
HarfBuzz and converts the wordmark to SVG outlines. Review every regenerated
asset visually and treat changed paths as an identity change.

## Font policy

- Fraunces: wordmark, heroes and selected display moments.
- IBM Plex Sans: interface, documentation and long reading.
- IBM Plex Mono: code, identifiers, measurements and technical labels.

The package contains Latin and Latin-Extended WOFF2 subsets under the SIL Open
Font License. The license files are in `assets/fonts/licenses/`. Add scripts
deliberately; do not rely on an unreviewed system fallback for a supported
locale.

## Baseline components

`foundation.css` includes deliberately small, framework-independent contracts:

- `.sm-button` with `data-variant="primary|secondary"`;
- `.sm-field` including invalid state;
- `.sm-card`;
- `.sm-alert` with `data-tone="success|warning|danger"`;
- `.sm-code`;
- `.sm-eyebrow`;
- global focus-visible, typography, link and reduced-motion behavior.

These are reference implementations and safe defaults, not a complete product
component library. A framework component must preserve their semantics, token
usage, states and accessibility behavior.

### Component contract

Every interactive component defines:

- rest, hover, active, focus-visible, disabled and selected where applicable;
- keyboard behavior and visible focus;
- accessible name, role and state;
- loading, empty, success, unresolved and refusal states where applicable;
- light, dark, forced-colors and reduced-motion behavior;
- text expansion and 200% zoom behavior;
- non-color state cues.

## Protocol-specific patterns

### Recipe document

Source, authored, resolved and derived values remain visibly distinguishable.
Do not replace source text with a normalized value. Pair relationships and
calculation results with provenance where the distinction affects trust.

### Refusal

A refusal is a first-class result, not a generic error. Components show the
outcome, exact reason, preserved data and recovery action. Use the danger tokens
only with text and an icon or structural border.

### Unresolved data

Unresolved does not mean invalid. Use an informational or warning treatment
based on whether the value blocks the current operation. Preserve the source
label and never make provisional semantics appear computed.

### Registry identity

Display stable IDs in Plex Mono. Human labels may be localized by the
application. Do not embed interface translations into protocol data.

### Provenance and lineage

Use lines, nodes, labels and direction rather than color alone. Personal recipes
receive their own identity and point to their source; they are not presented as
an in-place edit of the original.

## SwiftUI

Add `generated/SchemamiTokens.swift` to the application target:

```swift
let colors = colorScheme == .dark
  ? SchemamiThemeColors.dark
  : SchemamiThemeColors.light

Text("Scaling stopped")
  .foregroundStyle(colors.statusDangerForeground)
```

The generated Swift file currently covers primitive and semantic colors. Use
native Dynamic Type, spacing and control metrics around those colors; do not
hard-code a web pixel scale into iOS.

## Accessibility baseline

The generated report records the exact checked pairs. Current minimums include:

- body and linked text: 4.5:1;
- primary action text: 4.5:1;
- focus indicators and default control boundaries: 3:1;
- status text on status surfaces: 4.5:1.

Passing a contrast formula is necessary, not sufficient. Test long-reading
comfort, color-vision simulations, grayscale, zoom, keyboard navigation and
screen-reader output on real product surfaces.

## Contribution workflow

1. Change the source token or canonical asset generator.
2. Run the build and validation.
3. Inspect the specimen in light and dark modes.
4. Test the affected component at relevant breakpoints.
5. Document the decision and migration consequence.
6. Commit source and generated outputs together.

Identity anchors, mark geometry and type families require founder approval and a
major version. Semantic additions and compatible component aliases may ship in
minor versions. Corrections that do not change meaning may ship as patches.

## Remaining validation

This package makes the approved direction reproducible, but production quality
continues through product testing. Before a public launch, validate at least one
real documentation page, conformance error, SDK example, GitHub avatar, mobile
surface and dark-mode workflow with external developers.
