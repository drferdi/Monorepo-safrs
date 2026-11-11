import assert from 'node:assert/strict'

import { ICD10_LEGACY_MASTER_SUMMARY } from '../data/icd10LegacyCatalog.js'

import {
  SENTRAPEDIA_CROSSWALK_REVIEW,
  SENTRAPEDIA_CROSSWALK_SUMMARY,
  getSentrapediaCrosswalkEntriesByBucket,
  getSentrapediaTranslatorEnrichment,
  isIcdMasterCodeAvailable,
} from './sentrapediaCrosswalk.js'

assert.equal(ICD10_LEGACY_MASTER_SUMMARY.entryCount, 18543)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.totalEntries, 144)
assert.equal(
  SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.direct +
    SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.normalized +
    SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.editorial_only +
    SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.exclude,
  144
)

const hypertension = SENTRAPEDIA_CROSSWALK_REVIEW.find(
  (entry) => entry.sentrapediaName === 'Hipertensi Esensial'
)
assert.ok(hypertension)
assert.equal(hypertension?.bucket, 'direct')
assert.equal(hypertension?.masterCode, 'I10')

const pneumonia = SENTRAPEDIA_CROSSWALK_REVIEW.find(
  (entry) => entry.sentrapediaName === 'Pneumonia Komuniti'
)
assert.ok(pneumonia)
assert.equal(pneumonia?.bucket, 'normalized')
assert.equal(pneumonia?.masterCode, 'J18')

const commonCold = SENTRAPEDIA_CROSSWALK_REVIEW.find(
  (entry) => entry.sentrapediaName === 'Common Cold (Pilek Biasa)'
)
assert.ok(commonCold)
assert.equal(commonCold?.bucket, 'direct')
assert.equal(commonCold?.masterCode, 'J00')

const childDiarrhoea = SENTRAPEDIA_CROSSWALK_REVIEW.find(
  (entry) => entry.sentrapediaName === 'Diare Akut pada Anak'
)
assert.ok(childDiarrhoea)
assert.equal(childDiarrhoea?.bucket, 'exclude')

const directEntries = getSentrapediaCrosswalkEntriesByBucket('direct')
assert.equal(directEntries.length, 91)

const hypertensionEnrichment = getSentrapediaTranslatorEnrichment('I10')
assert.ok(hypertensionEnrichment)
assert.equal(hypertensionEnrichment?.bucket, 'direct')
assert.ok(hypertensionEnrichment?.searchTerms.includes('Hipertensi Esensial'))

assert.equal(isIcdMasterCodeAvailable('I10'), true)
assert.equal(isIcdMasterCodeAvailable('J00'), true)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.normalized, 44)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.editorial_only, 1)
assert.equal(SENTRAPEDIA_CROSSWALK_SUMMARY.byBucket.exclude, 8)

console.log('Sentrapedia crosswalk tests passed')
