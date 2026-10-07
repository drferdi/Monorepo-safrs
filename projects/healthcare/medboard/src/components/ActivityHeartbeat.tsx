'use client'

import { useEffect } from 'react'

import { BEAT_INTERVAL_MS, shouldSendBeat } from '@/lib/crew-activity'

// Counts active hours for the clinical rank: one beat a minute while the tab is visible and the
// user has clicked, typed or scrolled within five minutes. The server decides what to credit.
export default function ActivityHeartbeat(): null {
  useEffect(() => {
    let lastInputAt = Date.now()
    const markInput = () => {
      lastInputAt = Date.now()
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const name of events) window.addEventListener(name, markInput, { passive: true })

    // CrewAccessGate also renders public pages (patient join) without a session: the first 401
    // stops the timer so those pages never beat.
    const timer = window.setInterval(() => {
      const visible = document.visibilityState === 'visible'
      if (!shouldSendBeat({ visible, lastInputAt, now: Date.now() })) return
      fetch('/api/activity/beat', { method: 'POST', keepalive: true })
        .then((response) => {
          if (response.status === 401) window.clearInterval(timer)
        })
        .catch(() => undefined)
    }, BEAT_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
      for (const name of events) window.removeEventListener(name, markInput)
    }
  }, [])
  return null
}
