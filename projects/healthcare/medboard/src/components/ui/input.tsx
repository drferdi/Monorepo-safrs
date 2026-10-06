import { Search } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('ui-input', className)} {...rest} />
}

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="ui-search">
      <Search size={16} strokeWidth={1.75} aria-hidden className="ui-search__icon" />
      <input type="search" className={cx('ui-input', 'ui-search__input', className)} {...rest} />
    </span>
  )
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">{label}</span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  )
}
