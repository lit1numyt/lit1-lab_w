"use client";
import { useEffect, useRef, useState } from "react";
type H = { depth: number; text: string; id: string };
export default function Toc({ headings }: { headings: H[] }) {
  const [active, setActive] = useState(0); const [pos, setPos] = useState({ top: 0, h: 0 }); const ul = useRef<HTMLUListElement>(null);
  const min = Math.min(...headings.map((h) => h.depth));
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0; let a = 0;
      headings.forEach((h, i) => { const el = document.getElementById(h.id); if (el && el.getBoundingClientRect().top <= 140) a = i; });
      setActive(a);
      const li = ul.current?.children[a] as HTMLElement | undefined; // measure the real row so the marker and green fill line up with it
      if (li) setPos({ top: li.offsetTop, h: li.offsetHeight });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [headings]);
  if (!headings.length) return null;
  return (<nav aria-label="On this page"><p className="side-label">On this page</p>
    <div className="toc"><div className="track" aria-hidden="true"><div className="prog" style={{ height: pos.top }} />
      <div className="ind" style={{ top: pos.top, height: pos.h }} /></div>
      <ul ref={ul}>{headings.map((h, i) => (<li key={h.id} style={{ paddingLeft: `${(h.depth - min) * 0.75}rem` }}>
        <a href={`#${h.id}`} className={i === active ? "on" : ""} aria-current={i === active ? "location" : undefined}>{h.text}</a></li>))}</ul></div></nav>);
}
