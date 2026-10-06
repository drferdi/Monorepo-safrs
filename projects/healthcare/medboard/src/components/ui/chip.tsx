import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: ReactNode
}

export function Chip({ selected, icon, type = 'button', className, children, ...rest }: ChipProps) {
  return (
    <button type={type} className={cx('ui-chip', className)} aria-pressed={selected} {...rest}>
      {icon}
      {children}
    </button>
  )
}
