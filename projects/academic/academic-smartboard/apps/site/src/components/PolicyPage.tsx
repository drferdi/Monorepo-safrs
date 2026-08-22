import type { PageContent } from "../content/types.ts";
import { Hero } from "./Hero.tsx";
import { SectionBlock } from "./SectionBlock.tsx";

// Shared template for the two legal pages (kebijakan-privasi,
// ketentuan-layanan). Both are plain PageContent — no extra fields beyond
// hero+sections are needed (unlike ProgramContent) — so this composes the
// same Hero + SectionBlock primitives already used by every other page:
// Hero renders the h1 (content.hero.heading) + intro paragraph, each
// SectionBlock renders one numbered clause as an h2 with body paragraphs
// and, where the source had a <ul>, bullets. Both already constrain prose
// to `var(--layout-container-text)` (~68ch) and use token-only styling, so
// no new styling is introduced here — see ProgramPage.tsx for the same
// composition precedent.
export function PolicyPage({ content }: { content: PageContent }) {
  return (
    <main>
      <Hero content={content.hero} />
      {content.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </main>
  );
}
