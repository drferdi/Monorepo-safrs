import type { ReactNode } from "react";

interface PageHeadProps {
  seq: string;
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHead({
  seq,
  eyebrow,
  title,
  lede,
  actions,
  className,
}: PageHeadProps) {
  return (
    <header
      className={
        className
          ? `mb-(--space-5) flex flex-wrap items-start justify-between gap-(--space-4) ${className}`
          : "mb-(--space-5) flex flex-wrap items-start justify-between gap-(--space-4)"
      }
    >
      <div>
        <p className="mb-(--space-2) text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
          <span className="mr-(--space-2) font-semibold text-accent-text">
            {seq}
          </span>
          {eyebrow}
        </p>
        <h1 className="text-(length:--font-size-title-page) font-semibold text-primary">
          {title}
        </h1>
        {lede ? (
          <p className="mt-(--space-2) max-w-prose text-(length:--font-size-body) text-secondary">
            {lede}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-(--space-2)">{actions}</div> : null}
    </header>
  );
}
