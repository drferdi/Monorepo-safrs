'use client'

import { Reset, Search } from '@carbon/icons-react'
import { Button, Column, Grid, InlineNotification } from '@carbon/react'
import { useRef, useState } from 'react'

import {
  ChiefComplaintCard,
  type ChiefComplaintData,
} from '../components/medlink/chief-complaint-card'
import { ClinicalLabsCard, type LabValue } from '../components/medlink/clinical-labs-card'
import { ClinicalReasoningStream } from '../components/medlink/clinical-reasoning-stream'
import {
  DifferentialDiagnosisCard,
  type Diagnosis,
} from '../components/medlink/differential-diagnosis-card'
import { ReferralMappingCard } from '../components/medlink/referral-mapping-card'
import { TechnicalDetailsCard } from '../components/medlink/technical-details-card'
import { searchICD10Code } from '../services/diagnosisApiClient'
import {
  buildCompletedLogbookRecord,
  buildFailedLogbookRecord,
} from '../services/logbookRecordFactory'
import { logbookRepository } from '../services/logbookRepository'
import type { ICD10Result, MedicalQuery, ProposedReferral } from '../types'

type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

function toUrgencyLevel(urgency?: string): Diagnosis['urgency'] {
  const normalized = urgency?.toLowerCase()
  if (normalized === 'emergency' || normalized === 'high') return 'high'
  if (normalized === 'urgent' || normalized === 'semi_urgent' || normalized === 'moderate')
    return 'moderate'
  return 'low'
}

function compactList(values: Array<string | undefined | null>) {
  return values.filter((value): value is string => Boolean(value?.trim()))
}

function splitQueryToSignals(query: string) {
  return query
    .split(/[,\n.]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function buildDiagnoses(result: ICD10Result | null): Diagnosis[] {
  if (!result) return []

  const primary: Diagnosis = {
    id: 'primary-diagnosis',
    name: result.description,
    code: result.code,
    confidence: result.triage_score,
    urgency: toUrgencyLevel(result.urgency),
    supportingSignals: result.evidence.red_flags,
    contextTags: compactList([
      result.category,
      `Triage ${result.triage_score}/10`,
      `Schema v${result.schema_version}`,
    ]),
    justification: result.evidence.clinical_reasoning || result.clinical_notes,
  }

  const referrals = result.proposed_referrals.map((item: ProposedReferral, index) => ({
    id: `referral-${index}`,
    name: item.description,
    code: item.code,
    urgency: toUrgencyLevel(item.urgency),
    supportingSignals: result.evidence.red_flags,
    contextTags: compactList([
      `Kompetensi ${item.kompetensi}`,
      item.destination_service,
      item.facility_level,
    ]),
    justification: item.clinical_reasoning,
  }))

  return [primary, ...referrals]
}

function buildChiefComplaint(query: string, result: ICD10Result): ChiefComplaintData {
  return {
    mainComplaint: query,
    symptoms: result.evidence.red_flags.length
      ? result.evidence.red_flags.slice(0, 5)
      : splitQueryToSignals(query),
    timeline: result.clinical_notes,
    riskFactors: compactList([
      result.category,
      result.urgency,
      `Triage ${result.triage_score}/10`,
      'Human review required',
    ]),
  }
}

function buildEvidenceCard(result: ICD10Result): {
  physicalExam: string[]
  labValues: LabValue[]
  imagingSummary: string
} {
  const physicalExam = compactList([
    result.clinical_notes,
    result.evidence.clinical_reasoning,
    ...result.evidence.differential_diagnosis.slice(0, 2),
  ])
  return {
    physicalExam,
    labValues: [
      {
        name: 'Urgency',
        value: result.urgency,
        unit: '',
        normal: 'Routine to emergency',
        status:
          result.urgency === 'emergency' ? 'high' : result.urgency === 'urgent' ? 'low' : 'normal',
      },
      {
        name: 'Triage score',
        value: String(result.triage_score),
        unit: '/10',
        normal: '1-10',
        status: result.triage_score >= 7 ? 'high' : result.triage_score >= 4 ? 'normal' : 'low',
      },
      {
        name: 'Schema',
        value: `v${result.schema_version}`,
        unit: '',
        normal: 'Current validated contract',
        status: 'normal',
      },
    ],
    imagingSummary: result.evidence.clinical_reasoning,
  }
}

const statusCopy: Record<RequestStatus, { title: string; description: string }> = {
  idle: {
    title: 'Siap untuk analisis',
    description:
      'Masukkan konteks klinis untuk menghasilkan kandidat referral dan evidence yang tersedia.',
  },
  loading: {
    title: 'Analysis in progress',
    description: 'MEDLINK sedang memvalidasi diagnosis, safety signal, dan kebutuhan rujukan.',
  },
  success: {
    title: 'Analysis available',
    description:
      'Hasil tervalidasi tersedia untuk ditinjau dan tidak menggantikan keputusan klinis.',
  },
  error: {
    title: 'Request needs attention',
    description: 'MEDLINK belum dapat menyelesaikan request. Tinjau pesan dan coba kembali.',
  },
}

function RequestTrace({ logs }: { logs: string[] }) {
  return (
    <details className="medlink-request-trace">
      <summary>Request trace</summary>
      <ol>
        {logs.map((log, index) => (
          <li key={`${index}-${log}`}>{log}</li>
        ))}
      </ol>
    </details>
  )
}

export default function MedLinkDashboard() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('idle')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestLogs, setRequestLogs] = useState<string[]>([])
  const [result, setResult] = useState<ICD10Result | null>(null)
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string>()
  const requestSequence = useRef(0)

  const diagnoses = buildDiagnoses(result)
  const selectedDiagnosis =
    diagnoses.find((item) => item.id === selectedDiagnosisId) || diagnoses[0]
  const status = statusCopy[requestStatus]

  const resetWorkspace = () => {
    requestSequence.current += 1
    setQuery('')
    setSubmittedQuery('')
    setRequestStatus('idle')
    setRequestError(null)
    setRequestLogs([])
    setResult(null)
    setSelectedDiagnosisId(undefined)
  }

  const handleSubmit = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setRequestStatus('error')
      setRequestError('Masukkan konteks klinis terlebih dahulu sebelum meminta analisis.')
      setRequestLogs([])
      setResult(null)
      setSelectedDiagnosisId(undefined)
      return
    }

    const sequence = requestSequence.current + 1
    requestSequence.current = sequence
    setRequestStatus('loading')
    setRequestLogs([])
    setResult(null)
    setSelectedDiagnosisId(undefined)
    setRequestError(null)

    const payload: MedicalQuery = {
      id: `medlink-${Date.now()}`,
      query: trimmedQuery,
      timestamp: Date.now(),
    }
    const startedAt = performance.now()
    const response = await searchICD10Code(payload, 'OPENAI_GPT_56_LUNA')
    if (sequence !== requestSequence.current) return

    setRequestLogs(response.logs)
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt))
    const createdAt = new Date().toISOString()
    if (!response.json) {
      const errorMessage =
        response.logs[1]?.replace('[Detail] ', '') || 'MEDLINK tidak menerima hasil tervalidasi.'
      void logbookRepository.put(
        buildFailedLogbookRecord({
          id: payload.id,
          createdAt,
          durationMs,
          failureCode: response.failureCode ?? 'unknown',
        })
      )
      setRequestStatus('error')
      setRequestError(errorMessage)
      return
    }

    void logbookRepository.put(
      buildCompletedLogbookRecord({
        id: payload.id,
        createdAt,
        durationMs,
        outcome: response.json,
      })
    )
    const nextDiagnoses = buildDiagnoses(response.json)
    setSubmittedQuery(trimmedQuery)
    setResult(response.json)
    setSelectedDiagnosisId(nextDiagnoses[0]?.id)
    setRequestStatus('success')
  }

  return (
    <main id="main-content" className="page-main medlink-workspace db01-workspace">
      <header className="medlink-workspace__topbar">
        <span className="medlink-workspace__topbar-mark" aria-hidden="true">
          ✚
        </span>
        <span>
          Dukungan keputusan klinis untuk eksplorasi diagnosis banding, pemetaan ICD-10, dan
          pertimbangan rujukan berdasarkan konteks pasien.
        </span>
      </header>

      <div className="medlink-workspace__content">
        <section className="medlink-workspace__intro">
          <div className="medlink-workspace__intro-heading">
            <h1>MedLink</h1>
            <span>Evidence-aware · Safety-first · Clinician-controlled</span>
          </div>
          <p>Temukan kode ICD-10 dan dukungan peninjauan status rujukan BPJS Kesehatan.</p>
        </section>

        <section
          id="diagnosis-finder"
          className="medlink-workspace__section medlink-workspace__section--query"
        >
          <div className="medlink-query-layout">
            <div className="medlink-query-panel">
              <div className="medlink-panel__heading">
                <div>
                  <p className="medlink-panel__label">Diagnosis finder</p>
                  <h2>Cari diagnosis atau gejala</h2>
                </div>
                <span className="medlink-panel__hint">Narasi terstruktur didukung</span>
              </div>
              <label className="medlink-query-panel__label" htmlFor="medlink-clinical-query">
                Ketik nama penyakit atau gejala
              </label>
              <textarea
                id="medlink-clinical-query"
                className="medlink-query-panel__input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Contoh: Pasien laki-laki, 58 tahun, datang dengan nyeri dada akut, sesak, dan keringat dingin. Riwayat hipertensi. Mohon identifikasi diagnosis banding, red flags, kode ICD-10 yang relevan, dan pertimbangan rujukan."
                disabled={requestStatus === 'loading'}
                rows={3}
              />
              <div className="medlink-query-panel__actions">
                <Button
                  className="medlink-query-panel__submit"
                  type="button"
                  size="md"
                  renderIcon={Search}
                  onClick={handleSubmit}
                  disabled={requestStatus === 'loading'}
                >
                  {requestStatus === 'loading' ? 'Menganalisis...' : 'Cari'}
                </Button>
                <Button
                  className="medlink-query-panel__reset"
                  type="button"
                  size="md"
                  kind="tertiary"
                  renderIcon={Reset}
                  onClick={resetWorkspace}
                  disabled={requestStatus === 'loading'}
                >
                  Bersihkan ruang kerja
                </Button>
              </div>
            </div>

            <aside className={`medlink-status medlink-status--${requestStatus}`}>
              <div className="medlink-status__topline">
                <span className="medlink-status__dot" aria-hidden="true" />
                <p>Sentra network status</p>
              </div>
              <h2>{status.title}</h2>
              <p>{status.description}</p>
              <div className="medlink-status__footer">
                <span>Active engine</span>
                <strong>MEDLINK</strong>
              </div>
              {requestStatus === 'success' && requestLogs.length > 0 ? (
                <RequestTrace logs={requestLogs} />
              ) : null}
            </aside>
          </div>

          <ClinicalReasoningStream phase={requestStatus} result={result} />

          {requestStatus === 'error' && requestError ? (
            <InlineNotification
              className="medlink-request-error"
              kind="error"
              lowContrast
              hideCloseButton
              title="Analisis tidak tersedia"
              subtitle={requestError}
            />
          ) : null}
          {requestStatus === 'error' && requestLogs.length > 0 ? (
            <RequestTrace logs={requestLogs} />
          ) : null}
        </section>

        {result ? (
          <>
            <section
              className="medlink-workspace__section medlink-workspace__section--result"
              aria-labelledby="analysis-result-title"
            >
              <div className="medlink-workspace__section-heading">
                <div>
                  <p className="medlink-workspace__eyebrow">Decision support</p>
                  <h2 id="analysis-result-title">Referral analysis</h2>
                </div>
                <p>Validated output · clinician review required</p>
              </div>
              <Grid className="medlink-result-layout">
                <Column sm={4} md={4} lg={8}>
                  <DifferentialDiagnosisCard
                    diagnoses={diagnoses}
                    selectedId={selectedDiagnosis?.id}
                    onSelect={(diagnosis) => setSelectedDiagnosisId(diagnosis.id)}
                  />
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <ReferralMappingCard result={result} selectedDiagnosis={selectedDiagnosis} />
                </Column>
              </Grid>
            </section>

            <section className="medlink-workspace__section medlink-workspace__section--supporting">
              <div className="medlink-workspace__section-heading">
                <div>
                  <p className="medlink-workspace__eyebrow">Supporting context</p>
                  <h2>Clinical review context</h2>
                </div>
              </div>
              <Grid>
                <Column sm={4} md={4} lg={8}>
                  <ChiefComplaintCard
                    data={buildChiefComplaint(result ? submittedQuery : query, result)}
                  />
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <ClinicalLabsCard {...buildEvidenceCard(result)} />
                </Column>
              </Grid>
            </section>

            <section className="medlink-workspace__section medlink-workspace__section--technical">
              <TechnicalDetailsCard />
            </section>
          </>
        ) : null}

        <footer className="medlink-workspace__footer">
          MedLink merupakan sistem pendukung keputusan klinis dan tidak menggantikan penilaian,
          pemeriksaan, maupun keputusan tenaga medis. Seluruh hasil harus diverifikasi berdasarkan
          kondisi pasien dan kewenangan klinisi yang bertanggung jawab.
        </footer>
      </div>
    </main>
  )
}
