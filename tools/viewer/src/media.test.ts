/**
 * Media surface tests (AC-7.3): all four types render as their elements,
 * roles label at document AND step level, failure is labelled by TEXT,
 * alt follows caption-then-role-label, placeholder and unmatched URIs
 * collapse to the SAME labelled-absent state, matching is by basename,
 * and the asset store's revocation lifecycle works without a DOM.
 */
import { describe, expect, test } from "bun:test";
import type { DocumentAnalysis } from "./engine.ts";
import { renderDocument, type RenderContext } from "./render.ts";
import { AssetStore, sniffMediaKind } from "./assets.ts";

const baseCtx: RenderContext = {
  i18n: { taxonomy: {}, tags: {} },
  names: {},
  lang: "pt-PT",
  assets: {},
};

function analysisOf(canonical: unknown): DocumentAnalysis {
  return { id: "x", kind: "recipe", profile: null, maturity: null, valid: true, verdicts: [], canonical };
}

const media = (over: Record<string, unknown> = {}) => ({
  role: "result",
  type: "photo",
  uri: "media/final.jpg",
  licence: "all-rights-reserved",
  ...over,
});

describe("document-level media", () => {
  test("all four types render their elements when the asset is present", () => {
    const ctx = {
      ...baseCtx,
      assets: {
        "final.jpg": "blob:photo-1",
        "tecnica.mp4": "blob:video-1",
        "crepitar.ogg": "blob:audio-1",
        "esquema.png": "blob:diagram-1",
      },
    };
    const html = renderDocument(
      analysisOf({
        name: "Teste",
        media: [
          media(),
          media({ type: "video", role: "technique", uri: "media/tecnica.mp4" }),
          media({ type: "audio", role: "technique", uri: "media/crepitar.ogg" }),
          media({ type: "diagram", role: "equipment", uri: "media/esquema.png" }),
        ],
      }),
      ctx,
    );
    expect(html).toContain('<img src="blob:photo-1"');
    expect(html).toContain('<video controls src="blob:video-1"');
    expect(html).toContain('<audio controls src="blob:audio-1"');
    expect(html).toContain('<img src="blob:diagram-1"');
    expect(html).not.toContain("autoplay");
  });

  test("failure role is labelled by TEXT, not only class", () => {
    const ctx = { ...baseCtx, assets: { "kahm.jpg": "blob:k" } };
    const html = renderDocument(
      analysisOf({ name: "T", media: [media({ role: "failure", uri: "media/kahm.jpg" })] }),
      ctx,
    );
    expect(html).toContain("falha");
    expect(html).toContain("media-failure");
  });

  test("alt = authored caption, falling back to the role label", () => {
    const ctx = { ...baseCtx, assets: { "a.jpg": "blob:a", "b.jpg": "blob:b" } };
    const html = renderDocument(
      analysisOf({
        name: "T",
        media: [
          media({ uri: "media/a.jpg", note: { pt: "Miolo aberto", en: "Open crumb" } }),
          media({ uri: "media/b.jpg" }),
        ],
      }),
      ctx,
    );
    expect(html).toContain('alt="Miolo aberto"');
    expect(html).toContain('alt="resultado"');
  });

  test("placeholder and unmatched URIs render the SAME labelled-absent state", () => {
    const placeholder = renderDocument(
      analysisOf({ name: "T", media: [media({ uri: "placeholder://todo" })] }),
      baseCtx,
    );
    const unmatched = renderDocument(
      analysisOf({ name: "T", media: [media({ uri: "media/nunca-fornecida.jpg" })] }),
      baseCtx,
    );
    expect(placeholder).toContain("media-absent");
    expect(unmatched).toContain("media-absent");
    expect(placeholder).not.toContain("<img");
    expect(unmatched).not.toContain("<img");
    const shape = (h: string) => h.replace(/[^<>a-z-]/g, "");
    expect(shape(placeholder)).toBe(shape(unmatched));
  });

  test("matching is by URI basename", () => {
    const ctx = { ...baseCtx, assets: { "final.jpg": "blob:x" } };
    const html = renderDocument(
      analysisOf({ name: "T", media: [media({ uri: "some/deep/dir/final.jpg" })] }),
      ctx,
    );
    expect(html).toContain('<img src="blob:x"');
  });
});

describe("step-level media", () => {
  test("a step's media renders inside its list item with role label", () => {
    const ctx = { ...baseCtx, assets: { "dobrar.mp4": "blob:v" } };
    const html = renderDocument(
      analysisOf({
        name: "T",
        steps: [
          {
            id: "s1",
            primitive: { id: "primitive.fold", v: 1 },
            media: [media({ role: "technique", type: "video", uri: "media/dobrar.mp4" })],
          },
        ],
      }),
      ctx,
    );
    expect(html).toContain('<video controls src="blob:v"');
    expect(html).toContain("técnica");
  });
});

describe("never serialized", () => {
  test("canonical document is untouched by rendering with assets", () => {
    const canonical = { name: "T", media: [media()] };
    const before = JSON.stringify(canonical);
    renderDocument(analysisOf(canonical), { ...baseCtx, assets: { "final.jpg": "blob:x" } });
    expect(JSON.stringify(canonical)).toBe(before);
    expect(before).not.toContain("blob:");
  });
});

describe("asset store lifecycle", () => {
  function factory() {
    let n = 0;
    const revoked: string[] = [];
    return {
      revoked,
      create: (_: Blob) => `blob:${++n}`,
      revoke: (u: string) => revoked.push(u),
    };
  }

  test("same-name re-drop revokes the previous URL", () => {
    const f = factory();
    const store = new AssetStore(f);
    store.put("x.jpg", new Blob(["a"]));
    store.put("x.jpg", new Blob(["b"]));
    expect(f.revoked).toEqual(["blob:1"]);
    expect(store.map["x.jpg"]).toBe("blob:2");
    expect(store.size).toBe(1);
  });

  test("clear revokes everything", () => {
    const f = factory();
    const store = new AssetStore(f);
    store.put("a.jpg", new Blob(["a"]));
    store.put("b.mp4", new Blob(["b"]));
    store.clear();
    expect(f.revoked.sort()).toEqual(["blob:1", "blob:2"]);
    expect(store.size).toBe(0);
  });

  test("put stores by basename so URI matching works", () => {
    const f = factory();
    const store = new AssetStore(f);
    store.put("deep/path/final.jpg", new Blob(["x"]));
    expect(Object.keys(store.map)).toEqual(["final.jpg"]);
  });
});

describe("content discrimination (magic bytes, never extension)", () => {
  const sig = (bytes: number[]) => sniffMediaKind(new Uint8Array(bytes));

  test("JPEG/PNG are photos regardless of name", () => {
    expect(sig([0xff, 0xd8, 0xff, 0xe0])).toBe("photo");
    expect(sig([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).toBe("photo");
  });

  test("MP4 and WebM are video", () => {
    expect(sig([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70])).toBe("video"); // ....ftyp
    expect(sig([0x1a, 0x45, 0xdf, 0xa3])).toBe("video");
  });

  test("Ogg, WAV and MP3 are audio", () => {
    expect(sig([0x4f, 0x67, 0x67, 0x53])).toBe("audio"); // OggS
    expect(sig([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])).toBe("audio"); // RIFF....WAVE
    expect(sig([0x49, 0x44, 0x33])).toBe("audio"); // ID3
  });

  test("YAML text is NOT media — it stays a document even named .jpg", () => {
    const yamlBytes = [...new TextEncoder().encode("rcp: 1\nid: x\n")];
    expect(sig(yamlBytes)).toBe(null);
  });
});
