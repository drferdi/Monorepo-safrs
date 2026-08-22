import type { ProgramContent } from "../content/types.ts";
import { Hero } from "./Hero.tsx";
import { SectionBlock } from "./SectionBlock.tsx";

// Shared container/heading styling copied from SectionBlock.tsx so the
// benefits/steps blocks sit flush with the rest of the page grid (columns
// 1-7 of 12, same max-width/gutter/margin tokens).
const containerStyle = {
  maxWidth: "var(--layout-container-wide)",
  marginInline: "auto",
  paddingInline: "var(--layout-margin)",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: "var(--layout-gutter)",
} as const;

const headingStyle = {
  paddingBottom: "var(--space-2)",
  borderBottom: "1px solid var(--color-border-strong)",
  fontSize: "var(--font-size-title-page)",
  fontWeight: "var(--font-weight-semibold)",
  color: "var(--color-text-primary)",
} as const;

export function ProgramPage({ content }: { content: ProgramContent }) {
  return (
    <main>
      <Hero content={content.hero} />

      {content.benefits.length > 0 ? (
        <section style={{ paddingBlock: "var(--space-7)" }}>
          <div className="grid" style={containerStyle}>
            <div style={{ gridColumn: "1 / span 7" }}>
              {/* Source pages carry their own benefits heading per program
                  (e.g. "Manfaat pendampingan terarah"); ProgramContent has no
                  field for it, so this component uses the fixed label
                  "Manfaat" — the per-program headline text isn't lost, it's
                  just not represented (see extraction comment in each
                  program-*.ts content module). */}
              <h2 style={headingStyle}>Manfaat</h2>
              <ul
                style={{
                  marginTop: "var(--space-5)",
                  display: "grid",
                  gap: "var(--space-3)",
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {content.benefits.map((benefit, index) => (
                  <li
                    key={`benefit-${index}`}
                    style={{
                      maxWidth: "var(--layout-container-text)",
                      paddingLeft: "var(--space-4)",
                      borderLeft: "2px solid var(--color-border-strong)",
                      fontSize: "var(--font-size-body)",
                      lineHeight: "var(--line-height-default)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {content.steps.length > 0 ? (
        <section style={{ paddingBlock: "var(--space-7)" }}>
          <div className="grid" style={containerStyle}>
            <div style={{ gridColumn: "1 / span 7" }}>
              <h2 style={headingStyle}>Langkah</h2>
              <ol
                style={{
                  marginTop: "var(--space-5)",
                  display: "grid",
                  gap: "var(--space-5)",
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {content.steps.map((step, index) => (
                  <li
                    key={step.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "var(--space-6) 1fr",
                      gap: "var(--space-4)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: "var(--font-family-mono)",
                        fontSize: "var(--font-size-label)",
                        letterSpacing: "var(--letter-spacing-mono)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        style={{
                          fontSize: "var(--font-size-body)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {step.name}
                      </h3>
                      <p
                        style={{
                          marginTop: "var(--space-2)",
                          maxWidth: "var(--layout-container-text)",
                          fontSize: "var(--font-size-body)",
                          lineHeight: "var(--line-height-default)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {content.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
    </main>
  );
}
