/**
 * Local media asset store (schema/MEDIA.md). Supplied files (file input
 * or drop) are matched to document media by URI BASENAME; whether a file
 * is an asset or a document is decided by CONTENT (magic bytes), never
 * extension. Object URLs are presentation state — they are handed to the
 * renderer via RenderContext.assets and NEVER serialized into documents
 * (MEDIA.md "Never serialized").
 *
 * The URL factory is injected so the revocation lifecycle is testable
 * without a DOM (bun test) — the browser passes URL.createObjectURL /
 * URL.revokeObjectURL.
 */

export interface AssetURLFactory {
  create(file: Blob): string;
  revoke(url: string): void;
}

/** Media kind by magic bytes, or null when the bytes are not a media asset. */
export function sniffMediaKind(head: Uint8Array): "photo" | "video" | "audio" | null {
  const startsWith = (sig: number[], offset = 0): boolean =>
    sig.every((b, i) => head[offset + i] === b);
  const ascii = (s: string, offset = 0): boolean =>
    [...s].every((c, i) => head[offset + i] === c.charCodeAt(0));

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "photo"; // PNG
  if (startsWith([0xff, 0xd8, 0xff])) return "photo"; // JPEG
  if (ascii("GIF87a") || ascii("GIF89a")) return "photo";
  if (ascii("RIFF") && ascii("WEBP", 8)) return "photo";
  if (ascii("ftyp", 4)) return "video"; // MP4/MOV family
  if (startsWith([0x1a, 0x45, 0xdf, 0xa3])) return "video"; // WebM/Matroska
  if (ascii("RIFF") && ascii("WAVE", 8)) return "audio";
  if (ascii("OggS")) return "audio";
  if (ascii("ID3") || startsWith([0xff, 0xfb])) return "audio"; // MP3
  return null;
}

export class AssetStore {
  private urls = new Map<string, string>();

  constructor(private factory: AssetURLFactory) {}

  /** Register a file under its basename; a same-name re-drop revokes the old URL. */
  put(name: string, file: Blob): void {
    const basename = name.split("/").pop() ?? name;
    const old = this.urls.get(basename);
    if (old !== undefined) this.factory.revoke(old);
    this.urls.set(basename, this.factory.create(file));
  }

  /** Revoke everything (document change / page reset). */
  clear(): void {
    for (const url of this.urls.values()) this.factory.revoke(url);
    this.urls.clear();
  }

  /** Snapshot for RenderContext.assets: basename -> object URL. */
  get map(): Record<string, string> {
    return Object.fromEntries(this.urls);
  }

  get size(): number {
    return this.urls.size;
  }
}
