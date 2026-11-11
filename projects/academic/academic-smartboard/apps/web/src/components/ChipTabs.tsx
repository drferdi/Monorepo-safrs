import type { ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export function ChipTabs({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: string; label: string; testId?: string }>;
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-(--space-2)"
    >
      {options.map((opt) => {
        const pressed = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={pressed}
            data-testid={opt.testId}
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-h-(--target-min) rounded-control border px-(--space-3) py-(--space-2) text-(length:--font-size-body) transition-colors",
              pressed
                ? "border-accent bg-surface text-accent-text"
                : "border-line-subtle bg-canvas text-primary hover:bg-surface",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-control border border-line-subtle bg-canvas",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-line-subtle px-(--space-4) py-(--space-3)">
          <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="px-(--space-4) py-(--space-4)">{children}</div>
    </section>
  );
}
