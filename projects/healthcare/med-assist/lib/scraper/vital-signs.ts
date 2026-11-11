export interface VitalScrapeResult {
  sbp?: string;
  dbp?: string;
  hr?: string;
  rr?: string;
  temp?: string;
  spo2?: string;
  glucose?: string;
}

type VitalScrapeField = keyof VitalScrapeResult;

const VITAL_SELECTORS: Record<VitalScrapeField, string> = {
  sbp: 'input#sistole, input[name="PeriksaFisik[sistole]"]',
  dbp: 'input#diastole, input[name="PeriksaFisik[diastole]"]',
  hr: 'input#detak-nadi, input[name="PeriksaFisik[detak_nadi]"]',
  rr: 'input#nafas, input[name="PeriksaFisik[nafas]"]',
  temp: 'input#suhu, input[name="PeriksaFisik[suhu]"]',
  glucose: 'input#gula-darah, input[name="PeriksaFisik[gula_darah]"], input[name="gula_darah"]',
  spo2: 'input[name="PeriksaFisik[saturasi]"], input#saturasi, input[name="PeriksaFisik[spo2]"]',
};

const VITAL_SCRAPE_FIELDS = Object.keys(VITAL_SELECTORS) as VitalScrapeField[];

function readVitalInput(root: Document, selector: string): string | undefined {
  const el = root.querySelector<HTMLInputElement>(selector);
  const value = el?.value?.trim();
  return value ? value : undefined;
}

/**
 * Reads the 7 numeric vital-sign inputs a nurse already filled in on the
 * ePuskesmas RME "Periksa Fisik" section. Read-only counterpart of the
 * fill mappings in lib/handlers/page-anamnesa.ts (same selectors, opposite
 * direction). Missing/empty fields are simply absent from the result.
 */
export function scanVitalSignsFromRoot(root: Document): VitalScrapeResult {
  const result: VitalScrapeResult = {};
  VITAL_SCRAPE_FIELDS.forEach((field) => {
    const value = readVitalInput(root, VITAL_SELECTORS[field]);
    if (value !== undefined) {
      result[field] = value;
    }
  });
  return result;
}
