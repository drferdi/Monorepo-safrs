'use client'

import { AlertTriangle, ArrowLeft, HeartPulse, Info, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import styles from '@/app/calculator/calculator.module.css'
import {
  type CalculatorField,
  type CalculatorResult,
  getCalculatorBySlug,
} from '@/lib/calculators/medical-calculators'

type Props = {
  slug: string
}

const TONE_CLASS: Record<CalculatorResult['tone'], string> = {
  normal: styles.toneNormal,
  warning: styles.toneWarning,
  critical: styles.toneCritical,
}

function renderSuffix(field: CalculatorField) {
  return 'suffix' in field && field.suffix ? (
    <span className={styles.suffix}>{field.suffix}</span>
  ) : null
}

export default function CalculatorWorkspace({ slug }: Props) {
  const calculator = getCalculatorBySlug(slug)
  const [values, setValues] = useState<Record<string, string>>({})

  const result = useMemo(
    () => (calculator ? calculator.compute(values) : null),
    [calculator, values]
  )

  if (!calculator) {
    return null
  }

  function updateValue(id: string, value: string) {
    setValues(current => ({ ...current, [id]: value }))
  }

  return (
    <div className={styles.page}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div className={styles.titleRow}>
          <Link href="/calculator" className={styles.back} title="Kembali ke katalog">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className={styles.title}>{calculator.title}</h1>
            <p className="ui-page-header__description">
              {calculator.summary}{' '}
              <span className={styles.clinicalUse}>{calculator.clinicalUse}</span>
            </p>
          </div>
        </div>
      </div>

      <div className={styles.detail}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Parameter</h2>
            <span className={styles.panelMeta}>{calculator.category}</span>
          </div>

          <div className={styles.form}>
            {calculator.fields.map(field => {
              if (field.type === 'number') {
                return (
                  <label key={field.id} className={styles.field}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <div className={styles.inputWrap}>
                      <input
                        type="number"
                        min={field.min}
                        step={field.step}
                        value={values[field.id] ?? ''}
                        placeholder={field.placeholder}
                        onChange={event => updateValue(field.id, event.target.value)}
                        className={`calculator-field-input ${styles.input}`}
                      />
                      {renderSuffix(field)}
                    </div>
                  </label>
                )
              }

              if (field.type === 'date') {
                return (
                  <label key={field.id} className={styles.field}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <div className={styles.inputWrap}>
                      <input
                        type="date"
                        value={values[field.id] ?? ''}
                        onChange={event => updateValue(field.id, event.target.value)}
                        className={`calculator-field-input ${styles.input}`}
                      />
                    </div>
                  </label>
                )
              }

              return (
                <div key={field.id} className={styles.field}>
                  <span className={styles.fieldLabel}>{field.label}</span>
                  <div className={styles.options}>
                    {field.options.map(option => {
                      const active = values[field.id] === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateValue(field.id, option.value)}
                          aria-pressed={active}
                          className="ui-chip"
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.sourceNote}>
            <Info size={14} />
            <div>
              <strong>Sumber logika:</strong> adaptasi dari repo Medlink.
              <div className={styles.sourcePath}>{calculator.sourcePath}</div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Hasil</h2>
            <span className={styles.panelMeta}>Realtime</span>
          </div>

          {result ? (
            <>
              <div className={TONE_CLASS[result.tone]}>
                <div className={styles.value}>
                  <span className={styles.valueNumber}>{result.primaryValue}</span>
                  {result.primaryUnit ? (
                    <span className={styles.valueUnit}>{result.primaryUnit}</span>
                  ) : null}
                </div>
                {result.secondaryValue ? (
                  <div className={styles.secondary}>
                    <span>{result.secondaryLabel}:</span>
                    <strong>{result.secondaryValue}</strong>
                  </div>
                ) : null}
                <p className={styles.interpretation}>{result.interpretation}</p>
              </div>

              <div className={styles.details}>
                {result.detailItems.map(item => (
                  <div key={item.label} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{item.label}</span>
                    <strong className={styles.detailValue}>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.notes}>
                <div className={styles.notesTitle}>
                  {result.tone === 'critical' ? (
                    <ShieldAlert size={14} />
                  ) : (
                    <HeartPulse size={14} />
                  )}
                  <span>Catatan klinis</span>
                </div>
                <ul className={styles.noteList}>
                  {result.notes.map(note => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <p>Lengkapi parameter untuk menampilkan hasil kalkulator.</p>
            </div>
          )}

          <div className={styles.warning}>
            <AlertTriangle size={14} />
            Kalkulator ini untuk referensi klinis. Verifikasi akhir tetap mengikuti protokol lokal.
          </div>
        </section>
      </div>
    </div>
  )
}
