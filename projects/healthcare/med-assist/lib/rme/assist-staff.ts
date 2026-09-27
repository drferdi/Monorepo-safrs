import type { AuthSession } from '@/lib/api/auth-store';
import {
  resolveTenagaMedisNames,
  type AssistStaff,
  type TenagaMedisNames,
} from '@/lib/clinical/tenaga-medis';

/** The signed-in crew user as RME staff; local accounts keep the constant names. */
export function assistStaffFromSession(session: AuthSession | null): AssistStaff | null {
  const user = session?.user;
  if (!user || user.id.startsWith('local:')) return null;
  return { name: user.name, profession: user.poli ?? '' };
}

/** Anamnesa and diagnosa: the signed-in user's name in `tenaga_medis`. */
export function withStaffNames<T extends { tenaga_medis?: TenagaMedisNames }>(
  payload: T,
  staff: AssistStaff | null
): T {
  if (!staff) return payload;
  return { ...payload, tenaga_medis: resolveTenagaMedisNames(staff) };
}

/** Resep: the signed-in user's name in `ajax.dokter` / `ajax.perawat`. */
export function withResepStaff<T extends { ajax: { dokter: string; perawat: string } }>(
  payload: T,
  staff: AssistStaff | null
): T {
  if (!staff) return payload;
  const names = resolveTenagaMedisNames(staff);
  return {
    ...payload,
    ajax: { ...payload.ajax, dokter: names.dokter_nama, perawat: names.perawat_nama },
  };
}
