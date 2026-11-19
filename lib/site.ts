export const site = {
  url: process.env.SITE_URL || "http://localhost:3000",
  name: process.env.SITE_NAME || "lit1numyt",
  description: process.env.SITE_DESCRIPTION || "here i write about how i kms",
  email: process.env.SITE_EMAIL || "", // set in .env (kept out of the public repo); Contact link hides when empty
  github: process.env.SITE_GITHUB || "https://github.com/lit1numyt",
  links: [] as { label: string; href: string }[], // extra footer links, e.g. { label: "X", href: "https://..." }
};
export const nav = [
  { label: "Essays", href: "/essays" }, { label: "Research", href: "/research" },
  { label: "Writeups", href: "/writeups" }, { label: "Projects", href: "/projects" }, { label: "About", href: "/about" },
];
