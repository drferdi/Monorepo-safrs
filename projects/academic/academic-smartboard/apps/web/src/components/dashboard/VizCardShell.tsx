import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Button } from "../ui/button.tsx";

interface VizCardShellProps {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  testId?: string;
  children?: ReactNode;
}

export function VizCardShell({
  title,
  subtitle,
  href,
  hrefLabel = "Detail →",
  loading = false,
  error = "",
  empty = false,
  emptyMessage = "Belum ada data.",
  onRetry,
  testId,
  children,
}: VizCardShellProps) {
  return (
    <div
      className="rounded-control border border-line-subtle bg-canvas p-(--space-4)"
      data-testid={testId}
    >
      <div className="mb-(--space-3) flex items-start justify-between gap-(--space-3)">
        <div>
          <h3 className="font-semibold text-primary">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-secondary">{subtitle}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href as Route}
            className="shrink-0 text-sm text-accent-text underline"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="space-y-(--space-2)">
          <p className="font-medium text-primary">{title} belum dapat dimuat</p>
          <p className="text-sm text-secondary">{error}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Muat ulang
            </Button>
          ) : null}
        </div>
      ) : loading ? (
        <p className="text-sm text-secondary" role="status">
          Memuat…
        </p>
      ) : empty ? (
        <div className="space-y-1">
          <p className="font-medium text-primary">{emptyMessage}</p>
          <p className="text-sm text-secondary">
            Data periode ini belum tersedia untuk indikator ini.
          </p>
        </div>
      ) : (
        <div className="space-y-(--space-4)">{children}</div>
      )}
    </div>
  );
}
