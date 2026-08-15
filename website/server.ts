import { extname, join, normalize } from "node:path";

const root = join(import.meta.dir, "dist");
const types: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

Bun.serve({
  hostname: "127.0.0.1",
  port: 4175,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const relative = normalize(pathname).replace(/^[/\\]+/, "");
    const path = join(root, relative);
    if (!path.startsWith(root)) return new Response("Not found", { status: 404 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response(Bun.file(join(root, "404.html")), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
    return new Response(file, { headers: { "content-type": types[extname(path)] || "application/octet-stream" } });
  },
});

console.log("Schemami website: http://127.0.0.1:4175/");
