'use client'

import { createContext, useContext } from 'react'

import { useIntelligenceSocket } from '@/hooks/useIntelligenceSocket'
import type { IntelligenceSocketState } from '@/lib/intelligence/types'

const IntelligenceSocketContext = createContext<IntelligenceSocketState | null>(null)

export function IntelligenceSocketProvider({
  children,
  enableCdssSuggestions = true,
}: {
  children: React.ReactNode
  enableCdssSuggestions?: boolean
}): React.JSX.Element {
  const socketState = useIntelligenceSocket({ enableCdssSuggestions })

  return (
    <IntelligenceSocketContext.Provider value={socketState}>
      {children}
    </IntelligenceSocketContext.Provider>
  )
}

export function useSharedIntelligenceSocket(): IntelligenceSocketState {
  const socketState = useContext(IntelligenceSocketContext)

  if (!socketState) {
    throw new Error('useSharedIntelligenceSocket must be used within IntelligenceSocketProvider')
  }

  return socketState
}
