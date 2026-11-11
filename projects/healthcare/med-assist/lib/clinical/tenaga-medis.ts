// Designed and constructed by Drferdi.
/**
 * Tenaga medis names for the RME. Since 2026-09-27 (Chief, DECISIONS) the signed-in Assist user
 * fills the field of their profession; the constants fill the other field and every case where
 * no crew profession is known.
 */

export const DOKTER_NAMA = 'dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC';
export const PERAWAT_NAMA = 'JOSEP ARIANTO, A.Md';

export interface AssistStaff {
  name: string;
  profession: string;
}

export interface TenagaMedisNames {
  dokter_nama: string;
  perawat_nama: string;
}

const DOCTOR_PROFESSIONS = new Set(['dokter', 'dokter gigi']);
const NAKES_PROFESSIONS = new Set(['perawat', 'bidan', 'apoteker', 'triage officer']);

export function resolveStaffField(profession: string | undefined): 'dokter' | 'perawat' | null {
  const key = (profession ?? '').trim().toLowerCase();
  if (DOCTOR_PROFESSIONS.has(key)) return 'dokter';
  if (NAKES_PROFESSIONS.has(key)) return 'perawat';
  return null;
}

export function resolveTenagaMedisNames(staff: AssistStaff | null): TenagaMedisNames {
  const names = { dokter_nama: DOKTER_NAMA, perawat_nama: PERAWAT_NAMA };
  const name = staff?.name.trim() ?? '';
  const field = resolveStaffField(staff?.profession);
  if (!name || !field) return names;
  return field === 'dokter' ? { ...names, dokter_nama: name } : { ...names, perawat_nama: name };
}
