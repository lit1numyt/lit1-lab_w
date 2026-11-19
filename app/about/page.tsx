import { site } from "@/lib/site";
export const metadata = { title: "About" };
export default function About() {
  return (<main><h1>About</h1><p>hi, i'm {site.name}. i play ctfs, mostly pwn, and this is where my writeups live now that they've moved off hackmd.</p>
    <p>{site.email && <><a href={`mailto:${site.email}`}>{site.email}</a> · </>}<a href={site.github}>GitHub</a></p></main>);
}
