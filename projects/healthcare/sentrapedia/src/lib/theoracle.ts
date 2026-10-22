import data from "../../oracle/sentrapedia.json";

export interface Disease { id: number; nama: string; kategori: string; kode: string; definisi: string; gejala: string[]; diagnosis: string; terapi: string; rujukan: string }
export const theOracleDiseases: readonly Disease[] = data.diseases;
export const theOracleCategories = [...new Set(theOracleDiseases.map(d => d.kategori))].sort((a, b) => a.localeCompare(b, "id"));
// The public repository carries a fictional sample catalogue instead of the private one (2026-10-19).
export const theOracleSample = "sample" in data.metadata && data.metadata.sample === true;
export const theOracleSource = { file: "oracle/sentrapedia.json", hash: "7176679e55f64ac9fb3f220fbdc58ff1cf6beaf893cd372684fe97a9e0542aca", version: data.metadata.version, declaredCategories: data.metadata.total_categories };
export function searchDiseases(query: string, category: string): Disease[] {
  const terms = query.trim().toLocaleLowerCase("id").split(/\s+/).filter(Boolean);
  return theOracleDiseases.filter(d => (category === "all" || d.kategori === category) && terms.every(term => `${d.nama} ${d.kode} ${d.kategori}`.toLocaleLowerCase("id").includes(term)));
}

// True when a catalog code field ("B36.0", "B20-B24", "L01, L08") covers an ICD-10 code.
export function referenceIncludes(sourceCode: string, code: string): boolean {
  if (!/^[A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?$/.test(code)) return false;
  return sourceCode.toUpperCase().split(",").some(value => {
    const token = value.trim();
    const range = /^([A-Z]\d{2})-([A-Z]\d{2})$/.exec(token);
    return range ? code.slice(0, 3) >= range[1] && code.slice(0, 3) <= range[2] : code === token || code.startsWith(token + ".");
  });
}
