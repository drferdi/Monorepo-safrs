import { isDoctorProfession } from '@/lib/crew-access'

export interface DoctorContact {
  id: string
  name: string
  whatsappNumber: string
}

export function toWhatsappDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

export function buildDoctorContacts(
  users: Array<{ username: string; displayName: string; profession?: string; status?: string }>,
  profiles: Map<string, { whatsappNumber?: string }>
): DoctorContact[] {
  return users
    .filter(user => user.status === 'ACTIVE' && isDoctorProfession(user.profession))
    .map(user => ({
      id: user.username,
      name: user.displayName,
      whatsappNumber: toWhatsappDigits(profiles.get(user.username)?.whatsappNumber ?? ''),
    }))
    .filter(contact => contact.whatsappNumber.length > 0)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
