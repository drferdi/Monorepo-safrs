export type Cta = { label: string; href: string };
export type NavItem = { label: string; href: string };
export type Section = {
  id: string;
  heading: string;
  body: string[];
  bullets?: string[];
  image?: { src: string; alt: string };
};
export type PageContent = {
  slug: string; // "" = beranda
  title: string;
  description: string;
  hero: { eyebrow?: string; heading: string; sub: string; cta?: Cta };
  sections: Section[];
};
export type ProgramContent = PageContent & {
  programName: string;
  benefits: string[];
  steps: { name: string; detail: string }[];
};
