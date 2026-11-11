import type { Route } from "next";
import Link from "next/link";
import { NAV_ITEMS } from "../content/index.ts";

// Route stub pages for NAV_ITEMS beyond "/" land in Tasks 5-9 of the
// site-port plan; typedRoutes cannot verify a literal href before the page
// file exists, so NavItem.href (plain `string`, frozen by Task 3) is cast.
export function SiteHeader() {
  return (
    <header style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <div
        className="flex flex-wrap items-center justify-between"
        style={{
          maxWidth: "var(--layout-container-wide)",
          marginInline: "auto",
          paddingInline: "var(--layout-margin)",
          paddingBlock: "var(--space-4)",
          gap: "var(--space-5)",
        }}
      >
        <Link
          href="/"
          aria-label="El-Kayyisa, beranda"
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
          style={{
            fontSize: "var(--font-size-body)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-label)",
            color: "var(--color-text-primary)",
            textDecoration: "none",
          }}
        >
          El-Kayyisa
        </Link>

        <nav aria-label="Navigasi utama">
          <ul
            className="flex flex-wrap"
            style={{
              gap: "var(--space-5)",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  className="inline-flex items-center hover:text-(--color-accent-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                  style={{
                    minHeight: "var(--target-min)",
                    fontSize: "var(--font-size-body)",
                    color: "var(--color-text-primary)",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
