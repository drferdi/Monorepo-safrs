'use client'

import { AlertTriangle, ArrowLeft, Calculator, HeartPulse, Info, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  type CalculatorField,
  type CalculatorResult,
  getCalculatorBySlug,
} from '@/lib/calculators/medical-calculators'

type Props = {
  slug: string
}

const TONE_COLOR: Record<CalculatorResult['tone'], string> = {
  normal: 'var(--c-asesmen)',
  warning: 'var(--c-warning)',
  critical: 'var(--c-critical)',
}

function renderSuffix(field: CalculatorField) {
  return 'suffix' in field && field.suffix ? (
    <span className="calculator-field-suffix">{field.suffix}</span>
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
    <div className="calculator-page-shell">
      <div className="page-header" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="page-header-block">
          <div className="page-title-row" style={{ alignItems: 'center', gap: 12 }}>
            <Link href="/calculator" className="calculator-back-link" title="Kembali ke katalog">
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="page-title">{calculator.title}</h1>
              <p className="page-subtitle">
                {calculator.summary}{' '}
                <span style={{ color: 'var(--text-main)' }}>{calculator.clinicalUse}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="page-header-divider" />
      </div>

      <div className="calculator-detail-grid">
        <section className="calculator-panel">
          <div className="calculator-panel-header">
            <span className="calculator-panel-kicker">Parameter</span>
            <span className="calculator-panel-meta">{calculator.category}</span>
          </div>

          <div className="calculator-form-grid">
            {calculator.fields.map(field => {
              if (field.type === 'number') {
                return (
                  <label key={field.id} className="calculator-field">
                    <span className="calculator-field-label">{field.label}</span>
                    <div className="calculator-field-input-wrap">
                      <input
                        type="number"
                        min={field.min}
                        step={field.step}
                        value={values[field.id] ?? ''}
                        placeholder={field.placeholder}
                        onChange={event => updateValue(field.id, event.target.value)}
                        className="calculator-field-input"
                      />
                      {renderSuffix(field)}
                    </div>
                  </label>
                )
              }

              if (field.type === 'date') {
                return (
                  <label key={field.id} className="calculator-field">
                    <span className="calculator-field-label">{field.label}</span>
                    <div className="calculator-field-input-wrap">
                      <input
                        type="date"
                        value={values[field.id] ?? ''}
                        onChange={event => updateValue(field.id, event.target.value)}
                        className="calculator-field-input"
                      />
                    </div>
                  </label>
                )
              }

              return (
                <div key={field.id} className="calculator-field">
                  <span className="calculator-field-label">{field.label}</span>
                  <div className="calculator-toggle-grid">
                    {field.options.map(option => {
                      const active = values[field.id] === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateValue(field.id, option.value)}
                          className={`calculator-toggle-btn${active ? ' active' : ''}`}
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

          <div className="calculator-source-note">
            <Info size={14} />
            <div>
              <strong>Sumber logika:</strong> adaptasi dari repo Medlink.
              <div className="calculator-source-path">{calculator.sourcePath}</div>
            </div>
          </div>
        </section>

        <section className="calculator-panel calculator-panel-result">
          <div className="calculator-panel-header">
            <span className="calculator-panel-kicker">Hasil</span>
            <span className="calculator-panel-meta">Realtime</span>
          </div>

          {result ? (
            <>
              <div
                className="calculator-primary-result"
                style={{ borderColor: TONE_COLOR[result.tone] }}
              >
                <div className="calculator-primary-value-row">
                  <span className="calculator-primary-value">{result.primaryValue}</span>
                  {result.primaryUnit ? (
                    <span className="calculator-primary-unit">{result.primaryUnit}</span>
                  ) : null}
                </div>
                {result.secondaryValue ? (
                  <div className="calculator-secondary-value">
                    <span>{result.secondaryLabel}:</span>
                    <strong>{result.secondaryValue}</strong>
                  </div>
                ) : null}
                <p className="calculator-interpretation" style={{ color: TONE_COLOR[result.tone] }}>
                  {result.interpretation}
                </p>
              </div>

              <div className="calculator-summary-grid">
                {result.detailItems.map(item => (
                  <div key={item.label} className="calculator-summary-item">
                    <span className="calculator-summary-label">{item.label}</span>
                    <strong className="calculator-summary-value">{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="calculator-note-box">
                <div className="calculator-note-title">
                  {result.tone === 'critical' ? (
                    <ShieldAlert size={14} />
                  ) : (
                    <HeartPulse size={14} />
                  )}
                  <span>Catatan klinis</span>
                </div>
                <ul className="calculator-note-list">
                  {result.notes.map(note => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="calculator-empty-state">
              <Calculator size={32} />
              <p>Lengkapi parameter untuk menampilkan hasil kalkulator.</p>
            </div>
          )}

          <div className="calculator-warning-strip">
            <AlertTriangle size={14} />
            Kalkulator ini untuk referensi klinis. Verifikasi akhir tetap mengikuti protokol lokal.
          </div>
        </section>
      </div>
    </div>
  )
}
