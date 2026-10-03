import fs from "fs"; import path from "path";
// Serves images that live next to your .md/.mdx files (content/**/image/...).
const ROOT = path.join(process.cwd(), "content");
const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml" };
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
export function GET(_: Request, { params }: { params: { path: string[] } }) {
  const file = path.resolve(ROOT, ...params.path.map(dec));
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(ROOT + path.sep) || !type || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600", "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'" } });
}
