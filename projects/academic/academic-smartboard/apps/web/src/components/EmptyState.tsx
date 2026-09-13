import type { ReactNode } from "react";

interface EmptyStateProps {
  tone?: "invite" | "filter" | "clear" | "loading" | "error";
  title?: string;
  lede?: string;
  action?: ReactNode;
  testId?: string;
}

export function EmptyState({
  title = "Belum ada data",
  lede,
  action,
  testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-control border border-dashed border-line-subtle bg-surface px-(--space-5) py-(--space-8) text-center"
    >
      <p className="text-(length:--font-size-title-section) font-medium text-primary">
        {title}
      </p>
      {lede ? (
        <p className="mt-(--space-2) text-(length:--font-size-body) text-secondary">
          {lede}
        </p>
      ) : null}
      {action ? <div className="mt-(--space-4)">{action}</div> : null}
    </div>
  );
}
