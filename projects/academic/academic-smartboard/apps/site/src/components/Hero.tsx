import type { Route } from "next";
import Link from "next/link";
import type { PageContent } from "../content/types.ts";

export function Hero({ content }: { content: PageContent["hero"] }) {
  return (
    <section style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <div
        className="grid"
        style={{
          maxWidth: "var(--layout-container-wide)",
          marginInline: "auto",
          paddingInline: "var(--layout-margin)",
          paddingBlock: "var(--space-8)",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: "var(--layout-gutter)",
        }}
      >
        {/* Content anchors columns 1-7; column 8 stays empty by design. */}
        <div style={{ gridColumn: "1 / span 7" }}>
          {content.eyebrow ? (
            <p
              style={{
                fontFamily: "var(--font-family-mono)",
                fontSize: "var(--font-size-label)",
                letterSpacing: "var(--letter-spacing-label)",
                textTransform: "uppercase",
                color: "var(--color-text-secondary)",
              }}
            >
              {content.eyebrow}
            </p>
          ) : null}

          <h1
            style={{
              marginTop: content.eyebrow ? "var(--space-3)" : 0,
              fontSize: "var(--font-size-display)",
              lineHeight: "var(--line-height-tight)",
              letterSpacing: "var(--letter-spacing-display)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
            }}
          >
            {content.heading}
          </h1>

          <p
            style={{
              marginTop: "var(--space-4)",
              maxWidth: "var(--layout-container-text)",
              fontSize: "var(--font-size-body)",
              lineHeight: "var(--line-height-default)",
              color: "var(--color-text-secondary)",
            }}
          >
            {content.sub}
          </p>

          {content.cta ? (
            // Cta.href is plain `string` (Task 3 interface); the target route
            // may still be a Task 5-9 stub, so typedRoutes cannot verify it.
            <Link
              href={content.cta.href as Route}
              // Ledge lives in the className (not inline style) so the
              // :active variant below can win the cascade and override it —
              // UI-RULES: the button-ledge "travels" on press (06-button-lab
              // treatment C — translate by the ledge offset, shadow to none).
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
              {content.cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
