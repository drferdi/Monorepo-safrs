import type { Metadata } from "next";
import { Hero } from "../components/Hero.tsx";
import { SectionBlock } from "../components/SectionBlock.tsx";
import { beranda } from "../content/beranda.ts";

export const metadata: Metadata = {
  title: beranda.title,
  description: beranda.description,
};

export default function Page() {
  return (
    <main>
      <Hero content={beranda.hero} />
      {beranda.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </main>
  );
}
