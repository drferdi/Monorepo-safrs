'use client'

import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '@/components/shell/use-reduced-motion'
import {
  CORE_ROLES,
  DECISION_RIGHTS,
  EBITDA,
  FINANCE_CADENCE,
  FOUNDING_COMPACT,
  INDEPENDENT_PANEL,
  KBLI,
  LEGAL_ENTITY,
  OPERATING_RHYTHM,
  PRODUCTS,
  REPORTED_TOTAL_REVENUE,
  SAFE_PROFIT_PLAN,
  SCALE_PHASES,
  SOURCE_DOCUMENTS,
  TRANSITION_STEPS,
  YEARS,
} from '@/lib/hub/organisation'
import styles from './organisation.module.css'

type Section = 'structure' | 'decisions' | 'finance' | 'legal'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'structure', label: 'Struktur' },
  { key: 'decisions', label: 'Keputusan & ritme' },
  { key: 'finance', label: 'Keuangan' },
  { key: 'legal', label: 'Legal' },
]

const EASE_OUT = [0.23, 1, 0.32, 1] as const

const billions = (value: number) =>
  `Rp${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} miliar`
const millions = (value: number) => `Rp${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} juta`

export default function OrganisationTab() {
  const [section, setSection] = useState<Section>('structure')

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <p className={styles.kicker}>Operating charter · revisi 1.3</p>
        <h2 className={styles.lead}>Organisation by design</h2>
        <p className={styles.body}>
          Cara Sentra bekerja: manusia memimpin, AI membantu. Teknologi memperluas penilaian dan empati tim, sedangkan
          keputusan tetap diambil orang yang bertanggung jawab atasnya. Keberhasilan dibagi secara adil, dan kegagalan
          dipelajari bersama tanpa mencari kambing hitam.
        </p>
      </div>

      <div role="group" aria-label="Bagian organisasi" className={styles.sections}>
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="ui-chip"
            aria-pressed={section === item.key}
            onClick={() => setSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'structure' && <StructureSection />}
      {section === 'decisions' && <DecisionSection />}
      {section === 'finance' && <FinanceSection />}
      {section === 'legal' && <LegalSection />}
    </div>
  )
}

/* ── Struktur: the moving organisation map ── */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function StructureSection() {
  const [selected, setSelected] = useState(CORE_ROLES[0].id)
  const reduceMotion = useReducedMotion()
  const [mapRef, width] = useWidth<HTMLDivElement>()
  const founder = CORE_ROLES[0]
  const team = CORE_ROLES.slice(1)
  const person = CORE_ROLES.find((role) => role.id === selected) ?? founder
  const columnX = (i: number) => (width * (2 * i + 1)) / (2 * team.length)
  const branch = (i: number) => `M${width / 2} 0 V22 H${columnX(i)} V44`
  const lit = (i: number) => selected === founder.id || selected === team[i].id

  const chip = (role: (typeof CORE_ROLES)[number]) => (
    <button
      type="button"
      className="ui-chip"
      aria-pressed={selected === role.id}
      onClick={() => setSelected(role.id)}
    >
      {role.shortName}
    </button>
  )

  return (
    <div className={styles.stack}>
      <div className={`${styles.card} ${styles.mapCard}`}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Peta organisasi</h3>
          <span className={styles.caption}>Pilih nama untuk melihat tanggung jawab dan dukungan AI.</span>
        </div>

        <div className={styles.map} ref={mapRef}>
          <div className={styles.founderNode}>
            {chip(founder)}
            <span className={styles.caption}>{founder.tier}</span>
          </div>

          <svg className={`${styles.wires} ${styles.wiresTeam}`} viewBox={`0 0 ${width} 44`} aria-hidden>
            {width > 0 &&
              team.map((role, i) => (
                <motion.path
                  key={role.id}
                  d={branch(i)}
                  className={styles.wire}
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 + i * 0.06 }}
                />
              ))}
            {width > 0 &&
              team.map((role, i) =>
                lit(i) ? (
                  <motion.path
                    key={`${selected}-${role.id}`}
                    d={branch(i)}
                    className={styles.wireLit}
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  />
                ) : null
              )}
          </svg>

          <ul className={styles.teamRow}>
            {team.map((role) => (
              <li key={role.id} className={styles.teamNode}>
                {chip(role)}
                <span className={styles.caption}>
                  {role.tier} · {role.domain}
                </span>
              </li>
            ))}
          </ul>

          <svg className={`${styles.wires} ${styles.wiresAi}`} viewBox={`0 0 ${width} 28`} aria-hidden>
            {width > 0 &&
              team.map((role, i) => (
                <motion.path
                  key={role.id}
                  d={`M${columnX(i)} 0 V28`}
                  className={styles.wireAi}
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.5 + i * 0.06 }}
                />
              ))}
          </svg>

          <div className={styles.aiLayer}>
            Satu lapisan AI yang diatur membantu setiap fungsi, sebatas akses yang sudah disetujui.
          </div>
        </div>

        <div className={styles.detail} aria-live="polite">
          <div>
            <div className={styles.detailName}>{person.name}</div>
            <div className={styles.caption}>
              {person.tier} · {person.domain}
            </div>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Akuntabilitas</dt>
              <dd>{person.accountability}</dd>
            </div>
            <div>
              <dt>Dukungan AI</dt>
              <dd>{person.aiSupport}</dd>
            </div>
            <div>
              <dt>Hak keputusan</dt>
              <dd>{person.decides}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Nasihat & validasi independen</h3>
        <ul className={styles.panel}>
          {INDEPENDENT_PANEL.map((advisor) => (
            <li key={advisor.name} className={styles.panelItem}>
              <div className={styles.itemTitle}>{advisor.name}</div>
              <p className={styles.text}>{advisor.mandate}</p>
              <p className={styles.caption}>{advisor.boundary}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.grid4}>
        {FOUNDING_COMPACT.map((item) => (
          <div key={item.label} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.label}</h3>
            <p className={styles.text}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Keputusan & ritme ── */

function DecisionSection() {
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Hak keputusan</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tingkat</th>
                <th>Contoh</th>
                <th>Pemilik keputusan</th>
              </tr>
            </thead>
            <tbody>
              {DECISION_RIGHTS.map((row) => (
                <tr key={row.tier}>
                  <td className={styles.strong}>{row.tier}</td>
                  <td>{row.examples}</td>
                  <td>{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.grid4}>
        {OPERATING_RHYTHM.map((item) => (
          <div key={item.label} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.label}</h3>
            <p className={styles.text}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Arsitektur skala</h3>
        <ol className={styles.steps}>
          {SCALE_PHASES.map((phase) => (
            <li key={phase.phase} className={styles.step}>
              <div className={styles.stepHead}>
                <span className={styles.itemTitle}>{phase.phase}</span>
                <span className={styles.caption}>{phase.team}</span>
              </div>
              <p className={styles.text}>{phase.model}</p>
              <p className={styles.caption}>Didesain ulang bila: {phase.trigger}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/* ── Keuangan ── */

const REVENUE_MAX = 45
const REVENUE_TICKS = [0, 10, 20, 30, 40]

function FinanceSection() {
  const [hovered, setHovered] = useState<{ product: number; year: number } | null>(null)
  const readout = hovered
    ? `${PRODUCTS[hovered.product].name} ${YEARS[hovered.year]} · ${billions(PRODUCTS[hovered.product].revenue[hovered.year])}`
    : 'Arahkan ke kolom untuk melihat pendapatan per produk.'

  return (
    <div className={styles.stack}>
      <p className={styles.caption}>
        Angka Financial Architecture 2027–2030 adalah asumsi perencanaan. Angka ini bukan proyeksi, hasil audit,
        nasihat investasi, atau penawaran efek.
      </p>

      <div className={styles.grid4}>
        {PRODUCTS.map((product, i) => (
          <div key={product.id} className={`${styles.card} ${styles.rows3}`}>
            <div className={styles.legendHead}>
              <span className={`${styles.swatch} ${styles[`series${i + 1}`]}`} aria-hidden />
              <h3 className={styles.cardTitle}>{product.name}</h3>
            </div>
            <p className={styles.caption}>
              {product.pillar} · {product.model}
            </p>
            <p className={styles.text}>{product.role}</p>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Pendapatan per produk, skenario dasar</h3>
          <span className={styles.caption}>Rp miliar per tahun</span>
        </div>
        <ul className={styles.legend}>
          {PRODUCTS.map((product, i) => (
            <li key={product.id}>
              <span className={`${styles.swatch} ${styles[`series${i + 1}`]}`} aria-hidden />
              {product.name}
            </li>
          ))}
        </ul>
        <p className={styles.readout} aria-live="polite">
          {readout}
        </p>
        <div className={styles.plot}>
          {REVENUE_TICKS.map((tick) => (
            <div key={tick} className={styles.gridline} style={{ bottom: `${(tick / REVENUE_MAX) * 100}%` }}>
              <span>{tick}</span>
            </div>
          ))}
          <div className={styles.columns}>
            {YEARS.map((year, y) => (
              <div key={year} className={styles.band}>
                <span className={styles.total} style={{ bottom: `${(REPORTED_TOTAL_REVENUE[y] / REVENUE_MAX) * 100}%` }}>
                  {REPORTED_TOTAL_REVENUE[y].toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                </span>
                <div className={styles.column}>
                  {PRODUCTS.map((product, p) => (
                    <div
                      key={product.id}
                      role="img"
                      tabIndex={0}
                      aria-label={`${product.name} ${year}: ${billions(product.revenue[y])}`}
                      className={`${styles.block} ${styles[`series${p + 1}`]}${hovered && (hovered.product !== p || hovered.year !== y) ? ` ${styles.dim}` : ''}`}
                      style={{ height: `${(product.revenue[y] / REVENUE_MAX) * 100}%` }}
                      onMouseEnter={() => setHovered({ product: p, year: y })}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered({ product: p, year: y })}
                      onBlur={() => setHovered(null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.axis}>
          {YEARS.map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rp miliar</th>
                {YEARS.map((year) => (
                  <th key={year} className={styles.num}>
                    {year}
                  </th>
                ))}
                <th>Penggerak utama</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product) => (
                <tr key={product.id}>
                  <td className={styles.strong}>{product.name}</td>
                  {product.revenue.map((value, y) => (
                    <td key={YEARS[y]} className={styles.num}>
                      {value.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td>{product.driver}</td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td>Total pendapatan</td>
                {REPORTED_TOTAL_REVENUE.map((value, y) => (
                  <td key={YEARS[y]} className={styles.num}>
                    {value.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                  </td>
                ))}
                <td>Output model konsolidasi</td>
              </tr>
              <tr>
                <td>EBITDA konsolidasi</td>
                {EBITDA.map((value, y) => (
                  <td key={YEARS[y]} className={styles.num}>
                    {value < 0 ? '−' : ''}
                    {Math.abs(value).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                  </td>
                ))}
                <td>Rugi awal kumulatif {billions(-EBITDA.slice(0, 3).reduce((sum, v) => sum + v, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.caption}>
          EBITDA memang direncanakan negatif selama tahun investasi dan baru positif pada 2030. Rencana Safe
          Distributable Profit:{' '}
          {SAFE_PROFIT_PLAN.map((year) => `${year.year} ${millions(year.millions)}`).join(', ')}.
        </p>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Falsification gates 2027</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Gate 2027</th>
                <th>Bila gate gagal</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product) => (
                <tr key={product.id}>
                  <td className={styles.strong}>{product.name}</td>
                  <td>{product.gate}</td>
                  <td>{product.ifFails}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.grid3}>
        {FINANCE_CADENCE.map((item) => (
          <div key={item.label} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.label}</h3>
            <p className={styles.text}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Legal ── */

function LegalSection() {
  const facts = [
    { label: 'Nama', value: LEGAL_ENTITY.name },
    { label: 'Bentuk', value: LEGAL_ENTITY.form },
    { label: 'Pengesahan', value: `${LEGAL_ENTITY.decree}, ${LEGAL_ENTITY.ratified}` },
    { label: 'Kedudukan', value: LEGAL_ENTITY.domicile },
    { label: 'Modal usaha', value: LEGAL_ENTITY.capital },
  ]

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Badan hukum</h3>
          <span className={styles.caption}>{LEGAL_ENTITY.decreeTitle}</span>
        </div>
        <dl className={styles.entity}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Kegiatan usaha</h3>
        <ul className={styles.codes}>
          {KBLI.map((item) => (
            <li key={item.code}>
              <span className={styles.code}>{item.code}</span>
              <span className={styles.text}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Transisi legal korporasi</h3>
          <span className={styles.caption}>Enam gate. Tanggal efektif tidak ditentukan dari kalender saja.</span>
        </div>
        <ol className={styles.timeline}>
          {TRANSITION_STEPS.map((step) => (
            <li key={step.gate} className={styles.timelineItem}>
              <span className={styles.gate}>{step.gate}</span>
              <div>
                <div className={styles.itemTitle}>
                  {step.phase === step.name ? step.name : `${step.name} · ${step.phase}`}
                </div>
                <p className={styles.text}>{step.purpose}</p>
                <p className={styles.caption}>
                  {step.timing} · keputusan: {step.decision}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Dokumen sumber</h3>
        <ul className={styles.codes}>
          {SOURCE_DOCUMENTS.map((doc) => (
            <li key={doc.code}>
              <span className={styles.code}>{doc.code}</span>
              <span className={styles.text}>
                {doc.title} <span className={styles.caption}>· {doc.revision}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
