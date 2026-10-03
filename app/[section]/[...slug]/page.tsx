import Link from "next/link"; import { notFound } from "next/navigation"; import { find, all, fmtLong, SECTIONS, Section } from "@/lib/content";
import Mdx from "@/components/Mdx"; import Toc from "@/components/Toc"; import { site } from "@/lib/site";
export const dynamicParams = false;
export const generateStaticParams = () => all().map((i) => ({ section: i.section, slug: i.slug }));
export function generateMetadata({ params }: { params: { section: Section; slug: string[] } }) {
  const i = find(params.section, params.slug); if (!i) return {};
  return { title: i.title, description: i.description, alternates: { canonical: i.url },
    openGraph: { title: i.title, description: i.description, url: `${site.url}${i.url}`, type: "article", publishedTime: i.date } };
}
export default function Page({ params }: { params: { section: Section; slug: string[] } }) {
  if (!SECTIONS.includes(params.section)) notFound();
  const i = find(params.section, params.slug); if (!i) notFound();
  const takeaways: string[] = i.fm.takeaways || []; const faq: { q: string; a: string }[] = i.fm.faq || [];
  const bits = [`Published ${fmtLong(i.date)}`, i.updated && `Updated ${fmtLong(i.updated)}`, `${i.minutes} min read`, i.meta.ctf, i.meta.category, i.meta.difficulty].filter(Boolean);
  return (<main className="wide">
    <Link className="back" href={`/${i.section}`}>← Back to {i.section}</Link>
    <header className="ahead"><p className="meta">{bits.join(" • ")}</p><h1>{i.title}</h1>
      {i.description && <p className="lede">{i.description}</p>}
      {i.tags.length > 0 && <ul className="pills">{i.tags.map((t) => <li key={t}>{t}</li>)}</ul>}</header>
    <div className="cols">
      <article><Mdx source={i.body} base={i.dir} md={i.ext === ".md"} /></article>
      <aside className="side"><div className="sticky">
        <Toc headings={i.headings} />
        {takeaways.length > 0 && <section><p className="side-label">Key takeaways</p><ul>{takeaways.map((t) => <li key={t}>{t}</li>)}</ul></section>}
        {faq.length > 0 && <section><p className="side-label">FAQ</p><div className="faq">{faq.map((f) => <div key={f.q}><p className="q">{f.q}</p><p>{f.a}</p></div>)}</div></section>}
      </div></aside>
    </div></main>);
}
