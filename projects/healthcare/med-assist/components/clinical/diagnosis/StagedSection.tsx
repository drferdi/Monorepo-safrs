import type { ReactNode } from 'react';

export function StagedSection({
  label,
  stageIndex,
  open,
  header,
  children,
}: {
  label: string;
  stageIndex: 1 | 2 | 3 | 4;
  open: boolean;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`form-group diagnosis-block diagnosis-stage diagnosis-stage--i${stageIndex}`}
      aria-label={label}
    >
      <details className="diagnosis-stage__details" open={open}>
        <summary className="diagnosis-stage__summary">{header}</summary>
        <div className="diagnosis-stage__body">{children}</div>
      </details>
    </section>
  );
}
