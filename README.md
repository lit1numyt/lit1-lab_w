# Personal Technical Archive

Next.js + MDX + KaTeX + Shiki. Content lives in `content/` as MDX; no database or CMS.

## Run locally
    cp .env.example .env
    npm install && npm run dev      # http://localhost:3000

## Add content (create a folder with `index.mdx`; it appears automatically)
- **Essay:** `content/essays/<slug>/index.mdx` with `title, description, date, tags`.
- **Research:** `content/research/<slug>/index.mdx`, same fields.
- **Writeup:** `content/writeups/<ctf>/<slug>/index.mdx` (URL `/writeups/<ctf>/<slug>`), plus `ctf, category, difficulty`.
- **Project:** `content/projects/<slug>/index.mdx`.
Optional frontmatter `takeaways:` (list) and `faq:` (list of `q`/`a`) fill the sidebar; the "On this page" list is generated from `##`–`####` headings.
Images: put them next to the file (e.g. `content/writeups/ctf/name/image/a.png`) and use `![caption](image/a.png)`; no copying to `public/` needed. `.md` files are plain Markdown, `.mdx` files are MDX. No frontmatter? The first `# heading` becomes the title and the file date is used.

## Deploy (Ubuntu LTS)
    sudo apt install docker.io docker-compose-v2 git
    git clone <repo> && cd <repo> && cp .env.example .env   # set SITE_URL and DOMAIN
    docker compose up -d --build
Point DNS at the server through Cloudflare (SSL mode Full/Strict). Caddy obtains the certificate. Rebuild after content changes (`git pull && docker compose up -d --build`).

## Deviations / manual work
- Colors, spacing scale, Inter and width come from the reference site's computed styles. Neue Haas Grotesk is commercial, so headings use "Helvetica Neue" (present on macOS) then Inter. Light-mode background/border/muted are estimates.
- Not implemented: click-to-enlarge images, table of contents, footnote styling checks, per-section RSS feeds, per-page OG images.
- Search is a client-side scan over titles, descriptions, tags and the first 6,000 characters of each body.
- Placeholders `[NAME]`, `[DESCRIPTION]`, `[EMAIL]`, `[GITHUB]` are set via `.env`; edit `lib/site.ts` for other links.

## List-page frontmatter (all optional)
- Essays: `group:` and `subgroup:` place an essay in the two-column topic lists; a green/yellow dot marks essays dated (or `updated:`) within 30/90 days.
- Research/Projects cards: `stat: "9 profiles"` (shown before the reading time) and `related:` (list of `label`/`href`) for the pills on the right; without `related`, the tags are shown.
