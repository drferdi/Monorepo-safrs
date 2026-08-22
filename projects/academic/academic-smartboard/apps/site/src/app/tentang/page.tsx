import type { Metadata } from "next";
import { Hero } from "../../components/Hero.tsx";
import { SectionBlock } from "../../components/SectionBlock.tsx";
import { tentang } from "../../content/tentang.ts";

export const metadata: Metadata = {
  title: tentang.title,
  description: tentang.description,
};

export default function Page() {
  return (
    <main>
      <Hero content={tentang.hero} />
      {tentang.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </main>
  );
}
