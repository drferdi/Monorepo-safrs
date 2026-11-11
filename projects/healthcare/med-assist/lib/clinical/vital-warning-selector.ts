import type { VitalFieldStatus } from '@/lib/clinical/vital-guardrails';

export interface VitalWarningSlot {
  label: string;
  value: string;
}

/**
 * Picks up to 2 abnormal vitals to surface in the patient-bar warning
 * badge. TD and Suhu always win their slot when abnormal (Chief's explicit
 * instruction); the remaining slot(s) fall through HR -> RR -> SpO2 ->
 * Glucose in fixed order. Fully deterministic — no magnitude comparison
 * across dissimilar units.
 */
export function selectVitalWarnings(fieldStatus: {
  sbp: VitalFieldStatus;
  dbp: VitalFieldStatus;
  hr: VitalFieldStatus;
  rr: VitalFieldStatus;
  temp: VitalFieldStatus;
  spo2: VitalFieldStatus;
  glucose: VitalFieldStatus;
}): VitalWarningSlot[] {
  const slots: VitalWarningSlot[] = [];

  const isAbnormal = (status: VitalFieldStatus): boolean => status.severity !== 'normal';

  if (isAbnormal(fieldStatus.sbp) || isAbnormal(fieldStatus.dbp)) {
    slots.push({ label: 'TD', value: `${fieldStatus.sbp.value}/${fieldStatus.dbp.value}` });
  }

  if (slots.length < 2 && isAbnormal(fieldStatus.temp)) {
    slots.push({ label: 'Suhu', value: `${fieldStatus.temp.value}` });
  }

  const fallbackOrder: Array<{ key: 'hr' | 'rr' | 'spo2' | 'glucose'; label: string }> = [
    { key: 'hr', label: 'HR' },
    { key: 'rr', label: 'RR' },
    { key: 'spo2', label: 'SpO2' },
    { key: 'glucose', label: 'Glukosa' },
  ];

  for (const { key, label } of fallbackOrder) {
    if (slots.length >= 2) break;
    const status = fieldStatus[key];
    if (isAbnormal(status)) {
      slots.push({ label, value: `${status.value}` });
    }
  }

  return slots;
}
