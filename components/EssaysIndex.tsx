import Link from "next/link"; import { all, Item } from "@/lib/content"; import { Recent } from "@/components/Bits"; import { site } from "@/lib/site";
const dot = (i: Item) => { const age = (Date.now() - new Date(i.updated || i.date).getTime()) / 864e5; return age <= 30 ? "recent" : age <= 90 ? "fresh" : ""; };
export default function EssaysIndex() {
  const items = all("essays"); const groups = new Map<string, Map<string, Item[]>>();
  for (const i of items) {
    const g = i.fm.group || "All Essays", s = i.fm.subgroup || "";
    if (!groups.has(g)) groups.set(g, new Map()); const m = groups.get(g)!; m.set(s, [...(m.get(s) || []), i]);
  }
  return (<main className="wide">
    <div className="headrow"><h1 className="page-h">Essays by {site.name}</h1>
      <p className="legend"><span><i className="dot recent" />last 30 days</span><span><i className="dot fresh" />last 90 days</span></p></div>
    <p className="page-sub">{site.description}</p>
    <details className="about"><summary>About this collection</summary><p>[Describe this collection here. Replace this placeholder.]</p></details>
    {items.length > 0 && <><h2 className="sec-h">Recent Essays</h2><Recent items={items.slice(0, 5)} /></>}
    <div className="groups">{[...groups].map(([g, subs]) => (<section key={g}><h2 className="sec-h">{g}</h2>
      {[...subs].map(([s, list]) => (<div key={s}>{s && <h3 className="sub">{s}</h3>}<ul className="plain">{list.map((i) => (
        <li key={i.url}><Link href={i.url}><span>{i.title}</span>{dot(i) && <i className={`dot ${dot(i)}`} aria-hidden="true" />}</Link></li>))}</ul></div>))}</section>))}</div>
  </main>);
}
