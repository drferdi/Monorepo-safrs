'use client'

import { ArrowDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import { useReducedMotion } from '@/components/shell/use-reduced-motion'
import type { ReferralAdvice } from '@/lib/icd/referral'

import styles from './icdx.module.css'

// Calm ease-out, no spring, no height animation (Chief: steady console motion).
const EASE = [0.22, 0.61, 0.36, 1] as const

// Under the ICD versions a line leads down to "Rujuk?"; pressing it shows whose authority the code
// is and the related diagnoses that can be referred (Chief 2026-10-07, Asma).
export function IcdReferral({
  advice,
  onPick,
}: {
  advice: ReferralAdvice
  onPick: (code: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const still = useReducedMotion()

  return (
    <section className={styles.referral} aria-label="Rujukan">
      <motion.span
        className={styles.connector}
        aria-hidden="true"
        initial={still ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: still ? 0 : 0.9, ease: EASE }}
      >
        <ArrowDown size={14} />
      </motion.span>
      <button
        type="button"
        className="ui-btn ui-btn--secondary ui-btn--sm"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        Rujuk?
      </button>

      {open && (
        <motion.div
          className={styles.referralBody}
          initial={still ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {advice.authority === 'fktp' && (
            <p className={styles.referralStatus}>
              <strong className={styles.authorityFktp}>Kewenangan FKTP</strong> · {advice.fktpMatch?.name}. Rujuk
              hanya bila memenuhi TACC: Time, Age, Complication, Comorbidity.
            </p>
          )}
          {advice.authority === 'rs' && (
            <p className={styles.referralStatus}>
              <strong className={styles.authorityRs}>Kewenangan RS</strong> · kompetensi {advice.competence}.
              Dapat dirujuk.
            </p>
          )}
          {advice.authority === 'other' && (
            <p className={styles.referralStatus}>Tidak termasuk 144 diagnosis FKTP. Rujuk sesuai indikasi klinis.</p>
          )}

          {advice.related.length > 0 ? (
            <>
              <span className={styles.detailLabel}>Bisa dirujuk, masih berkaitan</span>
              <ul className={styles.subcodeList}>
                {advice.related.map((item, i) => (
                  <motion.li
                    key={item.code}
                    initial={still ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: still ? 0 : 0.1 + i * 0.05, ease: EASE }}
                  >
                    <button type="button" className={styles.subcode} onClick={() => onPick(item.code, item.name)}>
                      <span className={styles.code}>{item.code}</span>
                      <span>
                        {item.name}
                        {item.competence && <span className={styles.competence}> {item.competence}</span>}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.detailLine}>Belum ada diagnosis berkaitan yang bisa dirujuk.</p>
          )}
        </motion.div>
      )}
    </section>
  )
}
