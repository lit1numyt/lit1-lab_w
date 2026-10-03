import { all } from "@/lib/content"; import { site } from "@/lib/site";
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
export const dynamic = "force-static";
export function GET() {
  const items = all().map((i) => `<item><title>${esc(i.title)}</title><link>${site.url}${i.url}</link><guid>${site.url}${i.url}</guid><pubDate>${new Date(i.date).toUTCString()}</pubDate><description>${esc(i.description)}</description></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.name)}</title><link>${site.url}</link><description>${esc(site.description)}</description>${items}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
