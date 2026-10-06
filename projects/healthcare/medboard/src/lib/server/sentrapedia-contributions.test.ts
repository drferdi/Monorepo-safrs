import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, test } from 'node:test'

import { applyApprovedContributions, validateContributionDraft } from '@/lib/sentrapedia/contribution'
import { DISEASES } from '@/lib/sentrapedia/data'

import { reviewContribution } from './sentrapedia-ai-review'
import {
  decideContribution,
  getContribution,
  listApprovedContributions,
  listContributions,
  recordAiReview,
  saveNewContribution,
} from './sentrapedia-contributions'

const file = path.join(os.tmpdir(), `medboard-sentrapedia-${process.pid}.jsonl`)
process.env.SENTRAPEDIA_CONTRIBUTIONS_FILE = file
beforeEach(() => rmSync(file, { force: true }))

const contributor = { username: 'dokter.uji', displayName: 'Dokter Uji', profession: 'Dokter' }
const commonCold = DISEASES[0]
const draft = {
  diseaseId: commonCold.id,
  field: 'terapi',
  proposedText: 'Terapi simtomatik: parasetamol 500 mg 3x sehari bila demam, istirahat, dan hidrasi cukup.',
  reference: 'PNPK Kemenkes 2020',
  note: '',
}
const review = { available: true as const, verdict: 'layak' as const, summary: 'Sesuai pedoman.', concerns: [], reviewedAt: '2026-10-07T00:00:00.000Z' }

function saved() {
  const result = validateContributionDraft(draft)
  assert.ok(result.ok)
  return saveNewContribution(result.draft, contributor)
}

test('a contribution needs a known disease, a known section, real text and a source', () => {
  assert.equal(validateContributionDraft({ ...draft, diseaseId: 99999 }).ok, false)
  assert.equal(validateContributionDraft({ ...draft, field: 'harga' }).ok, false)
  assert.equal(validateContributionDraft({ ...draft, proposedText: 'singkat' }).ok, false)
  assert.equal(validateContributionDraft({ ...draft, reference: '' }).ok, false)
  assert.equal(validateContributionDraft(null).ok, false)
  const ok = validateContributionDraft({ ...draft, proposedText: `  ${draft.proposedText}  ` })
  assert.ok(ok.ok)
  assert.equal(ok.draft.proposedText, draft.proposedText)
})

test('a new contribution waits for the AI review, named after its disease and contributor', () => {
  const record = saved()
  assert.equal(record.status, 'ai_review')
  assert.equal(record.diseaseName, commonCold.nama)
  assert.equal(record.contributor.username, 'dokter.uji')
  assert.equal(record.aiReview, null)
  assert.deepEqual(listContributions().map((item) => item.id), [record.id])
})

test('the list shows the newest contribution first', () => {
  const first = saved()
  const second = saveNewContribution({ ...first, field: 'definisi' }, contributor, new Date(Date.now() + 1000))
  assert.deepEqual(listContributions().map((item) => item.id), [second.id, first.id])
})

test('after an AI review the contribution waits for Chief; without one it cannot be approved', () => {
  const record = saved()
  const refused = decideContribution(record.id, 'approved', 'chief', '')
  assert.equal(refused.ok, false)
  assert.equal(getContribution(record.id)?.status, 'ai_review')

  assert.equal(recordAiReview(record.id, review)?.status, 'awaiting_approval')
  const approved = decideContribution(record.id, 'approved', 'chief', 'Terima kasih')
  assert.ok(approved.ok)
  assert.equal(approved.record.status, 'approved')
  assert.equal(approved.record.decision?.by, 'chief')
})

test('an AI review that could not run keeps the contribution in AI review', () => {
  const record = saved()
  const after = recordAiReview(record.id, { available: false, reason: 'Tinjauan AI belum tersedia.', reviewedAt: review.reviewedAt })
  assert.equal(after?.status, 'ai_review')
  assert.equal(decideContribution(record.id, 'approved', 'chief', '').ok, false)
})

test('a decided contribution cannot be decided again', () => {
  const record = saved()
  recordAiReview(record.id, review)
  assert.ok(decideContribution(record.id, 'rejected', 'chief', 'Sumber kurang kuat').ok)
  assert.equal(decideContribution(record.id, 'approved', 'chief', '').ok, false)
  assert.equal(getContribution(record.id)?.status, 'rejected')
})

test('Sentrapedia shows an approved change in place of the old text; symptoms are one per line', () => {
  const therapy = saved()
  recordAiReview(therapy.id, review)
  decideContribution(therapy.id, 'approved', 'chief', '')
  const symptoms = saveNewContribution(
    { diseaseId: commonCold.id, field: 'gejala', proposedText: 'Hidung tersumbat\n\nBersin\nNyeri tenggorok', reference: 'WHO 2024', note: '' },
    contributor
  )
  recordAiReview(symptoms.id, review)
  decideContribution(symptoms.id, 'approved', 'chief', '')
  const waiting = saveNewContribution({ ...draft, field: 'definisi', proposedText: 'Definisi yang belum disetujui oleh Chief sama sekali.' }, contributor)

  const shown = applyApprovedContributions(commonCold, listApprovedContributions())
  assert.equal(shown.terapi, draft.proposedText)
  assert.deepEqual(shown.gejala, ['Hidung tersumbat', 'Bersin', 'Nyeri tenggorok'])
  assert.equal(shown.definisi, commonCold.definisi)
  assert.notEqual(waiting.status, 'approved')
  assert.equal(applyApprovedContributions(DISEASES[1], listApprovedContributions()).terapi, DISEASES[1].terapi)
})

function fakeFetch(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status })
}

test('the AI review reads the model verdict, summary and concerns', async () => {
  const content = JSON.stringify({ verdict: 'perlu_perbaikan', summary: 'Dosis perlu dicek.', concerns: ['Dosis anak tidak disebut'] })
  const result = await reviewContribution(saved(), commonCold.terapi, {
    apiKey: 'test-key',
    fetchImpl: fakeFetch({ choices: [{ message: { content } }] }),
  })
  assert.ok(result.available)
  assert.equal(result.verdict, 'perlu_perbaikan')
  assert.deepEqual(result.concerns, ['Dosis anak tidak disebut'])
})

test('without a key, on an API error or on an unreadable answer the AI review says it is unavailable', async () => {
  const record = saved()
  assert.equal((await reviewContribution(record, '', { apiKey: '' })).available, false)
  assert.equal((await reviewContribution(record, '', { apiKey: 'k', fetchImpl: fakeFetch({}, 500) })).available, false)
  const garbled = fakeFetch({ choices: [{ message: { content: 'bukan json' } }] })
  assert.equal((await reviewContribution(record, '', { apiKey: 'k', fetchImpl: garbled })).available, false)
  const badVerdict = fakeFetch({ choices: [{ message: { content: '{"verdict":"mantap","summary":"x"}' } }] })
  assert.equal((await reviewContribution(record, '', { apiKey: 'k', fetchImpl: badVerdict })).available, false)
})
