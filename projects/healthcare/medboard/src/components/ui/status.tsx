import type { ReactNode } from 'react'

export type StatusTone = 'critical' | 'warning' | 'success'

export const STATUS_WORD: Record<StatusTone, string> = {
  critical: 'KRITIS',
  warning: 'WASPADA',
  success: 'AMAN',
}

export function StatusBadge({ tone, label }: { tone: StatusTone; label?: string }) {
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {label ? `${STATUS_WORD[tone]} · ${label}` : STATUS_WORD[tone]}
    </span>
  )
}

export function StatusAlert({ tone, title, children }: { tone: StatusTone; title: string; children?: ReactNode }) {
  return (
    <div role="alert" className={`ui-alert ui-alert--${tone}`}>
      <div className="ui-alert__head">
        <span className="ui-alert__word">{STATUS_WORD[tone]}</span>
        <span className="ui-alert__title">{title}</span>
      </div>
      {children ? <div className="ui-alert__body">{children}</div> : null}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'primary' | 'accent'; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}
