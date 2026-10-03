# Architecture

This document explains how the site is put together: the request flow, what
each file does, how content becomes HTML, and where to make specific changes.
It reflects the code as it exists in the repo right now — if you refactor
something, update this file too.

---

## 1. The big picture

There is no database and no CMS. The pipeline is:

```javascript
content/**/*.md or *.mdx   (your writing, in Git)
         │
         │  read at build/request time by lib/content.ts
         ▼
   Item[] objects            (title, dates, tags, body text, headings...)
         │
         ├──► app/page.tsx, app/[section]/page.tsx    (list pages)
         │       via components/EssaysIndex.tsx, components/Bits.tsx
         │
         └──► app/[section]/[...slug]/page.tsx         (one article)
                 │
                 ├──► components/Mdx.tsx   turns the MDX/MD body into HTML
                 │       (GitHub-flavored Markdown → KaTeX math → Shiki code
                 │        highlighting → your own <img>/<p>/<table> rules)
                 │
                 └──► components/Toc.tsx   builds the "On this page" sidebar
                         from the headings list produced in lib/content.ts

app/layout.tsx wraps every page: it renders the top nav (components/Nav.tsx),
the search button (app/OpenPalette.tsx), the footer, and mounts the ⌘K
palette (components/Palette.tsx) with a search index built from all() content.
```

Almost all of this runs **on the server** (or once, at build time, for static
pages) and produces plain HTML — there is no client-side data fetching, no
loading spinners, no API calls to render an article. Only four files run
JavaScript in the visitor's browser, and each one is marked with the
`"use client"` directive at its top:

- `components/Nav.tsx` — needs to know the current URL to underline the
  active section.
- `app/OpenPalette.tsx` — a button that dispatches an event to open the
  palette.
- `components/Palette.tsx` — the ⌘K dialog: keyboard shortcuts, filtering,
  and navigation.
- `components/Toc.tsx` — the sidebar table of contents: it watches scroll
  position to highlight the current section and move the progress marker.

Everything else — `lib/content.ts`, `components/Mdx.tsx`, `components/Bits.tsx`,
`components/EssaysIndex.tsx`, and every file under `app/` except the two
listed above — is a **server component**. It never ships its code to the
browser; it only ships the HTML it produced.

---

## 2. Folder-by-folder map

```javascript
archive/
├── content/                        ← your writing lives here, nothing else does
│   ├── essays/<slug>/index.mdx
│   ├── research/<slug>/index.mdx
│   ├── writeups/<ctf>/<slug>/index.md   (or .mdx)
│   │      └── image/...                  images sit next to the file
│   └── projects/<slug>/index.mdx
│
├── app/                             ← Next.js "App Router": folder = URL
│   ├── layout.tsx                   page shell wrapping every route
│   ├── globals.css                  every style rule and design token
│   ├── page.tsx                     "/"  → renders EssaysIndex
│   ├── about/page.tsx                "/about"
│   ├── [section]/page.tsx            "/essays" "/research" "/writeups" "/projects"
│   ├── [section]/[...slug]/page.tsx  one article, any depth of slug
│   ├── assets/[...path]/route.ts     serves images out of content/
│   ├── OpenPalette.tsx               the search button in the header
│   ├── rss.xml/route.ts              "/rss.xml"
│   ├── sitemap.ts                    "/sitemap.xml"
│   └── robots.ts                     "/robots.txt"
│
├── components/                      ← reusable server + client pieces
│   ├── Mdx.tsx                       Markdown/MDX → HTML pipeline
│   ├── Toc.tsx                       sidebar "On this page" (client)
│   ├── Palette.tsx                   ⌘K search dialog (client)
│   ├── Nav.tsx                       top navigation (client, for aria-current)
│   ├── Bits.tsx                      Meta, Recent, Entries, Blocks (list rows/cards)
│   └── EssaysIndex.tsx               the Essays/home page layout
│
├── lib/
│   ├── content.ts                    reads content/, exposes all()/find()
│   └── site.ts                       site name/description/links, nav items
│
├── public/                           static files served as-is (favicon, etc.)
├── next.config.mjs                   output: "standalone" (small Docker image)
├── package.json                      dependencies
├── Dockerfile, docker-compose.yml, Caddyfile, .env(.example)
└── README.md
```



---

## 3. `lib/content.ts` — the content loader

This is the one file everything else depends on. It has no framework
knowledge; it's plain Node.js filesystem code.

### `Item` — the shape every piece of content becomes

```ts
type Item = {
  section: Section;             // "essays" | "research" | "writeups" | "projects"
  slug: string[];                // e.g. ["cscv2026", "message-system"]
  url: string;                   // "/writeups/cscv2026/message-system"
  title: string;
  description: string;
  date: string;                  // "YYYY-MM-DD"
  updated?: string;
  tags: string[];
  minutes: number;               // estimated reading time
  body: string;                  // the Markdown/MDX body, minus frontmatter
  dir: string;                   // folder path relative to content/, used to resolve images
  ext: string;                   // ".md" or ".mdx"
  meta: Record<string, string>;  // any *other* frontmatter fields, stringified
  headings: { depth: number; text: string; id: string }[];  // for the TOC
  fm: Record<string, any>;       // the raw, untouched frontmatter object
};
```

`meta` vs `fm`: `meta` is the leftover frontmatter fields (after `title`,
`description`, `date`, `updated`, `tags` are pulled out) with every value
force-converted to a string — this is what the writeup meta line reads
(`ctf`, `category`, `difficulty`) and what the Research/Projects cards read
(`stat`). `fm` is the **raw** frontmatter object, unconverted, which is what
you need when a field isn't a string — `takeaways` and `faq` are arrays,
`related` is an array of objects, `group`/`subgroup` are strings but read
from `fm` for simplicity. If you add a new list- or object-shaped frontmatter
field, read it from `i.fm.yourField`, not `i.meta`.

### `walk(dir)`

Recursively lists every `.md`/`.mdx` file under a directory. This is what
lets you nest writeups as `content/writeups/<ctf>/<slug>/index.md` — there's
no flat "one folder per post" assumption anywhere.

### `all(section?)`

The main export. Called with no argument, it reads all four sections; called
with one, it filters to just that section. For every file it finds, it:

1. Parses frontmatter with `gray-matter` (`matter()`), splitting the file
   into `data` (frontmatter object) and `content` (the raw body text).
2. Derives the **slug** from the file's path relative to its section folder,
   stripping a trailing `/index` and its extension. `content/writeups/cscv2026/
   message-system/index.md` → slug `["cscv2026", "message-system"]` → URL
   `/writeups/cscv2026/message-system`.
3. **Title fallback:** if there's no `title:` in frontmatter, it looks for
   the first `# Heading` line in the body, uses that as the title, and
   *removes that line from the body* so it isn't rendered twice. If there's
   no heading either, it falls back to the filename.
4. **Date fallback:** if there's no `date:`, it uses the file's filesystem
   modified time (`fs.statSync(f).mtime`).
5. Computes **reading time** as `words / 220`, rounded up, minimum 1 minute.
   This is a rough word-count on the raw Markdown text (code blocks and all),
   not a typography-aware count — good enough for display, not exact.
6. Extracts **headings** by calling `headings(content)` (see below).
7. Records `dir` (the file's folder, relative to `content/`) — this is what
   `components/Mdx.tsx` uses to resolve relative image paths.

Everything is sorted **newest first** by `date` before being returned.

### `headings(markdown)`

A small hand-rolled parser, *not* a full Markdown parser — it scans the raw
text line by line, skips anything inside a fenced code block (so a `#` in a
comment inside a code sample is never mistaken for a heading), and matches
`##` through `####` (levels 2–4; a single `#` is treated as the title, not a
section, per the title-fallback logic above). For each match it strips
inline code, links, and emphasis markup from the heading text, then runs it
through `github-slugger` to produce the same `id` that `rehype-slug` will
give the actual rendered `<h2>`/`<h3>`/`<h4>` element in `components/Mdx.tsx`.
This is what makes the sidebar's `<a href="#some-id">` actually land on the
right element — **the id is computed twice, independently, and has to agree
both times.** If you ever swap out `rehype-slug` for something else, update
this function to match its slugging algorithm, or the TOC links will 404
against nothing (just scroll to the top).

### `find(section, slug)`

`all(section).find(...)` — looks up one item by its slug array. Simple and
not indexed, but content counts in the tens-to-hundreds, so this is fine.

### Why this isn't cached explicitly

Next.js's page-level caching (`export const revalidate = 3600` on the list
pages, and full static generation via `generateStaticParams` on article
pages) is what keeps this from re-reading the filesystem on every request in
production. `lib/content.ts` itself does no caching — it re-walks and
re-parses every time it's called. That's deliberate: it keeps the loader
simple, and Next.js's own caching layer is what actually matters for
performance.

---

## 4. Routing — `app/`

Next.js's **App Router** maps folders under `app/` to URLs. A few things
that look unusual if you haven't used it before:

- **page.tsx** in a folder is what renders at that folder's URL.
- **\[section]** is a *dynamic segment* — it matches any single path piece
  (`essays`, `research`, etc.) and Next.js hands you its value as
  `params.section`.
- **\[...slug]** is a *catch-all* segment — it matches one or more path
  pieces and hands them to you as an array, which is why nested writeup URLs
  like `/writeups/cscv2026/message-system` work without a separate route for
  every nesting depth.
- **route.ts** (instead of `page.tsx`) means "this isn't a page, it's an
  API-style handler" — used for the RSS feed, the image server, and nothing
  else needs one because `sitemap.ts`/`robots.ts` are special Next.js
  filenames with their own convention (they export a function, no route.ts
  needed).

### `generateStaticParams` and `dynamicParams = false`

Both the section list pages and the article pages export
`generateStaticParams`, which tells Next.js *at build time* every valid value
`[section]` or `[...slug]` can take (by calling `SECTIONS` or `all()`).
Combined with `dynamicParams = false`, this means: **only pages that existed
in content/ at build time exist at all** — visiting a URL for content that
wasn't there at build time renders the Next.js 404 page, it doesn't try to
read the filesystem live. This is why, in production (and especially in the
Docker image), **adding a new post requires a rebuild** — `npm run build` /
`docker compose up -d --build`. In `npm run dev`, Next.js re-runs this on
every request, so new files show up immediately without a restart.

### `revalidate = 3600` on the list pages

`app/page.tsx` and `app/[section]/page.tsx` set `export const revalidate =
3600`. This means Next.js will treat their generated HTML as fresh for up to
an hour, then quietly regenerate it in the background on the next request
after that. This exists specifically for the "last 30 / 90 days" dots on the
Essays page (`components/EssaysIndex.tsx`) and the reading-time/date text
elsewhere — without it, a page generated at build time would show a
"last 30 days" dot forever, even after 31 days had passed, because nothing
would ever re-run the date math. **Article pages don't have this** — they're
fully static once built, since their content doesn't change based on
today's date.

### `app/layout.tsx` — the shell every page sits inside

This is the **root layout**: it renders once per request, wraps every route,
and is where the `<html>`/`<body>` tags live (no other file has them). It:

- Sets global `<head>` metadata (`title` template, description, Open Graph
  defaults, the RSS `<link>`) from `lib/site.ts`.
- Imports `app/globals.css`, the Inter font package
  (`@fontsource-variable/inter`), and KaTeX's stylesheet
  (`katex/dist/katex.min.css`) — these three imports are what make fonts and
  math styling available on every page without each page importing them
  separately.
- Renders the header (`<Nav />` + `<OpenPalette />`), the page content
  (`{children}`), and the footer.
- Calls `all()` **once** to build the palette's search index (see §7) and
  passes it into `<Palette index={index} />`. This means the search index is
  rebuilt on every server render of the layout (which, thanks to the caching
  described above, is not every single request in production).

### `app/[section]/page.tsx` — list pages

One file handles `/essays`, `/research`, `/writeups`, and `/projects`. It
branches on `params.section`:

- `"essays"` → delegates entirely to `<EssaysIndex />` (see §6).
- anything else → calls `all(s)` and renders `<Blocks items={items} />`
  (the bordered/pill card layout — see §6). The `Entries` branch in the
  same file is currently unreachable dead code (the condition
  `s !== "essays"` is always true by this point, since `essays` already
  returned above) — see §9 for what to do about it.

### `app/[section]/[...slug]/page.tsx` — one article

This is the article template used by **all four** sections identically —
essays, research notes, writeups, and projects all go through this same
file. It:

1. Looks up the `Item` with `find()`; 404s if it doesn't exist.
2. Builds the "Published … • Updated … • N min read • CTF • Category •
   Difficulty" meta line, filtering out any pieces that don't apply (a
   non-writeup won't have `ctf`/`category`/`difficulty`, so those are simply
   skipped).
3. Renders the header block (back link, meta line, title, description, tag
   pills), then a two-column `.cols` div: the `<article>` with the rendered
   body on the left, and `<aside className="side">` with the sticky sidebar
   (`Toc`, plus optional "Key takeaways" and "FAQ" sections read straight out
   of `i.fm.takeaways` / `i.fm.faq`) on the right.
4. Passes `base={i.dir}` and `md={i.ext === ".md"}` into `<Mdx>` — these are
   what let the Markdown pipeline resolve relative image paths and switch
   parsing mode (see §5).

### `app/assets/[...path]/route.ts` — the image server

Your images live next to your Markdown files inside `content/`, which is
*not* a folder Next.js serves publicly by default (only `public/` is). This
route bridges that gap: a request to `/assets/writeups/cscv2026/message-system/
image/note/foo.png` resolves to `content/writeups/cscv2026/message-system/
image/note/foo.png` on disk and streams it back with the right
`Content-Type`. Two safety checks matter here:

- `path.resolve(...)` + the `file.startsWith(ROOT + path.sep)` check stops a
  request like `/assets/../../etc/passwd` from escaping the `content/`
  directory.
- The `TYPES` allowlist means only actual image extensions are served —
  someone can't use this route to read arbitrary files (like your `.mdx`
  source) even if they exist under `content/`.

### `rss.xml/route.ts`, `sitemap.ts`, `robots.ts`

Straightforward: they all call `all()` and map over every `Item` to produce
their respective formats. `sitemap.ts` and `robots.ts` use Next.js's
built-in file conventions (no manual XML/text writing needed); `rss.xml/
route.ts` builds the RSS XML by hand since there's no built-in convention for
that.

---

## 5. `components/Mdx.tsx` — turning your writing into HTML

This is the plugin pipeline that every article body passes through, in this
order:

```javascript
raw Markdown/MDX text
   │
   ▼ remark-gfm            tables, task lists, strikethrough, autolinks
   ▼ remark-math            recognizes $inline$ and $$block$$ math
   ▼ (rehype-raw, .md only) lets literal HTML tags in .md files pass through
   ▼ rehype-slug             adds id="..." to every heading (must match lib/content.ts's headings())
   ▼ rehype-katex            renders the math into KaTeX HTML/CSS
   ▼ rehype-pretty-code      syntax-highlights fenced code blocks via Shiki, theme "github-dark"
   ▼
your custom components: img, p, table  (see below)
   │
   ▼
final HTML
```

`next-mdx-remote/rsc`'s `<MDXRemote>` does the actual compiling, as a server
component — this is why an article's body never ships as JavaScript to the
browser, just the HTML it produces.

### `.md` vs `.mdx` — the `md` prop

`format: md ? "md" : "mdx"` tells the compiler which syntax rules to use.
Plain Markdown (`.md`) is forgiving — a stray `<` or `{` in body text is just
text. MDX (`.mdx`) is stricter — it treats those characters as the start of
JSX/an expression, so `<stdio.h>` written outside a code span in an `.mdx`
file will throw a build error, while the same text in a `.md` file is fine.
`rehype-raw` is only added to the pipeline for `.md` files, because that's
what lets literal HTML tags (`<details>`, `<br>`, a raw `<img>`) work in
plain Markdown — MDX already understands HTML/JSX natively and doesn't need
it.

**Rule of thumb:** if content is copy-pasted output from a tool (terminal
output, GDB output, compiler errors) and might contain stray angle brackets
or curly braces outside of fenced code blocks, keep it `.md`. Only reach for
`.mdx` if you actually want to use JSX/React components inside the body.

### The `img` component — resolving relative image paths

```ts
const resolve = (src, dir) =>
  /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(src) ? src : enc(path.posix.normalize(`/assets/${dir}/${src}`));
```

If `src` already looks like a URL (`https://...`), an absolute path
(`/foo.png`), or a same-page anchor (`#foo`), it's left alone. Otherwise it's
treated as relative to the article's own folder (`dir`, passed in as the
`base` prop, which came from `Item.dir` in `lib/content.ts`) and rewritten to
go through the `/assets/...` route described above. `enc()` re-encodes the
result so spaces or unicode in a filename survive as a URL. Alt text is
reused as the visible `<figcaption>`.

### The `p` component — the hydration fix

Standard Markdown wraps a standalone image in a paragraph:
`<p><img ...></p>`. But the `img` component above renders a `<figure>`, and
HTML doesn't allow `<figure>` inside `<p>` — a browser silently "fixes" that
by closing the `<p>` early, which doesn't match what React expected to
render on the server, producing a hydration error. The custom `p` component
checks whether any of its children is an image, and if so renders a `<div>`
instead of a `<p>` for that one paragraph. Everything else about spacing is
unaffected because `article :is(p, ul, ol, blockquote, figure, pre)` in
`globals.css` applies the same margin to both.

### The `table` component

Just wraps every table in `<div className="scroll">` so wide tables (a
comparison matrix, a hex dump) scroll horizontally on narrow screens instead
of breaking the page layout. See the `.scroll { overflow-x: auto; }` rule in
`globals.css`.

---

## 6. List pages — `components/EssaysIndex.tsx` and `components/Bits.tsx`

The Essays page and the Research/Writeups/Projects pages use **deliberately
different visual treatments**, matching the reference site.

### `EssaysIndex.tsx` — the plain-title layout (also the home page)

Renders at both `/` and `/essays` (`app/page.tsx` just re-exports this
component directly, and `app/[section]/page.tsx` special-cases `"essays"` to
render it too — there are two entry points, one component).

- Groups essays into a `Map<group, Map<subgroup, Item[]>>` using
  `i.fm.group` (defaults to `"All Essays"`) and `i.fm.subgroup` (defaults to
  `""`, meaning "no subheading"). This is pure frontmatter-driven — there's
  no hardcoded list of topics anywhere in the code; add a new `group:` value
  in a post's frontmatter and a new column/section appears automatically.
- The `dot()` function checks `updated || date` against today: ≤30 days →
  `"recent"` (green), ≤90 days → `"fresh"` (yellow), otherwise no dot. The
  actual colors are the `--dot-recent`/`--dot-fresh` CSS variables.
- Renders, top to bottom: the heading + legend (`.headrow`), the description
  (`.page-sub`), the collapsible `<details className="about">` block (uses
  native HTML `<details>`/`<summary>` — no JavaScript needed for the
  expand/collapse, just CSS for the `+`/`−` glyph swap), a "Recent Essays"
  list of the 5 newest, then the two-column `.groups` grid of every group.

### `Bits.tsx` — small reusable pieces

- **Meta** — the "Sep 25, 2026 · CTF · Category · Difficulty · N min read"
  line. Only used by `Entries` (currently dead — see §9).
- **Recent** — a title + right-aligned date row. Used by
  `EssaysIndex`'s "Recent Essays" section.
- **Entries** — a bordered list with title/description/meta per row.
  **Not currently used anywhere** (see §9) — it's what Research/Writeups/
  Projects looked like before the block-card treatment was added.
- **Blocks** — the bordered, left-accent card used for Research,
  Writeups, and Projects. Reads `i.fm.related` (an array of `{label, href}`)
  for the linked pills on the right; if a post has no `related` list, it
  falls back to showing `i.tags` as plain (non-linking) pills instead. The
  meta line under the title stacks `stat` (from `i.meta.stat`, e.g.
  `"9 profiles"`), then `ctf`/`category`/`difficulty` for writeups, then the
  reading time — each piece is only shown if present, joined with `·`.

---

## 7. `components/Palette.tsx` — the ⌘K search

A single self-contained client component, no external command-palette
library.

- **Opening it:** either the global `keydown` listener catches `⌘K`/`Ctrl+K`
  from anywhere on the page, or `app/OpenPalette.tsx`'s button dispatches a
  plain `window` event (`"open-palette"`) that this component listens for.
  This event-based approach is what lets the header button and the keyboard
  shortcut share one open/close state without lifting that state up into
  `layout.tsx`.
- **The index it searches:** built once in `app/layout.tsx` by mapping
  `all()` (every piece of content, across all sections) down to `{title,
  url, section, description, tags, text}`, where `text` is **the first 6,000
  characters of the raw body** (not the rendered HTML — so code blocks and
  Markdown syntax are part of what's searched too). This whole index is
  embedded directly into the page — there's no separate API call when you
  open the palette, which is why it responds instantly, but also why it will
  eventually need to change if the site grows large (see §9).
- **Scoring (score)** — a hand-rolled relevance function, not a real search
  library: for each whitespace-split search term, a title match scores 4, a
  tag/section match scores 3, a description match scores 2, and a body-text
  match scores 1; any term that doesn't match *anything* about an entry
  zeroes that entry out entirely (this is an implicit AND across terms — all
  your search words have to match *somewhere*, just not necessarily the same
  field). Results are sorted by total score, capped at 8.
- **The 5 static pages entries** (Essays/Research/Writeups/Projects/About)
  are prepended to every search so the palette can also jump to section
  index pages, not just individual articles.
- **Keyboard handling** inside the dialog: `Escape` closes it, `↑`/`↓` move
  the selection, `Enter` navigates via `router.push()` (Next.js client-side
  navigation, so it doesn't full-page-reload) and closes the palette.

---

## 8. `components/Toc.tsx` — the sidebar table of contents

Also a client component, since it needs to react to scroll position.

- Takes the `headings` array computed in `lib/content.ts` (title excluded —
  only `##`–`####`) and renders a nested `<ul>`, indenting by
  `(depth - min) * 0.75rem` where `min` is the shallowest heading depth
  present on that specific page — this is why a writeup that starts at `###`
  doesn't get an unnecessary left margin on its top-level items.
- On scroll (throttled via `requestAnimationFrame`, not on every scroll
  event — see the `raf` guard), it finds the **last heading whose top edge
  has scrolled past 140px from the viewport top** and marks it active. That
  140px number is a deliberate offset, not an arbitrary one — it's what
  makes a heading "count" as current a little before it physically reaches
  the top edge, which feels more natural while reading than waiting for it
  to touch the very top.
- The green progress bar and white marker are **not computed from scroll
  percentage** — they're measured directly off the actual `<li>` element in
  the DOM (`ul.current.children[active]`, using `offsetTop`/`offsetHeight`).
  This is deliberate: it means the marker always lines up exactly with the
  highlighted link, including when a link wraps onto two lines, rather than
  drifting out of sync the way a scroll-percentage-based calculation would.
- The takeaways/FAQ blocks that sit below the TOC in the sidebar are **not**
  part of this component — they're rendered directly in
  `app/[section]/[...slug]/page.tsx`, reading straight from `i.fm.takeaways`
  / `i.fm.faq`. `Toc.tsx` only owns the "On this page" list itself.

---

## 9. Known rough edges (things to know before you dig in)

- **Entries in components/Bits.tsx and the Entries import/branch in
  app/\[section]/page.tsx are dead code.** Every non-essay section now uses
  `Blocks`. Safe to delete both if you want to tidy up; nothing depends on
  it.
- **The search index scales linearly with content.** `app/layout.tsx` embeds
  the first 6,000 characters of *every* post into *every* page's HTML so the
  palette has something to search client-side with zero network requests.
  Fine for the current handful of posts; if you get into the hundreds, move
  this into a build-time-generated JSON file that `Palette.tsx` `fetch()`es
  the first time it's opened, rather than growing every page's initial HTML.
- **Reading time is a word count on raw Markdown**, including code-block
  contents and frontmatter-adjacent text — it's an estimate, not a
  typography-aware reading-speed calculation.
- **The Shiki code theme is hardcoded dark** (`"github-dark"` in
  `Mdx.tsx`). Light mode (driven purely by `prefers-color-scheme`, no
  toggle — see the `@media (prefers-color-scheme: dark)` block in
  `globals.css`) will still show dark code blocks. If you add a light theme,
  you'd need `rehype-pretty-code`'s dual-theme option and some extra CSS to
  switch between the two output blocks it generates.
- **Content changes require a rebuild in production** (`npm run build` /
  `docker compose up -d --build`), because of `dynamicParams = false` (§4).
  `npm run dev` doesn't have this limitation.
- **The two heading-slug implementations must stay in sync**: the hand-rolled
  regex parser in `lib/content.ts` and the real `rehype-slug` plugin in
  `Mdx.tsx`. Both use `github-slugger` under the hood, so as long as you
  don't swap one out independently of the other, they'll keep agreeing.

---

## 10. Where to make common changes

| I want to change...                            | Edit this                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors, fonts, spacing tokens                  | the `:root` block at the top of `app/globals.css`                                                                                                  |
| Site name / description / email / GitHub       | `.env` (values) and `lib/site.ts` (fallback defaults, other links)                                                                                 |
| Nav labels or order                            | the `nav` array in `lib/site.ts`                                                                                                                   |
| Add a whole new section (e.g. "notes")         | add to `SECTIONS` in `lib/content.ts`, add a nav entry in `lib/site.ts`, add a title/subtitle in `app/[section]/page.tsx`, create `content/notes/` |
| Essays page layout (dots, About row, columns)  | `components/EssaysIndex.tsx` + its `.headrow/.legend/.about/.sec-h/.groups/.plain/.dot` styles in `globals.css`                                    |
| Research/Writeups/Projects card layout         | `Blocks` in `components/Bits.tsx` + `.block-card/.bc-*/.pill` styles                                                                               |
| Article header (back link, meta, title, tags)  | `app/[section]/[...slug]/page.tsx` + `.back/.ahead/.pills` styles                                                                                  |
| Article body typography                        | `globals.css`, the `main.wide article ...` / `article h2` etc. rules                                                                               |
| Code block theme                               | the `theme:` option passed to `rehype-pretty-code` in `components/Mdx.tsx`                                                                         |
| How images resolve / where they're served from | `resolve()` in `components/Mdx.tsx` and `app/assets/[...path]/route.ts`                                                                            |
| Sidebar TOC behavior/look                      | `components/Toc.tsx` + `.toc/.track/.prog/.ind` styles                                                                                             |
| Key takeaways / FAQ                            | `app/[section]/[...slug]/page.tsx` (reads `i.fm.takeaways` / `i.fm.faq`)                                                                           |
| Search behavior (scoring, result count)        | `score()` and `.slice(0, 8)` in `components/Palette.tsx`                                                                                           |
| Search dialog look                             | `.pal/.pal-back` styles in `globals.css`                                                                                                           |

---

## 11. Frontmatter reference

Every field is optional unless noted; the loader in `lib/content.ts` fills
in sensible fallbacks for the missing pieces.

| Field                           | Type              | Read by                                   | Notes                                                                        |
| ------------------------------- | ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| `title`                         | string            | everywhere                                | falls back to the first `# Heading` in the body, then the filename           |
| `description`                   | string            | list pages, article header, SEO           |                                                                              |
| `date`                          | date              | sorting, display                          | falls back to the file's mtime on disk                                       |
| `updated`                       | date              | article header, "Recent" dot              |                                                                              |
| `tags`                          | string\[]         | article footer, card pills (fallback)     |                                                                              |
| `ctf`, `category`, `difficulty` | string            | writeup meta line, writeup cards          | any section can technically set these, they'll just show up in the meta line |
| `takeaways`                     | string\[]         | sidebar                                   |                                                                              |
| `faq`                           | `{q, a}[]`        | sidebar                                   |                                                                              |
| `group`, `subgroup`             | string            | Essays page grouping                      | essays only; other sections ignore these                                     |
| `stat`                          | string            | Research/Projects/Writeups card meta line | e.g. `"9 profiles"`                                                          |
| `related`                       | `{label, href}[]` | card pills                                | if absent, `tags` are shown instead, unlinked                                |

Anything else you put in frontmatter lands in `Item.fm` (raw) and
`Item.meta` (stringified) automatically — you don't need to register a new
field anywhere in `lib/content.ts` before you can read it from a page or
component.
