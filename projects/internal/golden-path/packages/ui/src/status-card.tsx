import type { ReactNode } from "react";

export type StatusCardState = "ready" | "attention";

type StatusCardProps = {
  children?: ReactNode;
  detail: string;
  label: string;
  state: StatusCardState;
};

const stateLabel: Record<StatusCardState, string> = {
  attention: "Perlu perhatian",
  ready: "Siap",
};

export function StatusCard({
  children,
  detail,
  label,
  state,
}: StatusCardProps) {
  return (
    <article className="status-card" data-state={state}>
      <div className="status-card__heading">
        <h3>{label}</h3>
        <span className="status-card__state">{stateLabel[state]}</span>
      </div>
      <p>{detail}</p>
      {children}
    </article>
  );
}
