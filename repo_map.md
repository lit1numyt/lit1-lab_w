Here's the tour: the layout, how the pieces fit, and where to go for each part of the UI.

## How it works in one paragraph

Your writing lives in `content/` as Markdown files. At build time, `lib/content.ts` reads every file and pulls out its frontmatter, headings and reading time. The pages in `app/` are Next.js **server components**, so they run on the server (or at build) and produce plain HTML. `components/Mdx.tsx` turns each article body into HTML, with code highlighting and math already applied. Only four small pieces run JavaScript in the browser: the nav, the search button, the ⌘K palette and the sidebar table of contents.

```
content/**/*.md(x)
      │  gray-matter: frontmatter + body
      ▼
lib/content.ts ── all() / find() ──► pages in app/ (server components)
                                        │
                        article body ──► components/Mdx.tsx
                                        (GFM → KaTeX → Shiki → custom img/table)
                                        │
                                        ▼
                                   static HTML ──► browser
                                                    + client parts: Nav, Palette, Toc
layout.tsx builds the search index from all() and hands it to Palette
```

## Folder map

```
archive/
├── content/                   YOUR WRITING (images sit next to each file)
│   ├── essays/<slug>/index.mdx
│   ├── research/<slug>/index.mdx
│   ├── writeups/<ctf>/<slug>/index.md  (+ image/ folder)
│   └── projects/<slug>/index.mdx
├── app/                       every folder here is a URL
│   ├── layout.tsx             page shell: header, footer, palette, fonts
│   ├── globals.css            ALL styling and the colour/font tokens
│   ├── page.tsx               "/" (renders the Essays index)
│   ├── about/page.tsx         /about
│   ├── [section]/page.tsx     /essays /research /writeups /projects
│   ├── [section]/[...slug]/page.tsx   one article
│   ├── assets/[...path]/route.ts      serves images from content/
│   ├── OpenPalette.tsx        the magnifier + ⌘K button
│   ├── rss.xml/route.ts, sitemap.ts, robots.ts
├── components/
│   ├── Mdx.tsx                Markdown → HTML pipeline
│   ├── Toc.tsx                sidebar "On this page"
│   ├── Palette.tsx            ⌘K search dialog
│   ├── Nav.tsx                top navigation
│   ├── Bits.tsx               Meta, Recent, Blocks (cards), Entries
│   └── EssaysIndex.tsx        Essays/home page layout
├── lib/
│   ├── content.ts             the content loader
│   └── site.ts                site name/description/links + nav items
├── public/                    static files served as-is
└── Dockerfile, docker-compose.yml, Caddyfile, .env, next.config.mjs
```

## URL to file

| URL | File | What it renders |
|---|---|---|
| `/` and `/essays` | `app/page.tsx`, `[section]/page.tsx` | `EssaysIndex` |
| `/research`, `/writeups`, `/projects` | `app/[section]/page.tsx` | `Blocks` (cards) |
| `/<section>/<slug…>` | `app/[section]/[...slug]/page.tsx` | one article |
| `/about` | `app/about/page.tsx` | plain text page |
| `/assets/...` | `app/assets/[...path]/route.ts` | your images |
| `/rss.xml`, `/sitemap.xml`, `/robots.txt` | `rss.xml/route.ts`, `sitemap.ts`, `robots.ts` | feeds and SEO |

## UI part to code

| What you see | Where to edit | CSS classes in `globals.css` |
|---|---|---|
| Colours, fonts, content width | top of `globals.css` (`:root` tokens) | `--background`, `--accent`, `--width`… |
| Top nav labels | `nav` in `lib/site.ts` | `.top`, `.top nav` |
| Nav underline on current page | `components/Nav.tsx` | `.top nav a[aria-current]` |
| Footer | `app/layout.tsx` | `footer` |
| Site name, description, email, GitHub | `.env` and `lib/site.ts` | none |
| Essays page (legend dots, About row, lists) | `components/EssaysIndex.tsx` | `.headrow`, `.legend`, `.about`, `.sec-h`, `.groups`, `.plain`, `.dot` |
| Dated rows ("Recent Essays") | `Recent` in `components/Bits.tsx` | `.recent` |
| Research/Projects/Writeups cards | `Blocks` in `components/Bits.tsx` | `.block-card`, `.bc-*`, `.pill` |
| Article header (back link, meta, title, tags) | `app/[section]/[...slug]/page.tsx` | `.back`, `.ahead`, `.pills` |
| Article typography (headings, lists, quotes, tables) | `globals.css` | `main.wide article …`, `article h2` etc. |
| Code blocks | theme name in `components/Mdx.tsx` (`github-dark`) | `pre`, `code` |
| Math | `remark-math` + `rehype-katex` in `Mdx.tsx` | `.katex-display` |
| Figure captions, image path handling | `img` in `Mdx.tsx` | `figure`, `figcaption` |
| Sidebar TOC and progress bar | `components/Toc.tsx` | `.toc`, `.track`, `.prog`, `.ind` |
| Key takeaways / FAQ | `[...slug]/page.tsx` (reads frontmatter) | `.side`, `.faq` |
| ⌘K palette look | `components/Palette.tsx` | `.pal`, `.pal-back` |
| ⌘K search behaviour (scoring) | `score` function in `Palette.tsx` | none |

## Frontmatter fields the code reads

| Field | Used by |
|---|---|
| `title`, `description`, `date`, `updated`, `tags` | article header, lists, SEO, RSS |
| `ctf`, `category`, `difficulty` | meta line on writeup pages and cards |
| `takeaways`, `faq` | sidebar |
| `group`, `subgroup` | Essays page topic columns |
| `stat`, `related` | Research/Projects card meta and pills |

## Tech stack

- **Next.js 14 (App Router):** routing, static generation, metadata, RSS/sitemap routes. `output: "standalone"` in `next.config.mjs` is what makes the small Docker image possible.
- **next-mdx-remote:** compiles the body at build time. `.md` files are parsed as plain Markdown and `.mdx` as MDX.
- **remark/rehype plugins:** `gfm` (tables, task lists), `math` and `katex` (LaTeX), `slug` (heading IDs the sidebar links to), `raw` (HTML in `.md`), `pretty-code` with Shiki (highlighting).
- **gray-matter and github-slugger:** frontmatter parsing, and heading IDs for the sidebar that match the ones in the page.
- **Plain CSS:** one file, using CSS variables. No Tailwind, so what you see in the reference's HTML as `text-sm` is written out as `.875rem` here.
- **Docker + Caddy:** the app runs in a Node container. Caddy sits in front for HTTPS and reverse proxying.

## Things to know before customizing

- **Adding a new section:** add its name to `SECTIONS` in `lib/content.ts`, add a nav entry in `lib/site.ts`, and add its title and subtitle in `app/[section]/page.tsx`. Then create `content/<name>/`.
- **Full-width vs narrow pages:** `<main className="wide">` gives the full-width reference layout. Without `wide`, everything is capped at `--width` (48rem). The about page uses the narrow layout.
- **New content needs a rebuild in production.** `npm run dev` picks up new files live. With Docker, content is copied in at build time, so run `docker compose up -d --build` after adding posts.
- **Light and dark:** the theme follows the operating system, with no toggle. The code theme is always dark, so code blocks will look dark in light mode.
- **Search index size:** `layout.tsx` embeds the first 6,000 characters of every article into every page for the palette. That's fine for dozens of posts. With hundreds, move the index into a JSON file that the palette fetches when opened.
- **Dead code:** `Entries` in `Bits.tsx` is no longer used, since all non-essay lists became cards. You can delete it.

If you'd like, I can add this guide to the repo as `docs/ARCHITECTURE.md` so you keep it next to the code.