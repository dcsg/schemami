# Production fonts

Self-hosted files for the approved Schemami type system.

| Family | Package source | Version | Files |
|---|---|---:|---|
| Fraunces Variable | `@fontsource-variable/fraunces` | 5.3.0 | Latin and Latin-Extended, normal, full axes |
| IBM Plex Sans | `@fontsource/ibm-plex-sans` | 5.3.0 | Latin and Latin-Extended, 400/500/600 |
| IBM Plex Mono | `@fontsource/ibm-plex-mono` | 5.3.0 | Latin and Latin-Extended, 400/600 |

All three families are distributed under the SIL Open Font License. Exact
license texts are in [`licenses/`](licenses/).

`styles/fonts.css` defines matching unicode ranges so a browser can select the
correct subset. A declaration without those ranges may silently load only one
subset and fall back for other glyphs; do not copy only the URLs.

Official upstream projects:

- <https://github.com/undercasetype/Fraunces>
- <https://github.com/IBM/plex>

The outlined wordmark is generated from Fraunces but does not require a font at
runtime. Application and documentation typography still uses the bundled font
files.
