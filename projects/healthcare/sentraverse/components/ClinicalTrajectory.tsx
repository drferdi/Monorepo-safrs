// Architected and built by Drferdi.
'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import ClinicalPrognosis from './ClinicalPrognosis'

import {
  ACUTE_RISKS,
  buildPolyline,
  DEMO_VISITS,
  DRIVERS,
  RECOMMENDATIONS,
  RISK_COLORS,
  riskBarColor,
  SLIDE_LABELS,
  VITAL_PARAMS,
} from '@/components/clinical-trajectory/data'

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

type ClinicalTrajectoryProps = {
  hideHeader?: boolean
  /** Saat true: hanya render slide trajektori — tanpa slider, tanpa auto-advance
   *  ke prognosis, tanpa navigasi pill. Dipakai saat Trajektori & Prognosis
   *  ditampilkan sebagai tab terpisah di ClinicalSuite. */
  trajectoryOnly?: boolean
}

export default function ClinicalTrajectory({
  hideHeader = false,
  trajectoryOnly = false,
}: ClinicalTrajectoryProps) {
  const [activeSlide, setActiveSlide] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Auto-slide to prognosis after trajectory animations complete (~6s)
  useEffect(() => {
    if (trajectoryOnly) return
    const el = sectionRef.current
    if (!el) return

    let timer: ReturnType<typeof setTimeout>
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setActiveSlide(1), 6000)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [trajectoryOnly])

  // Chart calculations
  const chartW = 480
  const chartH = 260
  const vMin = 60
  const vMax = 200
  const pad = 8
  const usableH = chartH - pad * 2

  const sbpLine = buildPolyline(
    DEMO_VISITS.map((v) => v.sbp),
    vMin,
    vMax,
    chartW,
    chartH
  )
  const dbpLine = buildPolyline(
    DEMO_VISITS.map((v) => v.dbp),
    vMin,
    vMax,
    chartW,
    chartH
  )
  const hrLine = buildPolyline(
    DEMO_VISITS.map((v) => v.hr),
    vMin,
    vMax,
    chartW,
    chartH
  )
  const y140 = pad + usableH - ((140 - vMin) / (vMax - vMin)) * usableH
  const y180 = pad + usableH - ((180 - vMin) / (vMax - vMin)) * usableH

  const renderContent = () => (
    <div className={hideHeader ? 'w-full' : 'max-w-[1440px] mx-auto px-6 md:px-12'}>
      {!hideHeader && (
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-2 inline-flex items-center gap-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
              Clinical Intelligence
            </span>
            <div className="h-px w-12 bg-accent/40" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-lg font-bold leading-[1.15] tracking-tight text-foreground md:text-xl"
          >
            Trajectory &amp; Prognosis
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-2 max-w-[580px] text-xs leading-relaxed text-muted/80"
          >
            Analisis trajektori klinis real-time dan prognosis komprehensif — memantau deteriorasi,
            memprediksi risiko, dan memberikan rekomendasi evidence-based.
          </motion.p>
        </div>
      )}

      {/* ═══ Slider Container ═══ */}
      <div className="mx-auto max-w-[1100px] overflow-hidden rounded-2xl">
        <motion.div
          className="flex"
          animate={trajectoryOnly ? undefined : { x: `${-activeSlide * 100}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ─── Slide 1: Trajectory ─── */}
          <div className="min-w-full w-full min-w-0 overflow-hidden">
            <div>
              {/* Panel header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-muted/10">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                    ◈ TRAJEKTORI KLINIS
                  </span>
                  <span
                    className="text-[8px] font-bold tracking-[0.1em] px-2 py-0.5 rounded"
                    style={{
                      color: '#f97316',
                      background: 'rgba(249,115,22,0.1)',
                      border: '1px solid #f97316',
                    }}
                  >
                    MENDESAK &lt;6J
                  </span>
                  <span
                    className="text-[8px] font-bold tracking-[0.1em] px-2 py-0.5 rounded"
                    style={{
                      color: '#f97316',
                      border: '1px solid #f97316',
                      background: 'rgba(249,115,22,0.1)',
                    }}
                  >
                    MEMBURUK
                  </span>
                </div>
                <span className="text-[9px] tracking-[0.1em] text-muted uppercase">
                  Demo — Data Simulasi
                </span>
              </div>

              <div className="py-5 grid lg:grid-cols-[260px_1fr_280px] gap-6">
                <div className="flex flex-col gap-3 justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.12em] text-muted uppercase block mb-2.5">
                      PARAMETER KLINIS
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {VITAL_PARAMS.map((vt) => (
                        <div
                          key={vt.label}
                          className="rounded p-2"
                          style={{
                            border: `1px solid ${RISK_COLORS[vt.risk]}30`,
                            background: `${RISK_COLORS[vt.risk]}05`,
                          }}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] text-muted">{vt.label}</span>
                            <span
                              className="text-[8px] font-bold px-1 py-0.5 rounded"
                              style={{
                                color: RISK_COLORS[vt.risk],
                                border: `1px solid ${RISK_COLORS[vt.risk]}40`,
                              }}
                            >
                              {vt.risk.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-0.5">
                            <span
                              className="text-lg font-medium"
                              style={{ color: RISK_COLORS[vt.risk] }}
                            >
                              {vt.value}
                            </span>
                            <span className="text-[9px] text-muted">{vt.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded p-2.5 mt-2"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <span className="text-[10px] tracking-[0.12em] text-muted block mb-2">
                      RINGKASAN TRAJEKTORI
                    </span>
                    <p className="text-[11px] text-muted leading-relaxed m-0 italic">
                      Pasien menunjukkan tren deteriorasi progresif. SBP naik konsisten +28 mmHg
                      dalam 3 kunjungan terakhir.
                    </p>
                  </div>
                </div>

                {/* === KOLOM 2: VITAL TREND CHART & ACTIONS === */}
                <div className="flex flex-col gap-3 justify-between">
                  <div
                    className="rounded p-3 relative flex-1 flex flex-col justify-between"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.015)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="text-[11px] tracking-[0.14em] uppercase"
                        style={{ color: '#FFCC8C' }}
                      >
                        Tren Vital — 4 Kunjungan
                      </span>
                      <div className="flex gap-2">
                        <span className="text-[10px] flex items-center gap-1 text-foreground/70">
                          <span
                            className="w-2.5 h-0.5 rounded inline-block"
                            style={{ background: '#FFCC8C' }}
                          />{' '}
                          SBP
                        </span>
                        <span className="text-[10px] flex items-center gap-1 text-muted">
                          <span
                            className="w-2.5 h-0.5 rounded inline-block"
                            style={{ background: 'rgba(255,204,140,0.45)' }}
                          />{' '}
                          DBP
                        </span>
                        <span className="text-[10px] flex items-center gap-1 text-muted">
                          <span
                            className="w-2.5 h-0.5 rounded inline-block"
                            style={{ background: 'rgba(96,165,250,0.7)' }}
                          />{' '}
                          HR
                        </span>
                      </div>
                    </div>
                    <svg
                      viewBox={`0 0 ${chartW} ${chartH}`}
                      className="w-full"
                      style={{ height: 210 }}
                      aria-label="Vital sign trend chart"
                    >
                      <line
                        x1={pad}
                        y1={y140}
                        x2={chartW - pad}
                        y2={y140}
                        stroke="rgba(249,115,22,0.4)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                      <text
                        x={chartW - 6}
                        y={y140 - 3}
                        fill="rgba(249,115,22,0.6)"
                        fontSize="8"
                        textAnchor="end"
                      >
                        140
                      </text>
                      <line
                        x1={pad}
                        y1={y180}
                        x2={chartW - pad}
                        y2={y180}
                        stroke="rgba(239,68,68,0.4)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                      <text
                        x={chartW - 6}
                        y={y180 - 3}
                        fill="rgba(239,68,68,0.6)"
                        fontSize="8"
                        textAnchor="end"
                      >
                        180
                      </text>
                      <polyline
                        points={hrLine}
                        fill="none"
                        stroke="rgba(96,165,250,0.7)"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={dbpLine}
                        fill="none"
                        stroke="rgba(255,204,140,0.45)"
                        strokeWidth="1.6"
                        strokeDasharray="4,3"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={sbpLine}
                        fill="none"
                        stroke="#FFCC8C"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                      {DEMO_VISITS.map((v, i) => {
                        const x = pad + (i / (DEMO_VISITS.length - 1)) * (chartW - pad * 2)
                        const y = pad + usableH - ((v.sbp - vMin) / (vMax - vMin)) * usableH
                        return (
                          <g key={v.label}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="var(--sentra-bg)"
                              stroke="#FFCC8C"
                              strokeWidth="1.5"
                            />
                            <text
                              x={x}
                              y={chartH - 2}
                              fill="rgba(255,255,255,0.5)"
                              fontSize="8"
                              textAnchor="middle"
                              fontWeight="600"
                            >
                              {v.label}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.12em] text-muted uppercase block mb-2">
                        PEMICU RISIKO
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {DRIVERS.map((d, i) => (
                          <div key={i} className="flex gap-1 items-start">
                            <span
                              className="text-[9px] mt-0.5"
                              style={{ color: 'var(--sentra-accent)' }}
                            >
                              ▸
                            </span>
                            <span className="text-[11px] text-foreground/80 leading-tight">
                              {d}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.12em] text-muted uppercase block mb-2">
                        REKOMENDASI
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {RECOMMENDATIONS.map((rec, i) => {
                          const c = rec.priority === 'high' ? '#ef4444' : '#f97316'
                          return (
                            <div
                              key={i}
                              className="rounded px-1.5 py-0.5"
                              style={{ borderLeft: `2px solid ${c}`, background: `${c}05` }}
                            >
                              <span className="text-[11px] text-foreground/80 leading-tight">
                                {rec.text}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* === KOLOM 3: RISK METRICS & TIMERS === */}
                <div className="flex flex-col gap-3 justify-between">
                  <div
                    className="rounded p-2.5"
                    style={{
                      border: '1px solid rgba(249,115,22,0.2)',
                      background: 'rgba(249,115,22,0.03)',
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="text-[10px] font-bold tracking-[0.12em]"
                        style={{ color: '#f97316' }}
                      >
                        PERBURUKAN GLOBAL
                      </span>
                      <span className="text-[13px] font-bold" style={{ color: '#f97316' }}>
                        64%
                      </span>
                    </div>
                    <div className="h-[2px] rounded-full bg-muted/20">
                      <div
                        className="h-full rounded-full"
                        style={{ width: '64%', background: '#f97316' }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold tracking-[0.12em] text-muted uppercase block mb-2">
                      RISIKO SERANGAN AKUT 24J
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {ACUTE_RISKS.map((r) => (
                        <div key={r.label} className="flex items-center gap-2">
                          <span className="text-[11px] text-muted/80 flex-1 truncate">
                            {r.label}
                          </span>
                          <div className="w-16 h-1 rounded-full bg-muted/15">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${r.value}%`, background: riskBarColor(r.value) }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-bold w-6 text-right"
                            style={{ color: riskBarColor(r.value) }}
                          >
                            {r.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div
                      className="rounded p-2 flex flex-col justify-between"
                      style={{
                        border: '1px solid rgba(249,115,22,0.2)',
                        background: 'rgba(249,115,22,0.02)',
                      }}
                    >
                      <span className="text-[9px] font-bold text-accent/80 block mb-1.5">
                        WAKTU MENUJU KRITIS
                      </span>
                      <span className="text-[10px] text-foreground/90 font-medium">SBP ~4h</span>
                      <span className="text-[10px] text-foreground/90 font-medium">GDS ~6h</span>
                    </div>
                    <div className="flex flex-col gap-1 justify-between">
                      <div className="border border-muted/15 rounded p-1 flex justify-between items-center">
                        <span className="text-[9px] text-muted">KEYAKINAN</span>
                        <span className="text-[11px] font-bold">78%</span>
                      </div>
                      <div className="border border-muted/15 rounded p-1 flex justify-between items-center">
                        <span className="text-[9px] text-muted">VOLATILITAS</span>
                        <span className="text-[11px] font-bold">42</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Slide 2: Prognosis ─── */}
          {!trajectoryOnly && (
            <div className="min-w-full w-full min-w-0 overflow-hidden">
              <ClinicalPrognosis />
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══ Slide Navigation ═══ */}
      {!trajectoryOnly && (
        <div className="flex justify-center gap-3 mt-8">
          {SLIDE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setActiveSlide(i)}
              className={`text-[10px] uppercase tracking-[0.15em] px-5 py-2 rounded-full border transition-all duration-300 cursor-pointer ${
                i === activeSlide
                  ? 'bg-accent text-white border-accent'
                  : 'bg-transparent text-muted border-muted/30 hover:border-muted/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (hideHeader) {
    return (
      <div ref={sectionRef} data-theme="dark" className="w-full overflow-hidden">
        {renderContent()}
      </div>
    )
  }

  return (
    <section
      ref={sectionRef}
      data-theme="dark"
      className="py-8 border-b border-muted/20 overflow-hidden"
    >
      {renderContent()}
    </section>
  )
}
