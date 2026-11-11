// Pure helpers for the MedLink device check (Chief 2026-10-07: "check webcam, mic dll").

/** Loudness of one time-domain frame from an AnalyserNode (bytes centred on 128), from 0 to 1. */
export function micLevel(samples: Uint8Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (const sample of samples) {
    const value = (sample - 128) / 128
    sum += value * value
  }
  return Math.min(1, Math.sqrt(sum / samples.length))
}

/** What went wrong opening the camera and microphone, in words the doctor can act on. */
export function deviceErrorMessage(error: unknown): string {
  const name =
    typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string' ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Izin kamera dan mikrofon ditolak. Buka izin situs di browser, lalu cek ulang.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Kamera atau mikrofon tidak ditemukan.'
    case 'NotReadableError':
    case 'AbortError':
      return 'Kamera atau mikrofon sedang dipakai aplikasi lain.'
    default:
      return 'Perangkat tidak dapat dibuka. Coba cek ulang.'
  }
}

/** Connection quality from one round trip to MedBoard, in milliseconds; null when it failed. */
export function latencyLabel(ms: number | null): string {
  if (ms === null) return 'Tidak terhubung'
  if (ms < 150) return `Baik · ${ms} ms`
  if (ms < 400) return `Cukup · ${ms} ms`
  return `Lambat · ${ms} ms`
}
