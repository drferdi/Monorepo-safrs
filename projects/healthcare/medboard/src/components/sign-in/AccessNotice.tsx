'use client'

import { useEffect, useState } from 'react'

import styles from './sign-in.module.css'

const AUTHORIZED_ROLES = [
  'Dokter',
  'Dokter spesialis',
  'Dokter gigi',
  'Perawat',
  'Bidan',
  'Apoteker',
  'Administrator fasilitas kesehatan',
]

const CYCLE_MS = 2200

/**
 * Who may sign in, set Swiss style: a heavy rule, a flush-left title and a numbered two-column
 * list. A soft highlight travels through the roles; static under reduced motion.
 */
export default function AccessNotice({ baseDelay }: { baseDelay: number }) {
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let interval: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      setActive(0)
      interval = setInterval(() => setActive((index) => (index + 1) % AUTHORIZED_ROLES.length), CYCLE_MS)
    }, baseDelay + AUTHORIZED_ROLES.length * 70 + 900)
    return () => {
      clearTimeout(start)
      clearInterval(interval)
    }
  }, [baseDelay])

  const rise = (ms: number) => ({ animationDelay: `${baseDelay + ms}ms` })

  return (
    <footer className={styles.notice} aria-labelledby="access-title">
      <div className={`${styles.noticeHead} ${styles.rise}`} style={rise(0)}>
        <span id="access-title" className={styles.noticeTitle}>
          Akses terbatas
        </span>
        <span className={styles.noticeLead}>Hanya untuk tenaga kesehatan yang berwenang.</span>
      </div>
      <ol aria-labelledby="access-title" className={styles.roles}>
        {AUTHORIZED_ROLES.map((role, index) => (
          <li
            key={role}
            className={`${styles.role} ${styles.rise}`}
            data-active={index === active}
            style={rise(140 + index * 70)}
          >
            <span aria-hidden="true" className={styles.roleIndex}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {role}
          </li>
        ))}
      </ol>
    </footer>
  )
}
