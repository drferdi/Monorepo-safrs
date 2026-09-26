
import {
  Activity,
  Baby,
  Brain,
  Calculator,
  Droplets,
  Heart,
  Scale,
  Smile,
  UserRound,
  Wind,
} from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { type CalculatorCategory, MEDICAL_CALCULATORS } from '@/lib/calculators/medical-calculators'

const PAGE_WIDTH = 1200

const CATEGORY_ICON: Record<CalculatorCategory, LucideIcon> = {
  Umum: UserRound,
  Kardiovaskular: Heart,
  Ginjal: Droplets,
  Obstetri: Baby,
  'Critical Care': Activity,
  Neurologi: Brain,
  Pulmonologi: Wind,
  Metabolik: Scale,
  'Skrining Mental': Smile,
}

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
    <div style={{ width: '100%', padding: '0 32px 72px' }}>
      <div className="page-header" style={{ maxWidth: PAGE_WIDTH, margin: '0 auto' }}>
        <div className="page-header-block">
          <div className="page-title-row">
            <Calculator size={20} color="var(--c-asesmen)" />
            <h1 className="page-title">Calculator Medis</h1>
          </div>
          <p className="page-subtitle">
            Adaptasi kalkulator klinis dari Medlink untuk kebutuhan cepat di dashboard Puskesmas.
          </p>
        </div>
        <div className="page-header-divider" />
      </div>

      <div className="calculator-catalog-shell">
        <div className="calculator-catalog-intro">
          <span className="calculator-catalog-kicker">Batch pertama aktif</span>
          <p>
            Kalkulator berikut sudah diadaptasi ke bahasa visual dashboard saat ini. Source asli
            tetap disalin ke folder
            <strong> dashboard/calculator </strong> sebagai basis referensi.
          </p>
        </div>

        {CATEGORY_ORDER.map(category => {
          const items = MEDICAL_CALCULATORS.filter(item => item.category === category)
          if (!items.length) return null
          const Icon = CATEGORY_ICON[category]
          return (
            <section key={category} className="calculator-category-block">
              <div className="calculator-category-header">
                <div className="calculator-category-title-row">
                  <Icon size={16} strokeWidth={2.2} />
                  <h2>{category}</h2>
                </div>
                <span>{items.length} tool</span>
              </div>

              <div className="calculator-card-grid">
                {items.map(calculator => (
                  <Link
                    key={calculator.slug}
                    href={`/calculator/${calculator.slug}`}
                    className="calculator-catalog-card"
                  >
                    <div className="calculator-catalog-card-header">
                      <span className="calculator-catalog-chip">{calculator.category}</span>
                    </div>
                    <h3>{calculator.title}</h3>
                    <p>{calculator.summary}</p>
                    <div className="calculator-catalog-card-footer">
                      <span>{calculator.clinicalUse}</span>
                      <strong>Buka</strong>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
