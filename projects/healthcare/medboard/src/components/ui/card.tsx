import type { ReactNode } from 'react'
import { cx } from './cx'

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('ui-card', className)}>
      {title || actions ? (
        <header className="ui-card__header">
          {title ? <h2 className="ui-card__title">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      <div className="ui-card__body">{children}</div>
    </section>
  )
}
