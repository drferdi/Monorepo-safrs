import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { IntelligenceSocketState } from '@/lib/intelligence/types'
import { installModuleMocks } from '../../../../scripts/test-helpers/module-mocks'

const mockSocketState: IntelligenceSocketState = {
  isConnected: true,
  isReconnecting: false,
  lastEncounterUpdate: null,
  lastCriticalAlert: null,
  lastEklaimStatus: null,
  lastCdssSuggestion: null,
}

test('IntelligenceSocketProvider shares a single hook result across multiple consumers', async () => {
  let hookCallCount = 0
  const receivedOptions: Array<unknown> = []

  const restore = installModuleMocks({
    '@/hooks/useIntelligenceSocket': {
      useIntelligenceSocket: (options?: unknown) => {
        hookCallCount += 1
        receivedOptions.push(options)
        return mockSocketState
      },
    },
  })

  try {
    const { IntelligenceSocketProvider, useSharedIntelligenceSocket } = await import(
      './IntelligenceSocketProvider'
    )

    function Consumer({ label }: { label: string }): React.JSX.Element {
      const socket = useSharedIntelligenceSocket()

      return (
        <span>
          {label}:{socket.isConnected ? 'live' : 'offline'}
        </span>
      )
    }

    const html = renderToStaticMarkup(
      <IntelligenceSocketProvider>
        <Consumer label="first" />
        <Consumer label="second" />
      </IntelligenceSocketProvider>
    )

    assert.equal(hookCallCount, 1)
    assert.deepEqual(receivedOptions, [{ enableCdssSuggestions: true }])
    assert.match(html, /first:live/)
    assert.match(html, /second:live/)
  } finally {
    restore()
  }
})
