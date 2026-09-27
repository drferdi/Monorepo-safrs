const ZONE_WORD: Record<'merah' | 'kuning', string> = { merah: 'MERAH', kuning: 'KUNING' };

/** A wa.me link whose message names only the triage zone: no patient data leaves Assist. */
export function buildDoctorAlertLink(whatsappNumber: string, zone: 'merah' | 'kuning'): string {
  const digits = whatsappNumber.replace(/\D/g, '');
  const text = `Sentra Assist: konsul triase ${ZONE_WORD[zone]}. Mohon cek Sentra Assist.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
