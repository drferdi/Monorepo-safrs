import Link from 'next/link'
import { type CalculatorCategory, MEDICAL_CALCULATORS } from '@/lib/calculators/medical-calculators'
import styles from './calculator.module.css'

const CATEGORY_ORDER: CalculatorCategory[] = [
  'Umum',
  'Kardiovaskular',
  'Ginjal',
  'Pulmonologi',
  'Metabolik',
  'Skrining Mental',
  'Critical Care',
  'Neurologi',
  'Obstetri',
]

export default function CalculatorPage() {
  return (
    <div className={styles.page}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Calculator Medis</h1>
          <p className="ui-page-header__description">
            Adaptasi kalkulator klinis dari Medlink untuk kebutuhan cepat di dashboard Puskesmas.
          </p>
        </div>
      </div>

      <p className={styles.intro}>
        <span className={styles.introLead}>Batch pertama aktif</span>
        {'. '}
        Kalkulator berikut sudah diadaptasi ke bahasa visual dashboard saat ini. Source asli tetap
        disalin ke folder
        <strong> dashboard/calculator </strong> sebagai basis referensi.
      </p>

      {CATEGORY_ORDER.map(category => {
        const items = MEDICAL_CALCULATORS.filter(item => item.category === category)
        if (!items.length) return null
        return (
          <section key={category} className={styles.category}>
            <div className={styles.categoryHead}>
              <h2 className={styles.categoryTitle}>{category}</h2>
              <span className={styles.categoryCount}>{items.length} tool</span>
            </div>

            <div className={styles.grid}>
              {items.map(calculator => (
                <Link
                  key={calculator.slug}
                  href={`/calculator/${calculator.slug}`}
                  className={styles.tile}
                >
                  <span className="ui-badge ui-badge--primary">{calculator.category}</span>
                  <h3 className={styles.tileTitle}>{calculator.title}</h3>
                  <p className={styles.tileSummary}>{calculator.summary}</p>
                  <div className={styles.tileFoot}>
                    <span className={styles.tileUse}>{calculator.clinicalUse}</span>
                    <strong className={styles.tileOpen}>Buka</strong>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
