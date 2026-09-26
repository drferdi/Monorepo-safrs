import 'server-only'

import { type NextRequest } from 'next/server'

import fs from 'node:fs'
import path from 'node:path'

import { calculateNEWS2 } from '@/lib/cdss/news2'
import { emitTriageData } from '@/lib/emr/socket-bridge'
import { normalizeScrapedVisitHistory } from '@/lib/emr/visit-history'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { evaluateCompositeDeteriorationFromEmrPayload } from '@/lib/vitals/composite-deterioration'
import { type StructuredTriageSigns } from '@/lib/vitals/instant-red-alerts'
import { toCDSSVitalSigns, triageVitalSignsSchema } from '@/lib/vitals/unified-vitals'
import {
  buildPatientIdentifierFromRM,
  buildPatientIdentifierHash,
  persistVitalRecord,
} from '@/lib/vitals/vital-record-service'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'POST', 'OPTIONS'] as const

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req, CORS_METHODS)
}

const SYNC_DIR = path.join(process.cwd(), 'runtime', 'patient-sync')

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return undefined
    const parsed = Number.parseFloat(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'ya'].includes(normalized)) return true
    if (['false', '0', 'no', 'tidak'].includes(normalized)) return false
  }
  return undefined
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeAVPU(value: unknown): 'A' | 'C' | 'V' | 'P' | 'U' | undefined {
  const normalized = toOptionalString(value)?.toUpperCase()
  return normalized && ['A', 'C', 'V', 'P', 'U'].includes(normalized)
    ? (normalized as 'A' | 'C' | 'V' | 'P' | 'U')
    : undefined
}

function getGCSTotal(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return toFiniteNumber(value)
  const record = value as Record<string, unknown>
  const e = toFiniteNumber(record.e)
  const v = toFiniteNumber(record.v)
  const m = toFiniteNumber(record.m)
  if (e === undefined || v === undefined || m === undefined) return undefined
  return e + v + m
}

function normalizePatientIdentifier(patient: Record<string, unknown>): string | null {
  const rm =
    toOptionalString(patient.rm) ??
    toOptionalString(patient.noRm) ??
    toOptionalString(patient.nomor_rm) ??
    toOptionalString(patient.medicalRecordNumber)
  const name = toOptionalString(patient.name) ?? toOptionalString(patient.nama)
  const dob =
    toOptionalString(patient.dob) ??
    toOptionalString(patient.dateOfBirth) ??
    toOptionalString(patient.tanggalLahir)

  if (rm && name && dob) return buildPatientIdentifierHash(rm, name, dob)
  if (rm) return buildPatientIdentifierFromRM(rm)
  return null
}

function normalizeStructuredSignsPayload(
  body: Record<string, unknown>,
  patient: Record<string, unknown>,
  vitals: Record<string, unknown>
): StructuredTriageSigns | undefined {
  const narrative = readRecord(body.narrative)
  const root = readRecord(body.structuredSigns)
  const narrativeStructured = readRecord(narrative.structuredSigns)
  const vitalStructured = readRecord(vitals.structuredSigns)
  const patientStructured = readRecord(patient.structuredSigns)

  const signs: StructuredTriageSigns = {
    respiratoryDistress: {
      accessoryMuscleUse: toOptionalBoolean(
        root.respiratoryDistressAccessoryMuscleUse ??
          readRecord(root.respiratoryDistress).accessoryMuscleUse ??
          readRecord(narrativeStructured.respiratoryDistress).accessoryMuscleUse ??
          readRecord(vitalStructured.respiratoryDistress).accessoryMuscleUse ??
          vitals.accessoryMuscleUse
      ),
      retractions: toOptionalBoolean(
        readRecord(root.respiratoryDistress).retractions ??
          readRecord(narrativeStructured.respiratoryDistress).retractions ??
          readRecord(vitalStructured.respiratoryDistress).retractions ??
          vitals.retractions
      ),
      unableToSpeakFullSentences: toOptionalBoolean(
        readRecord(root.respiratoryDistress).unableToSpeakFullSentences ??
          readRecord(narrativeStructured.respiratoryDistress).unableToSpeakFullSentences ??
          readRecord(vitalStructured.respiratoryDistress).unableToSpeakFullSentences ??
          narrative.unableToSpeakFullSentences
      ),
      cyanosis: toOptionalBoolean(
        readRecord(root.respiratoryDistress).cyanosis ??
          readRecord(narrativeStructured.respiratoryDistress).cyanosis ??
          readRecord(vitalStructured.respiratoryDistress).cyanosis ??
          vitals.cyanosis
      ),
      distressObserved: toOptionalBoolean(
        readRecord(root.respiratoryDistress).distressObserved ??
          readRecord(narrativeStructured.respiratoryDistress).distressObserved ??
          readRecord(vitalStructured.respiratoryDistress).distressObserved ??
          narrative.distressObserved
      ),
    },
    hmod: {
      chest_pain: toOptionalBoolean(
        readRecord(root.hmod).chest_pain ??
          readRecord(root.hmod).chestPain ??
          readRecord(narrativeStructured.hmod).chest_pain ??
          narrative.chestPain
      ),
      pulmonary_edema: toOptionalBoolean(
        readRecord(root.hmod).pulmonary_edema ??
          readRecord(root.hmod).pulmonaryEdema ??
          readRecord(narrativeStructured.hmod).pulmonary_edema ??
          narrative.pulmonaryEdema
      ),
      neurological_deficit: toOptionalBoolean(
        readRecord(root.hmod).neurological_deficit ??
          readRecord(root.hmod).neurologicalDeficit ??
          readRecord(narrativeStructured.hmod).neurological_deficit ??
          narrative.neurologicalDeficit
      ),
      vision_changes: toOptionalBoolean(
        readRecord(root.hmod).vision_changes ??
          readRecord(root.hmod).visionChanges ??
          readRecord(narrativeStructured.hmod).vision_changes ??
          narrative.visionChanges
      ),
      severe_headache: toOptionalBoolean(
        readRecord(root.hmod).severe_headache ??
          readRecord(root.hmod).severeHeadache ??
          readRecord(narrativeStructured.hmod).severe_headache ??
          narrative.severeHeadache
      ),
      oliguria: toOptionalBoolean(
        readRecord(root.hmod).oliguria ??
          readRecord(narrativeStructured.hmod).oliguria ??
          narrative.oliguria
      ),
      altered_mental_status: toOptionalBoolean(
        readRecord(root.hmod).altered_mental_status ??
          readRecord(root.hmod).alteredMentalStatus ??
          readRecord(narrativeStructured.hmod).altered_mental_status ??
          narrative.alteredMentalStatus
      ),
    },
    dkaHhs: {
      kussmaul_breathing: toOptionalBoolean(
        readRecord(root.dkaHhs).kussmaul_breathing ??
          readRecord(root.dkaHhs).kussmaulBreathing ??
          readRecord(narrativeStructured.dkaHhs).kussmaul_breathing ??
          vitals.kussmaulBreathing
      ),
      acetone_breath: toOptionalBoolean(
        readRecord(root.dkaHhs).acetone_breath ??
          readRecord(root.dkaHhs).acetoneBreath ??
          readRecord(narrativeStructured.dkaHhs).acetone_breath ??
          narrative.acetoneBreath
      ),
      nausea_vomiting: toOptionalBoolean(
        readRecord(root.dkaHhs).nausea_vomiting ??
          readRecord(root.dkaHhs).nauseaVomiting ??
          readRecord(narrativeStructured.dkaHhs).nausea_vomiting ??
          narrative.nauseaVomiting
      ),
      abdominal_pain: toOptionalBoolean(
        readRecord(root.dkaHhs).abdominal_pain ??
          readRecord(root.dkaHhs).abdominalPain ??
          readRecord(narrativeStructured.dkaHhs).abdominal_pain ??
          narrative.abdominalPain
      ),
      altered_mental_status: toOptionalBoolean(
        readRecord(root.dkaHhs).altered_mental_status ??
          readRecord(root.dkaHhs).alteredMentalStatus ??
          readRecord(narrativeStructured.dkaHhs).altered_mental_status ??
          narrative.alteredMentalStatus
      ),
      severe_dehydration: toOptionalBoolean(
        readRecord(root.dkaHhs).severe_dehydration ??
          readRecord(root.dkaHhs).severeDehydration ??
          readRecord(narrativeStructured.dkaHhs).severe_dehydration ??
          narrative.severeDehydration
      ),
      extreme_hyperglycemia: toOptionalBoolean(
        readRecord(root.dkaHhs).extreme_hyperglycemia ??
          readRecord(root.dkaHhs).extremeHyperglycemia ??
          readRecord(narrativeStructured.dkaHhs).extreme_hyperglycemia
      ),
      seizures: toOptionalBoolean(
        readRecord(root.dkaHhs).seizures ??
          readRecord(narrativeStructured.dkaHhs).seizures ??
          narrative.seizures
      ),
    },
    perfusionShock: {
      dizziness: toOptionalBoolean(
        readRecord(root.perfusionShock).dizziness ??
          readRecord(narrativeStructured.perfusionShock).dizziness ??
          narrative.dizziness
      ),
      presyncope: toOptionalBoolean(
        readRecord(root.perfusionShock).presyncope ??
          readRecord(narrativeStructured.perfusionShock).presyncope ??
          narrative.presyncope
      ),
      syncope: toOptionalBoolean(
        readRecord(root.perfusionShock).syncope ??
          readRecord(narrativeStructured.perfusionShock).syncope ??
          narrative.syncope
      ),
      weakness: toOptionalBoolean(
        readRecord(root.perfusionShock).weakness ??
          readRecord(narrativeStructured.perfusionShock).weakness ??
          narrative.weakness
      ),
      clammySkin: toOptionalBoolean(
        readRecord(root.perfusionShock).clammySkin ??
          readRecord(narrativeStructured.perfusionShock).clammySkin ??
          narrative.clammySkin
      ),
      coldExtremities: toOptionalBoolean(
        readRecord(root.perfusionShock).coldExtremities ??
          readRecord(narrativeStructured.perfusionShock).coldExtremities ??
          narrative.coldExtremities
      ),
      oliguria: toOptionalBoolean(
        readRecord(root.perfusionShock).oliguria ??
          readRecord(narrativeStructured.perfusionShock).oliguria ??
          narrative.oliguria
      ),
      capillaryRefillSec: toFiniteNumber(
        readRecord(root.perfusionShock).capillaryRefillSec ??
          readRecord(narrativeStructured.perfusionShock).capillaryRefillSec ??
          vitals.capillaryRefillSec
      ),
    },
  }

  const hasAnySign = JSON.stringify(signs).match(/true|\d/) !== null
  if (hasAnySign) return signs

  const patientSigns = readRecord(patientStructured)
  if (Object.keys(patientSigns).length > 0) return patientSigns as StructuredTriageSigns
  return undefined
}

function normalizeTriageVitals(
  vitals: Record<string, unknown>,
  patient: Record<string, unknown>,
  measuredAtIso: string
) {
  const candidate = {
    sbp: toFiniteNumber(vitals.sbp),
    dbp: toFiniteNumber(vitals.dbp),
    hr: toFiniteNumber(vitals.hr),
    rr: toFiniteNumber(vitals.rr),
    temp: toFiniteNumber(vitals.temp),
    spo2: toFiniteNumber(vitals.spo2),
    avpu: normalizeAVPU(vitals.avpu) ?? 'A',
    supplementalO2: Boolean(vitals.supplementalO2),
    painScore: toFiniteNumber(vitals.painScore),
    glucose:
      toFiniteNumber(vitals.glucose) !== undefined
        ? {
            value: toFiniteNumber(vitals.glucose),
            type: 'GDS' as const,
          }
        : undefined,
    isPregnant: Boolean(patient.isPregnant ?? vitals.isPregnant),
    gestationalWeek:
      toFiniteNumber(patient.gestationalWeek) ?? toFiniteNumber(vitals.gestationalWeek),
    hasCOPD: Boolean(patient.hasCOPD ?? vitals.hasCOPD),
    measurementTime: measuredAtIso,
  }

  const result = triageVitalSignsSchema.safeParse(candidate)
  return result.success ? result.data : null
}

/**
 * Relay triase Assist untuk asupan EMR dashboard
 * @summary Sinkronisasi payload triase dari asupan hulu ke alur EMR dashboard
 * @description Menerima identitas pasien, tanda vital, konteks triase naratif, dan observasi structuredSigns opsional. Rute ini menghitung peringatan skrining, menyimpan tanda vital yang dinormalisasi jika memungkinkan, dan meneruskan payload ke antarmuka EMR yang menghadap dokter.
 * @security crewAccessToken
 *
 * @bodyParam {object} patient - Payload demografi pasien dan identitas triase. Harus menyertakan RM atau pengidentifikasi pendaftaran yang setara jika tersedia.
 * @bodyParam {object} vitals - Tanda vital triase terstruktur seperti sbp, dbp, hr, rr, temp, spo2, avpu, gcs, glucose, supplementalO2, dan konteks kehamilan.
 * @bodyParam {object} narrative - Narasi triase teks bebas termasuk keluhan_utama, keluhan_tambahan, dan nilai cermin structuredSigns opsional (opsional).
 * @bodyParam {array} medicalHistory - Penyakit kronis yang diketahui atau diagnosis sebelumnya yang relevan (opsional).
 * @bodyParam {array} visitHistory - Snapshot kunjungan sebelumnya yang dinormalisasi untuk timeline dokter (opsional).
 * @bodyParam {object} structuredSigns - Observasi samping tempat tidur kelas satu opsional yang dikelompokkan ke dalam respiratoryDistress, hmod, dkaHhs, dan perfusionShock (opsional).
 *
 * @example {
 *   "patient": {
 *     "name": "Pasien Triage Demo",
 *     "rm": "RM-2026-0007",
 *     "dob": "1988-07-11",
 *     "age": 37,
 *     "gender": "P",
 *     "isPregnant": false
 *   },
 *   "vitals": {
 *     "sbp": 86,
 *     "dbp": 54,
 *     "hr": 128,
 *     "rr": 30,
 *     "temp": 38.6,
 *     "spo2": 89,
 *     "avpu": "V",
 *     "glucose": 312,
 *     "supplementalO2": true
 *   },
 *   "narrative": {
 *     "keluhan_utama": "Sesak napas dan lemas sejak pagi.",
 *     "keluhan_tambahan": "Mual, muntah, dan berdebar."
 *   },
 *   "structuredSigns": {
 *     "respiratoryDistress": {
 *       "accessoryMuscleUse": true,
 *       "retractions": true,
 *       "unableToSpeakFullSentences": true,
 *       "cyanosis": false,
 *       "distressObserved": true
 *     },
 *     "hmod": {
 *       "chest_pain": false,
 *       "pulmonary_edema": false,
 *       "neurological_deficit": false,
 *       "vision_changes": false,
 *       "severe_headache": false,
 *       "oliguria": true,
 *       "altered_mental_status": true
 *     },
 *     "dkaHhs": {
 *       "kussmaul_breathing": true,
 *       "acetone_breath": false,
 *       "nausea_vomiting": true,
 *       "abdominal_pain": false,
 *       "altered_mental_status": true,
 *       "severe_dehydration": true,
 *       "extreme_hyperglycemia": true,
 *       "seizures": false
 *     },
 *     "perfusionShock": {
 *       "dizziness": true,
 *       "presyncope": true,
 *       "syncope": false,
 *       "weakness": true,
 *       "clammySkin": true,
 *       "coldExtremities": true,
 *       "oliguria": true,
 *       "capillaryRefillSec": 4
 *     }
 *   }
 * }
 *
 * @responseBody {object} - Pengakuan relay dengan sync id yang dihasilkan dan nama file yang disimpan saat diterima.
 */
export async function POST(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return jsonWithCors(
        req,
        CORS_METHODS,
        { ok: false, error: 'Invalid payload' },
        { status: 400 }
      )
    }

    const visitHistory = normalizeScrapedVisitHistory(body.visitHistory)
    const patient =
      body.patient && typeof body.patient === 'object'
        ? (body.patient as Record<string, unknown>)
        : null
    const rawVitals =
      body.vitals && typeof body.vitals === 'object'
        ? (body.vitals as Record<string, unknown>)
        : null

    if (!patient || !rawVitals) {
      return jsonWithCors(
        req,
        CORS_METHODS,
        { ok: false, error: 'Missing patient or vitals data' },
        { status: 400 }
      )
    }

    // Ensure sync directory exists
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true })
    }

    // Save to file
    const now = new Date()
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const patientName = (body.patient.name || body.patient.nama || 'unknown')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 30)
    const filename = `${ts}_${patientName}.json`

    const entry = {
      id: `sync-${Date.now()}`,
      receivedAt: now.toISOString(),
      source: 'assist-extension',
      patient: body.patient,
      vitals: body.vitals,
      narrative: body.narrative || {},
      visitHistory,
      medicalHistory: body.medicalHistory || [],
    }

    fs.writeFileSync(path.join(SYNC_DIR, filename), JSON.stringify(entry, null, 2), 'utf-8')

    // Map vitals from Assist format → EMR form format
    const v = rawVitals
    const td = v.sbp && v.dbp ? `${v.sbp}/${v.dbp}` : ''
    const structuredSigns = normalizeStructuredSignsPayload(body, patient, v)
    const triageContext = {
      avpu: normalizeAVPU(v.avpu),
      gcsTotal: getGCSTotal(v.gcs) ?? 15,
      supplementalO2: Boolean(v.supplementalO2),
      hasCOPD: Boolean(v.hasCOPD ?? patient.hasCOPD),
      isPregnant: Boolean(patient.isPregnant ?? v.isPregnant),
      gestationalWeek: toFiniteNumber(patient.gestationalWeek) ?? toFiniteNumber(v.gestationalWeek),
      patientAgeMonths:
        toFiniteNumber(patient.ageMonths) ?? toFiniteNumber(patient.patientAgeMonths),
      structuredSigns,
    }

    const emrPayload: Record<string, unknown> = {
      keluhanUtama: body.narrative?.keluhan_utama || '',
      keluhanTambahan: body.narrative?.keluhan_tambahan || '',
      vitals: {
        td,
        nadi: v.hr || '',
        napas: v.rr || '',
        suhu: v.temp || '',
        spo2: v.spo2 || '',
        gcs: String(triageContext.gcsTotal ?? 15),
        map: '',
      },
      gulaDarah: v.glucose ? { nilai: v.glucose, tipe: 'GDS' } : undefined,
      patientAge: patient.age || 0,
      patientGender: patient.gender || 'L',
      patientName: patient.name || patient.nama || '',
      visitHistory,
      medicalHistory: body.medicalHistory || [],
      triageContext,
      structuredSigns,
      isPregnant: triageContext.isPregnant,
    }

    const compositeDeterioration = evaluateCompositeDeteriorationFromEmrPayload(emrPayload)
    const screeningAlerts = compositeDeterioration.screeningAlerts
    emrPayload.screeningAlerts = screeningAlerts
    emrPayload.compositeDeterioration = compositeDeterioration

    // Emit to EMR page via Socket.IO — same format as emr:triage-receive
    emitTriageData(emrPayload)

    const normalizedVitals = normalizeTriageVitals(v, patient, now.toISOString())
    const patientIdentifier = normalizePatientIdentifier(patient)
    if (normalizedVitals && patientIdentifier) {
      const news2 = calculateNEWS2({
        vitals: toCDSSVitalSigns(normalizedVitals),
        avpu: normalizedVitals.avpu,
        supplementalO2: normalizedVitals.supplementalO2,
        hasCOPD: normalizedVitals.hasCOPD,
      })

      void persistVitalRecord({
        patientIdentifier,
        vitals: normalizedVitals,
        news2Score: news2.aggregate_score,
        news2Risk: news2.risk_level,
        flags: screeningAlerts.map((alert) => ({
          severity:
            alert.severity === 'critical'
              ? 'emergency'
              : alert.severity === 'high'
                ? 'urgent'
                : 'warning',
          condition: alert.title,
        })),
        recordedAt: normalizedVitals.measurementTime ?? now.toISOString(),
      }).then((result) => {
        if (!result.success) {
          console.error('[PatientSync] Vital record persist failed:', result.error)
        }
      })
    }


    return jsonWithCors(req, CORS_METHODS, {
      ok: true,
      id: entry.id,
      filename,
      screeningAlertCount: screeningAlerts.length,
      compositeAlertCount: compositeDeterioration.compositeAlerts.length,
      watcherCount: compositeDeterioration.watchers.length,
    })
  } catch (err) {
    console.error('[PatientSync] Error:', err)
    return jsonWithCors(
      req,
      CORS_METHODS,
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Tinjau payload triase yang baru disinkronkan
 * @summary Daftar file relay patient-sync yang disimpan
 * @description Mengembalikan metadata payload relay terbaru untuk ditinjau oleh dokter, termasuk nama tampilan pasien, stempel waktu receivedAt, jumlah kunjungan, dan snapshot tanda vital terperinci.
 * @security crewAccessToken
 * @headerParam {string} X-Crew-Access-Token - Token otomatisasi yang diberikan kepada klien relay hulu yang tepercaya.
 *
 * @responseBody {object} - JSON berisi item, jumlah (count), dan status ok.
 */
export async function GET(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return jsonWithCors(req, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!fs.existsSync(SYNC_DIR)) {
      return jsonWithCors(req, CORS_METHODS, { ok: true, items: [], count: 0 })
    }

    const files = fs
      .readdirSync(SYNC_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()

    const items = files.map((f) => {
      const content = JSON.parse(fs.readFileSync(path.join(SYNC_DIR, f), 'utf-8'))
      return {
        filename: f,
        id: content.id,
        receivedAt: content.receivedAt,
        patientName: content.patient?.name || content.patient?.nama || 'N/A',
        vitals: content.vitals,
        visitCount: content.visitHistory?.length || 0,
        medicalHistoryCount: content.medicalHistory?.length || 0,
      }
    })

    return jsonWithCors(req, CORS_METHODS, { ok: true, items, count: items.length })
  } catch (err) {
    console.error('[PatientSync] GET error:', err)
    return jsonWithCors(
      req,
      CORS_METHODS,
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
