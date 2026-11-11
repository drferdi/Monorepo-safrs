import type { ReactNode } from "react";

export function WindowLights() {
  return (
    <svg
      className="h-2.5 w-[38px]"
      width="38"
      height="10"
      viewBox="0 0 38 10"
      aria-hidden="true"
    >
      <circle
        cx="5"
        cy="5"
        r="5"
        fill="var(--color-mark-corner, currentColor)"
      />
      <circle
        cx="19"
        cy="5"
        r="5"
        fill="var(--color-mark-corner, currentColor)"
      />
      <circle
        cx="33"
        cy="5"
        r="5"
        fill="var(--color-mark-corner, currentColor)"
      />
    </svg>
  );
}

interface TerminalPanelProps {
  seq?: string;
  module: string;
  meta?: string;
  title: string;
  labelledBy?: string;
  testId?: string;
  children: ReactNode;
}

/** Chrome panel — port perilaku arsip TerminalPanel, tanpa framer-motion. */
export function TerminalPanel({
  seq,
  module: modulePath,
  meta,
  title,
  labelledBy,
  testId,
  children,
}: TerminalPanelProps) {
  return (
    <section
      className="rounded-control border border-line-subtle bg-canvas"
      data-testid={testId}
      aria-labelledby={labelledBy}
    >
      <div className="flex items-center gap-(--space-2) border-b border-line-subtle px-(--space-3) py-(--space-2)">
        <WindowLights />
        <span className="text-xs font-medium tracking-wide text-secondary uppercase">
          {modulePath}
        </span>
        {meta ? (
          <span className="ml-auto text-xs text-secondary">{meta}</span>
        ) : null}
      </div>
      <div className="space-y-(--space-3) p-(--space-4)">
        {seq ? (
          <span className="text-xs font-semibold tracking-wide text-accent-text">
            {seq}
          </span>
        ) : null}
        <h3 className="text-base font-semibold text-primary" id={labelledBy}>
          {title}
        </h3>
        {children}
      </div>
    </section>
  );
}
