import GithubSlugger from "github-slugger"; import fs from "fs"; import path from "path"; import matter from "gray-matter";
export const SECTIONS = ["essays", "research", "writeups", "projects"] as const;
export type Section = (typeof SECTIONS)[number];
export type Item = { section: Section; slug: string[]; url: string; title: string; description: string; date: string;
  updated?: string; tags: string[]; minutes: number; body: string; dir: string; ext: string; meta: Record<string, string>; headings: { depth: number; text: string; id: string }[]; fm: Record<string, any> };
const ROOT = path.join(process.cwd(), "content");
const walk = (d: string, out: string[] = []): string[] => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const day = (v: unknown) => (v ? new Date(v as string).toISOString().slice(0, 10) : "");
export const fmtLong = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
function headings(md: string) {
  const s = new GithubSlugger(); let fence = false; const out: Item["headings"] = [];
  for (const l of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; continue; }
    const m = !fence && /^(#{2,4})\s+(.+?)\s*#*\s*$/.exec(l);
    if (m) { const text = m[2].replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_]/g, ""); out.push({ depth: m[1].length, text, id: s.slug(text) }); }
  }
  return out;
}
export const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export function all(section?: Section): Item[] {
  const items: Item[] = [];
  for (const s of section ? [section] : SECTIONS) {
    for (const f of walk(path.join(ROOT, s))) {
      const { data, content: raw } = matter(fs.readFileSync(f, "utf8")); let content = raw;
      const slug = path.relative(path.join(ROOT, s), f).replace(/(\/index)?\.mdx?$/, "").replace(/^index$/, "").split(path.sep).filter(Boolean);
      const { title: t0, description, date, updated, tags, ...meta } = data;
      let title = t0; // no frontmatter title: use the first "# heading" and drop it from the body
      if (!title) { const m = /^#\s+(.+)$/m.exec(content); title = m ? m[1].trim() : path.basename(f); if (m) content = content.replace(m[0], ""); }
      items.push({ section: s, slug, url: `/${s}/${slug.join("/")}`, title, description: description || "", dir: path.relative(ROOT, path.dirname(f)).split(path.sep).join("/"), ext: path.extname(f),
        date: day(date || fs.statSync(f).mtime),
        updated: day(updated) || undefined, tags: tags || [], minutes: Math.max(1, Math.round(content.split(/\s+/).length / 220)),
        body: content, headings: headings(content), fm: data, meta: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, String(v)])) });
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}
export const find = (s: Section, slug: string[]) => all(s).find((i) => i.slug.join("/") === slug.join("/"));
