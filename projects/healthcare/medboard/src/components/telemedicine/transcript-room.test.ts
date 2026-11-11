import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (relative: string): string => readFileSync(path.join(process.cwd(), relative), 'utf8')

test('both AI routes check the crew session before anything is sent to OpenRouter', () => {
  for (const [route, call] of [
    ['src/app/api/telemedicine/transcribe/route.ts', 'transcribeSpeech('],
    ['src/app/api/telemedicine/summarize/route.ts', 'summarizeConsult('],
  ] as const) {
    const source = read(route)
    assert.ok(source.indexOf('isCrewAuthorizedRequest(request)') > 0, route)
    assert.ok(source.indexOf('isCrewAuthorizedRequest(request)') < source.indexOf(call), route)
    assert.match(source, /writeSecurityAuditLog\(/)
  }
  assert.match(read('src/app/api/telemedicine/transcribe/route.ts'), /MAX_AUDIO_BASE64/)
})

test('the room shows the transcript beside the video; only the doctor records, and only after pressing start', () => {
  const page = read('src/app/telemedicine/[id]/page.tsx')
  assert.match(page, /<TranscriptPanel\b/)
  assert.match(page, /participantRole === 'DOCTOR'/)
  const room = read('src/components/telemedicine/VideoRoom.tsx')
  assert.match(room, /onUtterance/)
  assert.match(room, /<ConsultCapture\b/)
  const panel = read('src/components/telemedicine/TranscriptPanel.tsx')
  assert.match(panel, /Pasien setuju percakapan dicatat/)
  assert.match(panel, /Ringkas ke ePuskesmas/)
  for (const page of ['Anamnesa', 'Diagnosa', 'Resep']) assert.ok(panel.includes(`'${page}'`), page)
})

test('the doctor is the local microphone and the patient the remote one; tracks are released when capture stops', () => {
  const capture = read('src/components/telemedicine/ConsultCapture.tsx')
  assert.match(capture, /isLocal \? 'dokter' : 'pasien'/)
  assert.match(capture, /Track\.Source\.Microphone/)
  assert.match(capture, /\.close\(\)/)
})
