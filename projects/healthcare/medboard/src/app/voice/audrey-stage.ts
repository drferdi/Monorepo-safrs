export type SessionState = 'idle' | 'connecting' | 'ready' | 'recording' | 'processing' | 'speaking' | 'error'

export type AudreyStage = {
  motion: 'idle' | 'thinking' | 'responding'
  tone: 'neutral' | 'success' | 'critical' | 'warning' | 'primary'
  stageLabel: string
  bubbleLabel: string
  badgeLabel: string
}

const STAGES: Record<SessionState, AudreyStage> = {
  idle: { motion: 'idle', tone: 'neutral', stageLabel: 'Audrey siap', bubbleLabel: 'Siap mendampingi', badgeLabel: 'Belum terhubung' },
  connecting: { motion: 'thinking', tone: 'warning', stageLabel: 'Audrey bersiap', bubbleLabel: 'Menyiapkan sesi klinis', badgeLabel: 'Menghubungkan' },
  ready: { motion: 'idle', tone: 'success', stageLabel: 'Audrey siap', bubbleLabel: 'Siap mendengarkan', badgeLabel: 'Online' },
  recording: { motion: 'idle', tone: 'critical', stageLabel: 'Audrey mendengarkan', bubbleLabel: 'Mendengarkan Anda', badgeLabel: 'Merekam' },
  processing: { motion: 'thinking', tone: 'warning', stageLabel: 'Audrey menganalisis', bubbleLabel: 'Meninjau bukti klinis', badgeLabel: 'Berpikir' },
  speaking: { motion: 'responding', tone: 'primary', stageLabel: 'Audrey menjelaskan', bubbleLabel: 'Menjawab konsultasi', badgeLabel: 'Menjelaskan' },
  error: { motion: 'idle', tone: 'critical', stageLabel: 'Sesi terputus', bubbleLabel: 'Coba mulai ulang sesi', badgeLabel: 'Gangguan' },
}

export function audreyStage(state: SessionState): AudreyStage {
  return STAGES[state]
}
