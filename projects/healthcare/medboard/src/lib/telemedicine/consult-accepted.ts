// Persistensi "Ambil kasus" — simpan consult yang sudah di-accept dokter untuk audit / alur EMR nanti.
import 'server-only'

export type { AcceptedConsultRecord } from './consult-accepted-impl'
export {
  appendAcceptedConsult,
  getAcceptedConsult,
  listAcceptedConsults,
} from './consult-accepted-impl'
