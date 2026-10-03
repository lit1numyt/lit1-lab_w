import type { Metadata } from "next"; import Link from "next/link";
import "@fontsource-variable/inter"; import "katex/dist/katex.min.css"; import "./globals.css";
import { all } from "@/lib/content"; import { nav, site } from "@/lib/site";
import Nav from "@/components/Nav"; import Palette from "@/components/Palette"; import OpenPalette from "./OpenPalette";
export const metadata: Metadata = {
  metadataBase: new URL(site.url), title: { default: site.name, template: `%s · ${site.name}` }, description: site.description,
  openGraph: { siteName: site.name, type: "website" }, alternates: { types: { "application/rss+xml": "/rss.xml" } },
};
export const viewport = { themeColor: "#1a1a1a" };
export default function Layout({ children }: { children: React.ReactNode }) {
  const index = all().map((i) => ({ title: i.title, url: i.url, section: i.section, description: i.description, tags: i.tags, text: i.body.slice(0, 6000) }));
  return (
    <html lang="en"><body>
      <header className="top"><Nav /><OpenPalette /></header>
      {children}
      <footer><div>{site.name}</div>
        <div className="row"><a href={`mailto:${site.email}`}>Contact</a><a href={site.github}>GitHub</a>
          {site.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}<a href="/rss.xml">RSS</a></div></footer>
      <Palette index={index} />
    </body></html>);
}
