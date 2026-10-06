import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__title">{title}</div>
      {description ? <div>{description}</div> : null}
      {action}
    </div>
  )
}
