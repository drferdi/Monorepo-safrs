import icd10LegacyMaster from './icd10LegacyMaster.json'

export interface Icd10LegacyCatalogEntry {
  code: string
  officialLabel: string
  aliases: string[]
  note: string
  source: string
  version: string
}

interface Icd10LegacyMasterEntry {
  code: string
  officialLabel: string
  version: string
}

interface Icd10LegacyMasterDocument {
  source: string
  sourcePath: string
  sheetName: string
  rowCount: number
  versions: string[]
  entries: Icd10LegacyMasterEntry[]
}

interface Icd10LegacyEditorialOverride {
  aliases: string[]
  note: string
}

const ICD10_LEGACY_MASTER = icd10LegacyMaster as Icd10LegacyMasterDocument

const ICD10_LEGACY_EDITORIAL_OVERRIDES: Record<string, Icd10LegacyEditorialOverride> = {
  I10: {
    aliases: ['hipertensi', 'darah tinggi', 'hypertension'],
    note: 'Verify documented hypertension type and related conditions before final coding.',
  },
  E11: {
    aliases: ['diabetes melitus tipe 2', 'diabetes tipe 2', 'dm tipe 2', 'diabetes type 2'],
    note: 'Use the appropriate subcategory when complications are documented.',
  },
  J18: {
    aliases: ['pneumonia', 'radang paru', 'pneumonia unspecified'],
    note: 'Only a candidate when the causative organism is not documented.',
  },
  'J06.9': {
    aliases: ['ispa', 'infeksi saluran pernapasan atas', 'upper respiratory infection', 'uri'],
    note: 'Use a more specific respiratory diagnosis when documentation supports it.',
  },
  'K21.9': {
    aliases: ['gerd', 'refluks asam lambung', 'asam lambung naik', 'gastroesophageal reflux'],
    note: 'Confirm whether oesophagitis is documented before final selection.',
  },
  'M54.5': {
    aliases: ['nyeri punggung bawah', 'nyeri pinggang', 'low back pain', 'lumbago'],
    note: 'A symptom code; review documented cause and red flags before final coding.',
  },
  'N39.0': {
    aliases: ['infeksi saluran kemih', 'isk', 'uti', 'urinary tract infection'],
    note: 'Use only when the infection site is not documented.',
  },
  A09: {
    aliases: ['diare', 'gastroenteritis', 'mencret', 'acute diarrhoea'],
    note: 'Review duration, cause, and red flags before selecting a final code.',
  },
}

function buildDefaultEditorialNote(code: string) {
  return code.includes('.')
    ? 'Verify the documented clinical context before final coding.'
    : 'Review whether a more specific subcategory is documented before final coding.'
}

function buildSourceLabel(version: string) {
  return `${ICD10_LEGACY_MASTER.source}, ${version}`
}

export const ICD10_LEGACY_MASTER_SUMMARY = {
  source: ICD10_LEGACY_MASTER.source,
  sourcePath: ICD10_LEGACY_MASTER.sourcePath,
  sheetName: ICD10_LEGACY_MASTER.sheetName,
  entryCount: ICD10_LEGACY_MASTER.rowCount,
  versions: ICD10_LEGACY_MASTER.versions,
}

export const ICD10_LEGACY_CATALOG: Icd10LegacyCatalogEntry[] = ICD10_LEGACY_MASTER.entries.map(
  (entry) => {
    const override = ICD10_LEGACY_EDITORIAL_OVERRIDES[entry.code]

    return {
      code: entry.code,
      officialLabel: entry.officialLabel,
      aliases: override?.aliases ?? [],
      note: override?.note ?? buildDefaultEditorialNote(entry.code),
      source: buildSourceLabel(entry.version),
      version: entry.version,
    }
  }
)
