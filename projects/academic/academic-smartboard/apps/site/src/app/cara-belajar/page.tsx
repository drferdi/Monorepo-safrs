import type { Metadata } from "next";
import { Hero } from "../../components/Hero.tsx";
import { SectionBlock } from "../../components/SectionBlock.tsx";
import { caraBelajar } from "../../content/cara-belajar.ts";

export const metadata: Metadata = {
  title: caraBelajar.title,
  description: caraBelajar.description,
};

export default function Page() {
  return (
    <main>
      <Hero content={caraBelajar.hero} />
      {caraBelajar.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </main>
  );
}
