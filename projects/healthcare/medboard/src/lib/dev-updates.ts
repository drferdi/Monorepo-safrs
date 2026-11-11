export type DevUpdateCategory = 'release' | 'improvement' | 'maintenance'

export interface DevUpdateRecord {
  id: string
  title: string
  body: string
  category: DevUpdateCategory
  createdBy: string
  createdByName: string
  createdAt: string
  expiresAt: string | null
  active: boolean
}
