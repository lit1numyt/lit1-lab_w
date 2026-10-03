import path from "path"; import { Children, isValidElement } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm"; import remarkMath from "remark-math"; import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex"; import rehypeSlug from "rehype-slug"; import rehypePrettyCode from "rehype-pretty-code";
const enc = (s: string) => { try { return encodeURI(decodeURI(s)); } catch { return s; } };
// "image/a.png" or "./image/a.png" next to the file -> /assets/<file's folder>/image/a.png
const resolve = (src: string, dir: string) => /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(src) ? src : enc(path.posix.normalize(`/assets/${dir}/${src}`));
export default function Mdx({ source, base, md }: { source: string; base: string; md?: boolean }) {
  const Img = ({ src, alt, ...p }: any) => (<figure><img {...p} src={typeof src === "string" ? resolve(src, base) : src} alt={alt || ""} loading="lazy" />{alt && <figcaption>{alt}</figcaption>}</figure>);
  // <figure> is not allowed inside <p>: a paragraph that contains an image becomes a <div>
  const P = ({ children, ...p }: any) => Children.toArray(children).some((c) => isValidElement(c) && (c.type === Img || c.type === "img"))
    ? <div {...p}>{children}</div> : <p {...p}>{children}</p>;
  const components = { img: Img, p: P, table: (p: any) => <div className="scroll"><table {...p} /></div> };
  return (<MDXRemote source={source} components={components} options={{ mdxOptions: {
    format: md ? "md" : "mdx", // .md = plain Markdown, .mdx = MDX
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [...(md ? [rehypeRaw] : []), rehypeSlug, rehypeKatex, [rehypePrettyCode, { theme: "github-dark", keepBackground: false }]] as any } }} />);
}
