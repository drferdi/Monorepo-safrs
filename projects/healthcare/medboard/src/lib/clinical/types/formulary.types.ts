export type DrugAvailabilityStatus =
  | 'mapped_available'
  | 'mapped_limited'
  | 'mapped_not_in_stock'
  | 'not_mapped_to_formulary'

export type DrugCategory =
  | 'cardiovascular'
  | 'analgesic'
  | 'antibiotic'
  | 'antidiabetic'
  | 'antihypertensive'
  | 'bronchodilator'
  | 'antihistamine'
  | 'gastrointestinal'
  | 'vitamin_mineral'
  | 'emergency'
  | 'other'

export type DrugRoute = 'oral' | 'sublingual' | 'topical' | 'injectable' | 'inhalation' | 'rectal'
export type DosageForm =
  | 'tablet'
  | 'kapsul'
  | 'sirup'
  | 'injeksi'
  | 'salep'
  | 'suppositoria'
  | 'inhaler'

export interface DrugContraindicationComorbidityRule {
  match: string[]
  reason: string
}

export interface DrugContraindicationProfile {
  absolute?: string[]
  allergy?: string[]
  pregnancy?: string[]
  elderly?: string[]
  comorbidity?: DrugContraindicationComorbidityRule[]
  caution?: string[]
}

export interface DrugMappingEntry {
  canonical_name: string
  aliases: string[]
  stock_match_keys: string[]
  category: DrugCategory
  route?: DrugRoute
  dosage_form?: DosageForm[]
  strength_patterns?: string[]
  is_puskesmas_formulary: boolean
  preferred_stock_item_name: string
  atc_code?: string
  icd10_relevant?: string[]
  notes?: string
  contraindications?: DrugContraindicationProfile
}

export interface StockItem {
  id: string
  name: string
  quantity: number
  unit: string
  low_stock_threshold: number
  category: string
}

export interface ResolvedDrug {
  input_name: string
  canonical_name: string | null
  aliases: string[]
  preferred_stock_item_name: string | null
  stock_item: StockItem | null
  status: DrugAvailabilityStatus
  is_puskesmas_formulary: boolean
  display_label: string
  confidence_score: number
  category: DrugCategory | 'other'
  notes?: string
  contraindications?: DrugContraindicationProfile | null
}
