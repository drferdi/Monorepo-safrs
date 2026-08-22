import type { Metadata } from "next";
import { Hero } from "../../components/Hero.tsx";
import { SmartboardShowcase } from "../../components/SmartboardShowcase.tsx";
import { smartboard } from "../../content/smartboard.ts";

export const metadata: Metadata = {
  title: smartboard.title,
  description: smartboard.description,
};

export default function Page() {
  return (
    <main>
      <Hero content={smartboard.hero} />
      <SmartboardShowcase content={smartboard} />
    </main>
  );
}
