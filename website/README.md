# Schemami website

Production static documentation site for Schemami v1. This is the canonical
website source; `tools/docsite/` remains an obsolete RCP prototype.

The site consumes the repository design system, released schemas, SDK examples,
AI kit, problem pages, and the tested browser verifier. It does not duplicate
protocol semantics or perform server-side computation.

```sh
tools/with-toolchain.sh bun run --cwd website build
tools/with-toolchain.sh bun run --cwd website dev
```

The development server listens on `http://127.0.0.1:4175/`. Generated output is
written to `website/dist/` and is suitable for static Cloudflare Pages hosting.

The production build first generates the commit-bound release manifest and
passes its path as `SCHEMAMI_RELEASE_MANIFEST`. `CF_PAGES=1` builds refuse when
that exact manifest is absent.

Cloudflare Pages uses the pinned Bun runtime directly, so its build command is:

```sh
bun install --cwd sdk/typescript --frozen-lockfile && bun run tools/schemami/build-release-manifest.ts /tmp/schemami-v1.0.0.json && SCHEMAMI_RELEASE_MANIFEST=/tmp/schemami-v1.0.0.json bun run --cwd website build
```
