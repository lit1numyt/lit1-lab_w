"use client";
import Link from "next/link"; import { usePathname } from "next/navigation"; import { nav } from "@/lib/site";
export default function Nav() {
  const path = usePathname();
  return (<nav aria-label="Primary">{nav.map((n) => (
    <Link key={n.href} href={n.href} aria-current={(n.href === "/essays" && path === "/") || path === n.href || path.startsWith(n.href + "/") ? "page" : undefined}>{n.label}</Link>))}</nav>);
}
