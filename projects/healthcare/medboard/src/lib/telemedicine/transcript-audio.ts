// Audio for the MedLink transcript (Chief 2026-10-07: "dokter ngomong dia mencatat, pasien ngomong
// dia mencatat"). The browser hands over raw PCM; this file brings it to 16 kHz mono, cuts it at
// the pauses between utterances, drops silence and coughs (each request spends the free quota),
// and wraps each utterance as a WAV file for OpenRouter's input_audio. No browser APIs here.

/** Loudness of a block of samples (-1..1), root mean square. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (const sample of samples) sum += sample * sample
  return Math.sqrt(sum / samples.length)
}

/** Averages blocks of samples to go from the device rate (often 48 kHz) to the target rate. */
export function downsample(input: Float32Array, fromRate: number, toRate = 16000): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const output = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < output.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j] ?? 0
    output[i] = end > start ? sum / (end - start) : 0
  }
  return output
}

/** A mono 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i)
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, i) => {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  })
  return bytes
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function concat(parts: ReadonlyArray<Float32Array>): Float32Array {
  const out = new Float32Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export interface SpeechChunker {
  /** Feeds samples at `rate`; returns an utterance when one has just ended, else null. */
  push: (samples: Float32Array) => Float32Array | null
  /** Ends the current utterance, if it holds enough speech. */
  flush: () => Float32Array | null
}

/**
 * Cuts a stream into utterances: in 100 ms windows, leading silence is skipped, an utterance ends
 * after `pauseSeconds` of quiet or at `maxSeconds`, and is kept only with `minSpeechSeconds` of voice.
 */
export function createSpeechChunker({
  rate,
  threshold = 0.02,
  minSpeechSeconds = 1,
  pauseSeconds = 0.8,
  maxSeconds = 15,
}: {
  rate: number
  threshold?: number
  minSpeechSeconds?: number
  pauseSeconds?: number
  maxSeconds?: number
}): SpeechChunker {
  const windowSize = Math.round(rate / 10)
  let carry = new Float32Array(0)
  let parts: Float32Array[] = []
  let length = 0
  let voiced = 0
  let quiet = 0
  const ready: Float32Array[] = []

  const take = () => {
    if (voiced / 10 >= minSpeechSeconds) ready.push(concat(parts))
    parts = []
    length = 0
    voiced = 0
    quiet = 0
  }

  return {
    push(samples) {
      const data = concat([carry, samples])
      let offset = 0
      for (; offset + windowSize <= data.length; offset += windowSize) {
        const frame = data.slice(offset, offset + windowSize)
        const loud = rms(frame) > threshold
        if (!loud && voiced === 0) continue
        parts.push(frame)
        length += frame.length
        if (loud) {
          voiced++
          quiet = 0
        } else {
          quiet++
        }
        if (quiet / 10 >= pauseSeconds || length >= maxSeconds * rate) take()
      }
      carry = data.slice(offset)
      return ready.shift() ?? null
    },
    flush() {
      take()
      return ready.shift() ?? null
    },
  }
}
