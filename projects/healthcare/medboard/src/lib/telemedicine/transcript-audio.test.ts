import assert from 'node:assert/strict'
import test from 'node:test'

import { createSpeechChunker, downsample, encodeWav, rms } from './transcript-audio'

const tone = (seconds: number, rate = 16000, amplitude = 0.3) =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin(i / 3))
const silence = (seconds: number, rate = 16000) => new Float32Array(Math.round(seconds * rate))

test('WAV is RIFF/WAVE, mono, 16-bit PCM at the given rate, with the right sizes', () => {
  const wav = encodeWav(Float32Array.from([0, 1, -1, 0.5]), 16000)
  const view = new DataView(wav.buffer)
  const text = (at: number) => String.fromCharCode(...wav.slice(at, at + 4))
  assert.equal(text(0), 'RIFF')
  assert.equal(text(8), 'WAVE')
  assert.equal(view.getUint16(20, true), 1) // PCM
  assert.equal(view.getUint16(22, true), 1) // mono
  assert.equal(view.getUint32(24, true), 16000)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(view.getUint32(40, true), 8) // 4 samples x 2 bytes
  assert.equal(wav.length, 44 + 8)
  assert.equal(view.getInt16(46, true), 32767)
  assert.equal(view.getInt16(48, true), -32768)
})

test('48 kHz audio is brought down to 16 kHz', () => {
  assert.equal(downsample(new Float32Array(48000), 48000, 16000).length, 16000)
  assert.equal(downsample(new Float32Array(1600), 16000, 16000).length, 1600)
})

test('rms of silence is 0 and of a loud wave is well above the speech threshold', () => {
  assert.equal(rms(silence(0.1)), 0)
  assert.ok(rms(tone(0.1)) > 0.1)
})

test('speech is cut into one chunk at the pause that follows it', () => {
  const chunker = createSpeechChunker({ rate: 16000 })
  assert.equal(chunker.push(tone(3)), null)
  const chunk = chunker.push(silence(1))
  assert.ok(chunk, 'a chunk after 3 s of speech and a pause')
  assert.ok(chunk.length >= 3 * 16000)
})

test('a long monologue is cut at 15 s even without a pause', () => {
  const chunker = createSpeechChunker({ rate: 16000 })
  let cut: Float32Array | null = null
  for (let i = 0; i < 20 && !cut; i++) cut = chunker.push(tone(1))
  assert.ok(cut)
  assert.ok(cut.length <= 15 * 16000)
})

test('silence alone and a short cough are never sent (they would only spend the free quota)', () => {
  const chunker = createSpeechChunker({ rate: 16000 })
  assert.equal(chunker.push(silence(20)), null)
  assert.equal(chunker.push(tone(0.5)), null)
  assert.equal(chunker.push(silence(2)), null)
  assert.equal(chunker.flush(), null)
})
