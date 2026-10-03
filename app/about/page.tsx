import { site } from "@/lib/site";
export const metadata = { title: "About" };
export default function About() {
  return (<main><h1>About</h1><p>[Write a short bio for {site.name} here.]</p>
    <p><a href={`mailto:${site.email}`}>{site.email}</a> · <a href={site.github}>GitHub</a></p></main>);
}
