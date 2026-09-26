'use client'

import type React from 'react'
import { useEffect, useRef } from 'react'

export type SecondsMode = 'smooth' | 'tick1' | 'tick2' | 'highFreq'

const BERLIN_TIMEZONE = 'Asia/Jakarta' // diubah ke WIB untuk puskesmas

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function GlassClock(): React.ReactElement {
  const hourMarksRef = useRef<HTMLDivElement>(null)
  const glossyOverlayRef = useRef<HTMLDivElement>(null)
  const reflectionOverlayRef = useRef<HTMLDivElement>(null)
  const hourHandRef = useRef<HTMLDivElement>(null)
  const minuteHandRef = useRef<HTMLDivElement>(null)
  const secondHandContainerRef = useRef<HTMLDivElement>(null)
  const secondHandShadowRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)
  const timezoneRef = useRef<HTMLDivElement>(null)
  const tweakpaneContainerRef = useRef<HTMLDivElement>(null)
  const glassEdgeShadowRef = useRef<HTMLDivElement>(null)
  const glassDarkEdgeRef = useRef<HTMLDivElement>(null)
  const glassEffectShadowRef = useRef<HTMLDivElement>(null)

  const requestAnimationRef = useRef<number | null>(null)
  const hourMinuteTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const rootStyle = document.documentElement.style

    const setInitialVariables = () => {
      rootStyle.setProperty('--gc-primary-light-angle', '-45deg')
      rootStyle.setProperty('--gc-dark-edge-angle', '135deg')
      rootStyle.setProperty('--gc-minute-marker-opacity', '1')
      rootStyle.setProperty('--gc-inner-shadow-opacity', '0.15')
      rootStyle.setProperty('--gc-outer-shadow-opacity', '1')
      rootStyle.setProperty('--gc-reflection-opacity', '0.5')
      rootStyle.setProperty('--gc-glossy-opacity', '0.3')
      rootStyle.setProperty('--gc-hour-number-opacity', '1')
      rootStyle.setProperty('--gc-hour-number-color', '#2D2420')
      rootStyle.setProperty('--gc-minute-marker-color', 'rgba(201, 168, 124, 0.5)')
      rootStyle.setProperty('--gc-hand-color', '#2D2420')
      rootStyle.setProperty('--gc-second-hand-color', '#E67E22')
      rootStyle.setProperty('--gc-shadow-layer1-opacity', '0.1')
      rootStyle.setProperty('--gc-shadow-layer2-opacity', '0.1')
      rootStyle.setProperty('--gc-shadow-layer3-opacity', '0.1')
    }

    const clearHourMarks = () => {
      if (hourMarksRef.current) hourMarksRef.current.replaceChildren()
    }

    const createHourMarks = () => {
      const container = hourMarksRef.current
      if (!container) return
      clearHourMarks()

      for (let i = 0; i < 60; i += 1) {
        if (i % 5 === 0) {
          const hourIndex = i / 5
          const hourNumber = document.createElement('div')
          hourNumber.className = 'gc-number'
          const angle = (i * 6 * Math.PI) / 180
          const radius = 80
          const left = 100 + Math.sin(angle) * radius - 8
          const top = 100 - Math.cos(angle) * radius - 8
          hourNumber.style.left = `${left}px`
          hourNumber.style.top = `${top}px`
          hourNumber.textContent = hourIndex === 0 ? '12' : hourIndex.toString()
          container.appendChild(hourNumber)
        } else {
          const minuteMarker = document.createElement('div')
          minuteMarker.className = 'gc-minute-marker'
          minuteMarker.style.transform = `rotate(${i * 6}deg)`
          container.appendChild(minuteMarker)
        }
      }
    }

    const updateHourAndMinuteHands = () => {
      const now = new Date()
      const localStr = now.toLocaleString('en-US', {
        timeZone: BERLIN_TIMEZONE,
      })
      const localTime = new Date(localStr)
      const hours = localTime.getHours() % 12
      const minutes = localTime.getMinutes()

      if (hourHandRef.current)
        hourHandRef.current.style.transform = `rotate(${hours * 30 + (minutes / 60) * 30}deg)`
      if (minuteHandRef.current) minuteHandRef.current.style.transform = `rotate(${minutes * 6}deg)`
      if (dateRef.current) {
        const month = MONTH_NAMES[localTime.getMonth()]
        dateRef.current.textContent = `${month} ${localTime.getDate()}`
      }
      if (timezoneRef.current) timezoneRef.current.textContent = 'WIB'

      if (hourMinuteTimeoutRef.current) clearTimeout(hourMinuteTimeoutRef.current)
      const msUntilNextMinute = (60 - localTime.getSeconds()) * 1000 - localTime.getMilliseconds()
      hourMinuteTimeoutRef.current = window.setTimeout(
        updateHourAndMinuteHands,
        Math.max(msUntilNextMinute, 0)
      )
    }

    const applySecondHandRotation = (angle: number) => {
      if (secondHandContainerRef.current) {
        secondHandContainerRef.current.style.transition = 'none'
        secondHandContainerRef.current.style.transform = `rotate(${angle}deg)`
      }
      if (secondHandShadowRef.current) {
        secondHandShadowRef.current.style.transition = 'none'
        secondHandShadowRef.current.style.transform = `rotate(${angle + 0.5}deg)`
      }
    }

    const cancelSecondHandAnimation = () => {
      if (requestAnimationRef.current !== null) {
        cancelAnimationFrame(requestAnimationRef.current)
        requestAnimationRef.current = null
      }
    }

    const startSmoothSecondHand = () => {
      cancelSecondHandAnimation()
      const animate = () => {
        const now = new Date()
        const angle = now.getSeconds() * 6 + (now.getMilliseconds() / 1000) * 6
        applySecondHandRotation(angle)
        requestAnimationRef.current = requestAnimationFrame(animate)
      }
      animate()
    }

    const initializeOverlays = () => {
      if (glossyOverlayRef.current) {
        glossyOverlayRef.current.style.background = `linear-gradient(135deg,
          rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 15%,
          rgba(255,255,255,0.5) 25%, rgba(255,255,255,0.3) 50%,
          rgba(255,255,255,0.2) 75%, rgba(255,255,255,0.1) 100%)`
        glossyOverlayRef.current.style.filter = 'blur(6px)'
      }
      if (reflectionOverlayRef.current) {
        reflectionOverlayRef.current.style.transform = 'rotate(-15deg)'
        reflectionOverlayRef.current.style.filter = 'blur(6px)'
      }
    }

    setInitialVariables()
    createHourMarks()
    initializeOverlays()
    updateHourAndMinuteHands()
    startSmoothSecondHand()

    return () => {
      cancelSecondHandAnimation()
      if (hourMinuteTimeoutRef.current) clearTimeout(hourMinuteTimeoutRef.current)
      clearHourMarks()
    }
  }, [])

  return (
    <div className="gc-wrapper">
      <div className="gc-container">
        <div className="gc-effect-wrapper">
          <div className="gc-effect-shadow" ref={glassEffectShadowRef} />
          <div className="gc-face">
            <div className="gc-glossy-overlay" ref={glossyOverlayRef} />
            <div className="gc-edge-highlight" />
            <div className="gc-edge-highlight-outer" />
            <div className="gc-edge-shadow" ref={glassEdgeShadowRef} />
            <div className="gc-dark-edge" ref={glassDarkEdgeRef} />
            <div className="gc-reflection" />
            <div className="gc-reflection-overlay" ref={reflectionOverlayRef} />

            <div className="gc-hour-marks" ref={hourMarksRef} />

            <div className="gc-hour-hand" ref={hourHandRef} />
            <div className="gc-minute-hand" ref={minuteHandRef} />

            <div className="gc-second-container" ref={secondHandContainerRef}>
              <div className="gc-second-hand" />
              <div className="gc-second-counterweight" />
            </div>
            <div className="gc-second-shadow" ref={secondHandShadowRef} />

            <div className="gc-center-dot" />
            <div className="gc-date" ref={dateRef} />
            <div className="gc-timezone" ref={timezoneRef}>
              WIB
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlassClock
