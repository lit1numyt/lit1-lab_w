import Link from "next/link"; import { fmt, Item } from "@/lib/content";
export const Meta = ({ i }: { i: Item }) => {
  const parts = [i.date && fmt(i.date), i.meta.ctf, i.meta.category, i.meta.difficulty, `${i.minutes} min read`].filter(Boolean);
  return <p className="meta">{parts.join(" · ")}</p>;
};
export const Entries = ({ items }: { items: Item[] }) => (
  <ol className="entries">{items.map((i) => (
    <li key={i.url}><Link href={i.url}>{i.title}</Link>{i.description && <p>{i.description}</p>}<Meta i={i} /></li>))}</ol>);
export const Recent = ({ items }: { items: Item[] }) => (
  <ol className="recent">{items.map((i) => (
    <li key={i.url}><Link href={i.url}><span>{i.title}</span><time>{fmt(i.date)}</time></Link></li>))}</ol>);
export const Blocks = ({ items }: { items: Item[] }) => (
  <div className="blocks">{items.map((i) => {
    const related: { label: string; href: string }[] = i.fm.related || [];
    const stats = [i.meta.stat, i.meta.ctf, i.meta.category, i.meta.difficulty, `${i.minutes} min read`].filter(Boolean);
    return (<div key={i.url} className="block-card">
      <Link className="bc-main" href={i.url}><span className="bc-title">{i.title}</span>{i.description && <p>{i.description}</p>}
        <div className="bc-meta">{stats.map((s, k) => (<span key={k}>{k > 0 && <span style={{ marginRight: ".75rem" }}>·</span>}{s}</span>))}</div></Link>
      <div className="pills2">{related.length
        ? related.map((r) => <Link key={r.href} className="pill" href={r.href}>{r.label}</Link>)
        : i.tags.map((t) => <span key={t} className="pill">{t}</span>)}</div>
    </div>);
  })}</div>);
