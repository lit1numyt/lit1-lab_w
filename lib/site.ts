export const site = {
  url: process.env.SITE_URL || "http://localhost:3000",
  name: process.env.SITE_NAME || "[NAME]",
  description: process.env.SITE_DESCRIPTION || "[DESCRIPTION]",
  email: process.env.SITE_EMAIL || "[EMAIL]",
  github: process.env.SITE_GITHUB || "https://github.com/[GITHUB]",
  links: [] as { label: string; href: string }[], // [OTHER LINKS]
};
export const nav = [
  { label: "Essays", href: "/essays" }, { label: "Research", href: "/research" },
  { label: "Writeups", href: "/writeups" }, { label: "Projects", href: "/projects" }, { label: "About", href: "/about" },
];
