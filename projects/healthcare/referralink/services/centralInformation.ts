export type CentralMetricTone = 'green' | 'blue'

export type CentralMetricIcon = 'member' | 'apps' | 'website' | 'hours'

export type CentralInformationMetric = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly trend: string
  readonly tone: CentralMetricTone
  readonly icon: CentralMetricIcon
}

export type CentralInformationNote = {
  readonly id: string
  readonly title: string
  readonly byline: string
}

export type CentralInformationActivity = {
  readonly id: string
  readonly label: string
}

export type CentralInformationSnapshot = {
  readonly hero: {
    readonly title: string
    readonly weather: string
    readonly actionLabel: string
  }
  readonly metrics: readonly CentralInformationMetric[]
  readonly notes: readonly CentralInformationNote[]
  readonly activities: readonly CentralInformationActivity[]
}

export type CentralInformationProvider = {
  getSnapshot: () => Promise<CentralInformationSnapshot>
}

export const SENTRABOARD_REFERENCE_SNAPSHOT = {
  hero: {
    title: 'Welcome back, dr Ferdi',
    weather: 'Kediri hari ini 30° Kemungkinan hujan sore dan malam hari.',
    actionLabel: 'Medlink',
  },
  metrics: [
    {
      id: 'member',
      label: 'Member',
      value: '7',
      trend: '+1 From last week',
      tone: 'green',
      icon: 'member',
    },
    {
      id: 'apps',
      label: 'Apps',
      value: '3',
      trend: '+1 From last week',
      tone: 'blue',
      icon: 'apps',
    },
    {
      id: 'website',
      label: 'Sentraverse (website)',
      value: '20',
      trend: '+10 From last week',
      tone: 'blue',
      icon: 'website',
    },
    {
      id: 'hours',
      label: 'Hours',
      value: '20',
      trend: '+10 From last week',
      tone: 'green',
      icon: 'hours',
    },
  ],
  notes: [
    { id: 'policy', title: 'New policy added', byline: 'By dr Ferdi Iskandar' },
    {
      id: 'registration',
      title: 'Registration this week',
      byline: 'By dr Ferdi Iskandar',
    },
    { id: 'tips', title: '10 Tips Sentra', byline: 'By dr Ferdi Iskandar' },
    { id: 'password', title: 'Forgot password', byline: 'By dr Ferdi Iskandar' },
  ],
  activities: [
    { id: 'dizziness', label: 'Mencari ICD10 keluhan Pusing di Medlink' },
    { id: 'vomiting', label: 'Mencari ICD10 keluhan Muntah di Medlink' },
  ],
} as const satisfies CentralInformationSnapshot

const referenceCentralInformationProvider: CentralInformationProvider = {
  getSnapshot: async () => SENTRABOARD_REFERENCE_SNAPSHOT,
}

export function loadCentralInformation(
  provider: CentralInformationProvider = referenceCentralInformationProvider
) {
  return provider.getSnapshot()
}
