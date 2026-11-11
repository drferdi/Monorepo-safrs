import type { DrugAvailabilityStatus } from '@/lib/clinical/types/formulary.types'

interface DrugStatusBadgeProps {
  status: DrugAvailabilityStatus
  quantity?: number | null
  unit?: string | null
  label?: string
}

const BADGE_CONFIG: Record<DrugAvailabilityStatus, { label: string; className: string }> = {
  mapped_available: {
    label: 'Formularium aktif',
    className: 'drug-status-badge is-available',
  },
  mapped_limited: {
    label: 'Formularium aktif',
    className: 'drug-status-badge is-limited',
  },
  mapped_not_in_stock: {
    label: 'Formularium aktif',
    className: 'drug-status-badge is-unavailable',
  },
  not_mapped_to_formulary: {
    label: 'Di luar formularium',
    className: 'drug-status-badge is-unmapped',
  },
}

export function DrugStatusBadge({ status, quantity, unit, label }: DrugStatusBadgeProps) {
  const config = BADGE_CONFIG[status]
  const resolvedLabel = label ?? config.label
  void quantity
  void unit

  return (
    <span
      className={config.className}
      title={
        status === 'not_mapped_to_formulary'
          ? 'Obat ini belum masuk ke formularium aktif.'
          : undefined
      }
    >
      <span>{resolvedLabel}</span>
    </span>
  )
}
