'use client'

import { X } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ui-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="ui-dialog" style={{ maxWidth: width }}>
        <header className="ui-dialog__header">
          <h2 id={titleId} className="ui-dialog__title">
            {title}
          </h2>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onClose} aria-label="Tutup">
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </header>
        <div className="ui-dialog__body">{children}</div>
        {footer ? <footer className="ui-dialog__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
