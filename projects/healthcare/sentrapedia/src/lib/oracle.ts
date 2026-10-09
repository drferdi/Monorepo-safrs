import data from "../../oracle/sentrapedia.json";

export interface Disease { id: number; nama: string; kategori: string; kode: string; definisi: string; gejala: string[]; diagnosis: string; terapi: string; rujukan: string }
export const oracleDiseases: readonly Disease[] = data.diseases;
export const oracleCategories = [...new Set(oracleDiseases.map(d => d.kategori))].sort((a, b) => a.localeCompare(b, "id"));
export const oracleSource = { file: "oracle/sentrapedia.json", hash: "73e40882cdd313f46f406c99c3474aab9ebde44418d3e1681b0f5aaec9f9cd9a", version: data.metadata.version, declaredCategories: data.metadata.total_categories };
export function searchDiseases(query: string, category: string): Disease[] {
  const terms = query.trim().toLocaleLowerCase("id").split(/\s+/).filter(Boolean);
  return oracleDiseases.filter(d => (category === "all" || d.kategori === category) && terms.every(term => `${d.nama} ${d.kode} ${d.kategori}`.toLocaleLowerCase("id").includes(term)));
}
export function relatedDiseases(code: string): Disease[] { return oracleDiseases.filter(d => d.kode.trim().toUpperCase() === code.trim().toUpperCase()); }
