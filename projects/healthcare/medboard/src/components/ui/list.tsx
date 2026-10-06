import type { ReactNode } from 'react'

export function List({ children }: { children: ReactNode }) {
  return <ul className="ui-list">{children}</ul>
}

export function ListItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (!onClick) return <li className="ui-list__item">{children}</li>
  return (
    <li className="ui-list__item ui-list__item--interactive">
      <button type="button" className="ui-list__button" onClick={onClick}>
        {children}
      </button>
    </li>
  )
}
