import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: ReactNode
}

export function Tabs({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  'aria-label': string
}) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          className="ui-tab"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
