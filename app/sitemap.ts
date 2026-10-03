import { all } from "@/lib/content"; import { site } from "@/lib/site";
export default function sitemap() {
  const pages = ["", "/essays", "/research", "/writeups", "/projects", "/about"].map((p) => ({ url: site.url + p }));
  return [...pages, ...all().map((i) => ({ url: site.url + i.url, lastModified: i.updated || i.date }))];
}
