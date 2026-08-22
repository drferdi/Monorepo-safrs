import type { Metadata } from "next";
import { Hero } from "../../components/Hero.tsx";
import { SectionBlock } from "../../components/SectionBlock.tsx";
import { wawasan } from "../../content/wawasan.ts";

export const metadata: Metadata = {
  title: wawasan.title,
  description: wawasan.description,
};

export default function Page() {
  return (
    <main>
      <Hero content={wawasan.hero} />
      {wawasan.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </main>
  );
}
