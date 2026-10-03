"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
type E = { title: string; url: string; section: string; description: string; tags: string[]; text: string };
const pages: E[] = ["Essays:/essays", "Research:/research", "Writeups:/writeups", "Projects:/projects", "About:/about"]
  .map((s) => { const [title, url] = s.split(":"); return { title, url, section: "page", description: "", tags: [], text: "" }; });
export default function Palette({ index }: { index: E[] }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [sel, setSel] = useState(0);
  const router = useRouter(); const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    const o = () => setOpen(true);
    window.addEventListener("keydown", k); window.addEventListener("open-palette", o);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("open-palette", o); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const score = (e: E) => { let s = 0; for (const t of terms) {
    const hit = e.title.toLowerCase().includes(t) ? 4 : e.tags.join(" ").toLowerCase().includes(t) || e.section.includes(t) ? 3
      : e.description.toLowerCase().includes(t) ? 2 : e.text.toLowerCase().includes(t) ? 1 : 0;
    if (!hit) return 0; s += hit; } return s || 1; };
  const results = [...pages, ...index].map((e) => [e, score(e)] as const).filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([e]) => e);
  const go = (e?: E) => { if (e) { setOpen(false); router.push(e.url); } };
  if (!open) return null;
  return (
    <div className="pal-back" onMouseDown={() => setOpen(false)}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === "Enter") go(results[sel]);
        }}>
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Search or jump to…"
          role="combobox" aria-expanded="true" aria-controls="pal-list" />
        <ul id="pal-list" role="listbox">
          {results.map((e, i) => (
            <li key={e.url} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(e)}>
              <span>{e.title}</span><small>{e.section}</small>
            </li>))}
          {!results.length && <li className="none">No results</li>}
        </ul>
      </div>
    </div>);
}
