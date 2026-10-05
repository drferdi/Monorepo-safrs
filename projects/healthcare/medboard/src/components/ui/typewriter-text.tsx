// Drferdi — vision, brought to life.
'use client'

import { useCallback, useEffect, useState } from 'react'

const MESSAGES = [
  'Selamat datang di Sentra Dashboard...',
  'Puskesmas Kediri siap melayani...',
  'Semoga harimu menyenangkan...',
  'Jaga kesehatan selalu...',
  'Sentra Artificial Intelligence...',
]

export default function TypewriterText() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const typeSpeed = 100
  const deleteSpeed = 50
  const pauseTime = 2000
  const fadeTime = 500

  const tick = useCallback(() => {
    const fullText = MESSAGES[currentIndex]

    if (!isDeleting) {
      setDisplayText(fullText.substring(0, displayText.length + 1))
      if (displayText === fullText) {
        setTimeout(() => setIsDeleting(true), pauseTime)
      }
    } else {
      setDisplayText(fullText.substring(0, displayText.length - 1))
      if (displayText === '') {
        setIsDeleting(false)
        setIsVisible(false)
        setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % MESSAGES.length)
          setIsVisible(true)
        }, fadeTime)
      }
    }
  }, [currentIndex, displayText, isDeleting])

  useEffect(() => {
    const timer = setTimeout(tick, isDeleting ? deleteSpeed : typeSpeed)
    return () => clearTimeout(timer)
  }, [tick, isDeleting])

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 24,
        zIndex: 100,
        maxWidth: 280,
        padding: '12px 16px',
        background: 'var(--bg-nav)',
        border: '1px solid var(--line-base)',
        borderRadius: 8,
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? 0 : -10}px)`,
        transition: `opacity ${fadeTime}ms ease, transform ${fadeTime}ms ease`,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontSize: 14,
          color: 'var(--c-asesmen)',
          letterSpacing: '0.02em',
        }}
      >
        {displayText}
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: 'var(--c-asesmen)',
            marginLeft: 2,
            animation: 'blink 1s infinite',
          }}
        />
      </span>
    </div>
  )
}
