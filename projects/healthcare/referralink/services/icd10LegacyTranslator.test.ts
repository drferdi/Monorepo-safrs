import assert from 'node:assert/strict'

import { ICD10_LEGACY_MASTER_SUMMARY } from '../data/icd10LegacyCatalog.js'

import {
  getIcd10LegacyMatchExplanation,
  searchIcd10LegacyCatalog,
} from './icd10LegacyTranslator.js'
import { SENTRAPEDIA_CROSSWALK_SUMMARY } from './sentrapediaCrosswalk.js'

assert.equal(ICD10_LEGACY_MASTER_SUMMARY.entryCount, 18543)
assert.deepEqual(ICD10_LEGACY_MASTER_SUMMARY.versions, ['ICD10_2010'])

const exactCode = searchIcd10LegacyCatalog('i10')
assert.equal(exactCode.length, 1)
assert.equal(exactCode[0]?.entry.code, 'I10')
assert.equal(exactCode[0]?.match.kind, 'exact-code')

const indonesianTerm = searchIcd10LegacyCatalog('darah tinggi')
const indonesianMatch = indonesianTerm[0]
assert.ok(indonesianMatch)
assert.equal(indonesianMatch.entry.code, 'I10')
assert.equal(indonesianMatch.match.kind, 'possible-alias')
assert.equal(
  getIcd10LegacyMatchExplanation(indonesianMatch.match),
  'Matched an editorial alias. Verify the official ICD-10 tabular listing before final coding.'
)

const exactCodeMatch = exactCode[0]
assert.ok(exactCodeMatch)
assert.equal(
  getIcd10LegacyMatchExplanation(exactCodeMatch.match),
  'The entered ICD-10 code exactly matches this local reference entry.'
)

const exactLabel = searchIcd10LegacyCatalog('cholera')
assert.equal(exactLabel[0]?.entry.code, 'A00')
assert.equal(exactLabel[0]?.match.kind, 'exact-label')

assert.deepEqual(searchIcd10LegacyCatalog('   '), [])
assert.deepEqual(searchIcd10LegacyCatalog('istilah yang tidak ada'), [])

const crosswalkDirect = searchIcd10LegacyCatalog('hipertensi esensial')
assert.equal(crosswalkDirect[0]?.entry.code, 'I10')
assert.equal(crosswalkDirect[0]?.match.kind, 'possible-crosswalk-term')
assert.equal(crosswalkDirect[0]?.enrichment?.bucket, 'direct')

const crosswalkNormalized = searchIcd10LegacyCatalog('pneumonia komuniti')
const normalizedCrosswalkMatch = crosswalkNormalized[0]
assert.ok(normalizedCrosswalkMatch)
assert.equal(normalizedCrosswalkMatch.entry.code, 'J18')
assert.equal(normalizedCrosswalkMatch.match.kind, 'possible-crosswalk-term')
assert.equal(normalizedCrosswalkMatch.enrichment?.bucket, 'normalized')

assert.equal(
  getIcd10LegacyMatchExplanation(normalizedCrosswalkMatch.match),
  'Matched a Sentrapedia enrichment term. Keep the ICD master entry as the coding source of truth and verify final coding.'
)

assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.totalEntries, 144)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.direct, 91)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.normalized, 44)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.editorial_only, 1)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.exclude, 8)

console.log('ICD-10 legacy translator tests passed')
