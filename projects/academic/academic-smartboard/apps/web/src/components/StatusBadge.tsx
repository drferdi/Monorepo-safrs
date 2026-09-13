import type { ReactNode } from "react";
import type { StatusBadgeTone } from "../lib/labels.ts";
import { cn } from "../lib/cn.ts";

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  info: "bg-surface text-accent-text",
  warning: "bg-surface text-warning",
  success: "bg-surface text-success",
  critical: "bg-surface text-critical",
  neutral: "bg-surface text-secondary",
};

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusBadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-control px-(--space-2) py-(--space-1) text-(length:--font-size-label) font-medium",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}
