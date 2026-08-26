import Link from "next/link";
import type { ReactElement } from "react";

export interface RecordLink {
  readonly href: string;
  readonly title: string;
  readonly meta?: string;
}

/**
 * Daftar catatan terkait. Setiap catatan sejarah adalah simpul yang
 * menghubungkan pengalaman, geografi, dan bukti (UX Bible bagian 20).
 */
export function RecordLinks({
  heading,
  items,
}: {
  readonly heading: string;
  readonly items: readonly RecordLink[];
}): ReactElement | null {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="archive-label">{heading}</h3>
      <ul className="record-list">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <span className="record-title">{item.title}</span>
              {item.meta ? (
                <span className="record-meta">{item.meta}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
