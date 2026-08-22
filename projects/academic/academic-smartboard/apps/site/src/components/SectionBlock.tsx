import type { Section } from "../content/types.ts";

export function SectionBlock({ section }: { section: Section }) {
  return (
    <section id={section.id} style={{ paddingBlock: "var(--space-7)" }}>
      <div
        className="grid"
        style={{
          maxWidth: "var(--layout-container-wide)",
          marginInline: "auto",
          paddingInline: "var(--layout-margin)",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: "var(--layout-gutter)",
        }}
      >
        {/* Content anchors columns 1-7; column 8 stays empty by design. */}
        <div style={{ gridColumn: "1 / span 7" }}>
          {section.image ? (
            <img
              src={section.image.src}
              alt={section.image.alt}
              width={1536}
              height={1024}
              loading="lazy"
              style={{
                display: "block",
                width: "100%",
                maxWidth: "100%",
                height: "auto",
                borderRadius: "var(--radius-structure)",
                marginBottom: "var(--space-5)",
              }}
            />
          ) : null}
          <h2
            style={{
              paddingBottom: "var(--space-2)",
              borderBottom: "1px solid var(--color-border-strong)",
              fontSize: "var(--font-size-title-page)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
            }}
          >
            {section.heading}
          </h2>

          <div style={{ marginTop: "var(--space-5)" }}>
            {section.body.map((paragraph, index) => (
              <p
                key={`${section.id}-p-${index}`}
                style={{
                  marginTop: index === 0 ? 0 : "var(--space-4)",
                  maxWidth: "var(--layout-container-text)",
                  fontSize: "var(--font-size-body)",
                  lineHeight: "var(--line-height-default)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {section.bullets && section.bullets.length > 0 ? (
            <ul
              style={{
                marginTop: "var(--space-5)",
                display: "grid",
                gap: "var(--space-3)",
                listStyle: "none",
                padding: 0,
              }}
            >
              {section.bullets.map((bullet, index) => (
                <li
                  key={`${section.id}-b-${index}`}
                  style={{
                    paddingLeft: "var(--space-4)",
                    borderLeft: "2px solid var(--color-border-strong)",
                    fontSize: "var(--font-size-body)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
