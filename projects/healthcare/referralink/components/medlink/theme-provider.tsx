'use client'

import '../../src/globals.scss'
import '../../src/workspaces.scss'
import { GlobalTheme } from '@carbon/react'
import { useEffect, type ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('cds--white', 'cds--g100')
    root.classList.add('cds--g100')
    root.setAttribute('data-theme', 'dark')
  }, [])

  return <GlobalTheme theme="g100">{children}</GlobalTheme>
}
