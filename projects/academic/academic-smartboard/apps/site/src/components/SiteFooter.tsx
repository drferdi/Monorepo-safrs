import type { Route } from "next";
import Link from "next/link";

// /kebijakan-privasi and /ketentuan-layanan land as page stubs in Tasks 5-9
// of the site-port plan; typedRoutes cannot verify these literals until then.
const FOOTER_LINKS: ReadonlyArray<{ label: string; href: Route }> = [
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" as Route },
  { label: "Ketentuan Layanan", href: "/ketentuan-layanan" as Route },
];

// Collaboration sentence reproduced verbatim (text only, no vendor asset)
// from the archive SiteChrome.tsx footer, lines 111-115.
const COLLABORATION_NOTE =
  "El-Kayyisa berkolaborasi dengan Sentra Academy Solution mewujudkan Sentra Smartboard, agar tutor dan orang tua dapat memantau kehadiran, target materi, dan capaian belajar siswa secara transparan dan real-time.";

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border-subtle)",
        background: "var(--color-background-surface)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--layout-container-wide)",
          marginInline: "auto",
          paddingInline: "var(--layout-margin)",
          paddingBlock: "var(--space-7)",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-title-page)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-primary)",
          }}
        >
          El-Kayyisa
        </p>

        <p
          style={{
            marginTop: "var(--space-4)",
            maxWidth: "var(--layout-container-text)",
            fontSize: "var(--font-size-body)",
            lineHeight: "var(--line-height-default)",
            color: "var(--color-text-secondary)",
          }}
        >
          {COLLABORATION_NOTE}
        </p>

        <div
          className="flex flex-wrap items-baseline justify-between"
          style={{
            marginTop: "var(--space-6)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--color-border-subtle)",
            gap: "var(--space-4)",
          }}
        >
          <nav aria-label="Tautan footer">
            <ul
              className="flex flex-wrap"
              style={{
                gap: "var(--space-5)",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-(--color-text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                    style={{
                      fontSize: "var(--font-size-body-compact)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p
            style={{
              fontSize: "var(--font-size-caption)",
              color: "var(--color-text-muted)",
            }}
          >
            © {new Date().getFullYear()} El-Kayyisa
          </p>
        </div>
      </div>
    </footer>
  );
}
