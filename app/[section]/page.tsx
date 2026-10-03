import { notFound } from "next/navigation"; import { all, SECTIONS, Section } from "@/lib/content"; import { Entries, Blocks } from "@/components/Bits";
import EssaysIndex from "@/components/EssaysIndex"; import { site } from "@/lib/site";
const copy: Record<string, string> = { essays: "Essays", research: "Research", writeups: "Writeups", projects: "Projects" };
const sub: Record<string, string> = { research: "[Research notes and technical deep-dives.]", writeups: "[CTF writeups and solutions.]", projects: "[Things I have built.]" };
export const revalidate = 3600; export const dynamicParams = false;
export const generateStaticParams = () => SECTIONS.map((section) => ({ section }));
export const generateMetadata = ({ params }: { params: { section: string } }) => ({ title: copy[params.section], alternates: { canonical: `/${params.section}` } });
export default function List({ params }: { params: { section: string } }) {
  if (!SECTIONS.includes(params.section as Section)) notFound();
  const s = params.section as Section;
  if (s === "essays") return <EssaysIndex />;
  const items = all(s);
  return (<main className="wide"><h1 className="page-h">{copy[s]} by {site.name}</h1><p className="page-sub">{sub[s]}</p>
    {!items.length ? <p className="page-sub">Nothing here yet. Add an MDX file under content/{s}/.</p>
      : s !== "essays" ? <Blocks items={items} /> : <Entries items={items} />}</main>);
}
