import styles from './sign-in.module.css'

const LAWS = [
  'UU 28/2014 Hak Cipta',
  'UU 30/2000 Rahasia Dagang',
  'UU 11/2008 jo. UU 1/2024 Transaksi Elektronik',
  'UU 27/2022 Pelindungan Data Pribadi',
  'UU 17/2023 Kesehatan',
]

/** Ownership and the legal basis protecting the platform, under the sign-in column. */
export default function LegalNotice({ baseDelay }: { baseDelay: number }) {
  return (
    <section
      aria-labelledby="legal-title"
      className={`${styles.legal} ${styles.rise}`}
      style={{ animationDelay: `${baseDelay}ms` }}
    >
      <p id="legal-title" className={styles.legalTitle}>
        Dilindungi undang-undang
      </p>
      <p>{LAWS.join(' · ')}</p>
      <p>© 2025–2026 dr. Ferdi Iskandar · Sentra Artificial Intelligence</p>
    </section>
  )
}
