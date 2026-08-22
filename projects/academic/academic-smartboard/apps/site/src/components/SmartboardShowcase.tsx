import type { Route } from "next";
import Link from "next/link";
import type { PageContent, Section } from "../content/types.ts";

// Flagship visual for /smartboard. Ports the structure of the source's
// AiDashboardVisual + program-card + session-chain blocks
// (SmartboardPage.tsx, 517 lines, framer-motion + gsap) as static markup:
// no framer-motion/gsap, no JS color interpolation from palette.ts. The one
// piece of motion (the AI-tag marquee) is a CSS @keyframes animation gated
// behind `@media (prefers-reduced-motion: no-preference)` below — it is
// simply absent, not merely paused, when the visitor has reduced motion set.

const containerStyle = {
  maxWidth: "var(--layout-container-wide)",
  marginInline: "auto",
  paddingInline: "var(--layout-margin)",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gap: "var(--layout-gutter)",
} as const;

const eyebrowStyle = {
  fontFamily: "var(--font-family-mono)",
  fontSize: "var(--font-size-label)",
  letterSpacing: "var(--letter-spacing-label)",
  textTransform: "uppercase",
  color: "var(--color-text-secondary)",
} as const;

const headingStyle = {
  marginTop: "var(--space-3)",
  maxWidth: "var(--layout-container-text)",
  fontSize: "var(--font-size-title-page)",
  fontWeight: "var(--font-weight-semibold)",
  color: "var(--color-text-primary)",
} as const;

const bodyStyle = {
  marginTop: "var(--space-3)",
  maxWidth: "var(--layout-container-text)",
  fontSize: "var(--font-size-body)",
  lineHeight: "var(--line-height-default)",
  color: "var(--color-text-secondary)",
} as const;

const tagStyle = {
  flexShrink: 0,
  paddingInline: "var(--space-3)",
  paddingBlock: "var(--space-1)",
  borderRadius: "var(--radius-control)",
  border: "1px solid var(--color-border-subtle)",
  fontSize: "var(--font-size-caption)",
  color: "var(--color-text-secondary)",
} as const;

/* ---- content parsing helpers ----
   smartboard.ts documents these prefix conventions inline; parsing lives
   here (not duplicated per call site) so a mismatch between content and
   component throws loudly instead of silently rendering blank. */

function findSection(content: PageContent, id: string): Section {
  const section = content.sections.find((s) => s.id === id);
  if (!section) {
    throw new Error(`SmartboardShowcase: missing section "${id}"`);
  }
  return section;
}

function splitOnce(value: string, sep: string): [string, string] {
  const i = value.indexOf(sep);
  if (i === -1) return [value.trim(), ""];
  return [value.slice(0, i).trim(), value.slice(i + sep.length).trim()];
}

function byPrefix(bullets: string[], prefix: string): string[] {
  return bullets
    .filter((b) => b.startsWith(prefix))
    .map((b) => b.slice(prefix.length).trim());
}

function singleByPrefix(bullets: string[], prefix: string): string {
  const [first] = byPrefix(bullets, prefix);
  if (first === undefined) {
    throw new Error(`SmartboardShowcase: missing "${prefix}" entry`);
  }
  return first;
}

function eyebrowOf(bullets: string[]): string {
  return singleByPrefix(bullets, "Eyebrow:");
}

function withoutEyebrow(bullets: string[]): string[] {
  return bullets.filter((b) => !b.startsWith("Eyebrow:"));
}

export function SmartboardShowcase({ content }: { content: PageContent }) {
  const ringkasan = findSection(content, "ringkasan-produk");
  const tampilan = findSection(content, "tiga-tampilan-siswa");
  const alur = findSection(content, "alur-sesi-belajar");
  const ai = findSection(content, "sentra-artificial-intelligence");
  const penutup = findSection(content, "belajar-lebih-dekat");

  const stats =
    ringkasan.bullets?.map((b) => {
      const [value, label] = splitOnce(b, ":");
      return { value, label };
    }) ?? [];

  const modules = withoutEyebrow(tampilan.bullets ?? []).map((b) => {
    const [title, desc] = splitOnce(b, ":");
    return { title, desc };
  });

  const stages = withoutEyebrow(alur.bullets ?? []).map((b) => {
    const [name, status] = splitOnce(b, ":");
    return { name, status };
  });

  const aiBullets = ai.bullets ?? [];
  const aiJudul = singleByPrefix(aiBullets, "Judul:");
  const aiSubjudul = singleByPrefix(aiBullets, "Subjudul:");
  const aiStatus = singleByPrefix(aiBullets, "Status:");
  const aiGrafik = singleByPrefix(aiBullets, "Grafik:");
  const aiDaftar = singleByPrefix(aiBullets, "Daftar:");
  const aiStats = byPrefix(aiBullets, "Stat:").map((s) => {
    const [value, label] = s.split(" · ");
    return { value: value ?? s, label: label ?? "" };
  });
  const aiInsights = byPrefix(aiBullets, "Insight:");
  const aiTags = byPrefix(aiBullets, "Tag:");

  return (
    <>
      {/* Decorative — matches source's aria-hidden hero-stats strip. */}
      <section aria-hidden="true" style={{ paddingBlock: "var(--space-5)" }}>
        <div className="grid" style={containerStyle}>
          <div
            style={{
              gridColumn: "1 / span 7",
              display: "grid",
              gridTemplateColumns: `repeat(${stats.length}, auto)`,
              gap: "var(--space-6)",
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-title-section)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {stat.value}
                </strong>
                <small
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {stat.label}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 01 — tiga tampilan siswa */}
      <section
        id={tampilan.id}
        style={{
          paddingBlock: "var(--space-7)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="grid" style={containerStyle}>
          <div style={{ gridColumn: "1 / span 7" }}>
            <p style={eyebrowStyle}>{eyebrowOf(tampilan.bullets ?? [])}</p>
            <h2 style={headingStyle}>{tampilan.heading}</h2>
            {tampilan.body.map((p, i) => (
              <p key={`${tampilan.id}-p-${i}`} style={bodyStyle}>
                {p}
              </p>
            ))}
          </div>

          <div
            style={{
              gridColumn: "1 / span 12",
              marginTop: "var(--space-6)",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--layout-gutter)",
            }}
          >
            {modules.map((card) => (
              <div
                key={card.title}
                className="transition-colors duration-(--motion-duration-fast) ease-(--motion-easing-standard) hover:border-(--color-border-strong)"
                style={{
                  padding: "var(--space-5)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-structure)",
                  background: "var(--color-background-surface)",
                }}
              >
                <h3
                  style={{
                    fontSize: "var(--font-size-body)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {card.title}
                </h3>
                <p style={{ ...bodyStyle, marginTop: "var(--space-2)" }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 — alur sesi belajar */}
      <section
        id={alur.id}
        style={{
          paddingBlock: "var(--space-7)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="grid" style={containerStyle}>
          <div style={{ gridColumn: "1 / span 7" }}>
            <p style={eyebrowStyle}>{eyebrowOf(alur.bullets ?? [])}</p>
            <h2 style={headingStyle}>{alur.heading}</h2>
            {alur.body.map((p, i) => (
              <p key={`${alur.id}-p-${i}`} style={bodyStyle}>
                {p}
              </p>
            ))}
          </div>

          <ol
            aria-label="Alur sesi Smartboard"
            style={{
              gridColumn: "1 / span 12",
              marginTop: "var(--space-6)",
              display: "grid",
              gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
              gap: "var(--space-3)",
              listStyle: "none",
              padding: 0,
            }}
          >
            {stages.map((stage, index) => (
              <li
                key={stage.name}
                style={{
                  padding: "var(--space-4)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-structure)",
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
                <strong
                  style={{
                    display: "block",
                    marginTop: "var(--space-2)",
                    fontSize: "var(--font-size-body)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {stage.name}
                </strong>
                <small
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {stage.status}
                </small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 03 — Sentra Artificial Intelligence */}
      <section
        id={ai.id}
        style={{
          paddingBlock: "var(--space-7)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="grid" style={containerStyle}>
          <div style={{ gridColumn: "1 / span 7" }}>
            <p style={eyebrowStyle}>{eyebrowOf(aiBullets)}</p>
            <h2 style={headingStyle}>{ai.heading}</h2>
            {ai.body.map((p, i) => (
              <p key={`${ai.id}-p-${i}`} style={bodyStyle}>
                {p}
              </p>
            ))}
          </div>

          <div
            style={{
              gridColumn: "1 / span 12",
              marginTop: "var(--space-6)",
              padding: "var(--space-5)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-structure)",
              background: "var(--color-background-surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-4)",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "var(--font-size-body)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {aiJudul}
                </p>
                <p
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {aiSubjudul}
                </p>
              </div>
              <span
                style={{
                  paddingInline: "var(--space-3)",
                  paddingBlock: "var(--space-1)",
                  borderRadius: "var(--radius-control)",
                  background: "var(--color-surface-accent)",
                  fontSize: "var(--font-size-caption)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-text-primary)",
                }}
              >
                {aiStatus}
              </span>
            </div>

            <div
              style={{
                marginTop: "var(--space-5)",
                display: "grid",
                gridTemplateColumns: `repeat(${aiStats.length}, auto)`,
                gap: "var(--space-6)",
              }}
            >
              {aiStats.map((stat) => (
                <div key={stat.label}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "var(--font-size-title-section)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {stat.value}
                  </strong>
                  <small
                    style={{
                      fontSize: "var(--font-size-caption)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {stat.label}
                  </small>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "var(--space-6)",
                display: "grid",
                gridTemplateColumns: "3fr 2fr",
                gap: "var(--layout-gutter)",
              }}
            >
              {/* Decorative bar chart: source's own bars are non-numeric
                  placeholders ("—"), so this stays a static token-coloured
                  motif rather than invented data. Max 3 of 4 allowed
                  data-series tokens are used. */}
              <div>
                <p
                  style={{
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {aiGrafik}
                </p>
                <div
                  aria-hidden="true"
                  style={{
                    marginTop: "var(--space-3)",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "var(--space-2)",
                    height: "var(--space-9)",
                  }}
                >
                  {["30%", "45%", "60%", "50%", "80%", "95%"].map(
                    (h, index) => (
                      <div
                        key={h}
                        style={{
                          flex: 1,
                          height: h,
                          borderRadius: "var(--radius-control)",
                          background: `var(--color-data-${(index % 3) + 1})`,
                        }}
                      />
                    ),
                  )}
                </div>
              </div>

              <div>
                <p
                  style={{
                    fontSize: "var(--font-size-label)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {aiDaftar}
                </p>
                <ul
                  style={{
                    marginTop: "var(--space-3)",
                    display: "grid",
                    gap: "var(--space-2)",
                    listStyle: "none",
                    padding: 0,
                  }}
                >
                  {aiInsights.map((note) => (
                    <li
                      key={note}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "var(--space-2)",
                        fontSize: "var(--font-size-body-compact)",
                        lineHeight: "var(--line-height-default)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="var(--color-text-secondary)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CSS-only marquee: motion exists solely inside the
                `@media (prefers-reduced-motion: no-preference)` rule below,
                so it is absent — not merely paused — for reduced-motion
                visitors. Doubled list = source's own doubling pattern, so
                the track can loop seamlessly at -50%. */}
            <div
              style={{
                marginTop: "var(--space-6)",
                overflow: "hidden",
              }}
            >
              <div
                className="smartboard-ai-tag-track"
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  width: "max-content",
                }}
              >
                {/* Visible half: the real, once-only tag list for assistive tech. */}
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {aiTags.map((tag, index) => (
                    <span key={`${tag}-${index}`} style={tagStyle}>
                      {tag}
                    </span>
                  ))}
                </div>
                {/* Duplicate half exists only so the CSS marquee can loop
                    seamlessly at -50%; hidden from assistive tech so tags
                    are not announced twice. */}
                <div
                  aria-hidden="true"
                  style={{ display: "flex", gap: "var(--space-2)" }}
                >
                  {aiTags.map((tag, index) => (
                    <span key={`dup-${tag}-${index}`} style={tagStyle}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — penutup */}
      <section
        id={penutup.id}
        style={{
          paddingBlock: "var(--space-8)",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="grid" style={containerStyle}>
          <div style={{ gridColumn: "1 / span 7" }}>
            <p style={eyebrowStyle}>{eyebrowOf(penutup.bullets ?? [])}</p>
            <h2 style={headingStyle}>{penutup.heading}</h2>

            {content.hero.cta ? (
              <Link
                href={content.hero.cta.href as Route}
                className="shadow-[var(--button-ledge)_var(--button-ledge)_0_0_var(--color-action-ledge)] transition-[background-color,translate,box-shadow] duration-(--motion-duration-fast) ease-(--motion-easing-standard) hover:bg-(--color-action-primary-hover) active:shadow-none active:[translate:var(--button-ledge)_var(--button-ledge)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                style={{
                  marginTop: "var(--space-6)",
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: "var(--target-min)",
                  paddingInline: "var(--space-4)",
                  fontSize: "var(--font-size-body)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-action-primary-text)",
                  background: "var(--color-action-primary)",
                  borderRadius: "var(--radius-control)",
                  textDecoration: "none",
                }}
              >
                {content.hero.cta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Plain <style> text child (no dangerouslySetInnerHTML): static,
          author-only keyframes, no interpolated/user data. */}
      <style>{`
        @keyframes smartboard-ai-tags {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .smartboard-ai-tag-track {
            animation: smartboard-ai-tags 20s linear infinite;
          }
        }
      `}</style>
    </>
  );
}
