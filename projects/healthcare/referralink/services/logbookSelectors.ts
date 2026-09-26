import type { AuditUrgency, LogbookAuditEnvelope, LogbookStatus } from './logbookTypes'

export interface LogbookFilters {
  status?: LogbookStatus | 'all'
  urgency?: AuditUrgency | 'all'
  from?: string
  to?: string
}

export interface SentraBoardSummary {
  total: number
  completed: number
  attention: number
  averageDurationMs: number
  recent: LogbookAuditEnvelope[]
}

function newestFirst(left: LogbookAuditEnvelope, right: LogbookAuditEnvelope) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt)
}

export function buildSentraBoardSummary(records: LogbookAuditEnvelope[]): SentraBoardSummary {
  const ordered = [...records].sort(newestFirst)
  const completed = records.filter((record) => record.status === 'completed')
  const attention = completed.filter(
    (record) => record.urgency === 'urgent' || record.urgency === 'emergency'
  ).length
  const durationRecords = records.filter((record) => record.durationMs > 0)
  const totalDuration = durationRecords.reduce((sum, record) => sum + record.durationMs, 0)

  return {
    total: records.length,
    completed: completed.length,
    attention,
    averageDurationMs:
      durationRecords.length > 0 ? Math.round(totalDuration / durationRecords.length) : 0,
    recent: ordered.slice(0, 4),
  }
}

export function filterLogbookRecords(records: LogbookAuditEnvelope[], filters: LogbookFilters) {
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00.000Z`) : undefined
  const to = filters.to ? Date.parse(`${filters.to}T23:59:59.999Z`) : undefined

  return [...records]
    .filter((record) => {
      if (filters.status && filters.status !== 'all' && record.status !== filters.status) {
        return false
      }
      if (filters.urgency && filters.urgency !== 'all' && record.urgency !== filters.urgency) {
        return false
      }
      const createdAt = Date.parse(record.createdAt)
      if (from !== undefined && createdAt < from) return false
      if (to !== undefined && createdAt > to) return false
      return true
    })
    .sort(newestFirst)
}
