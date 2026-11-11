import assert from 'node:assert/strict'

import {
  SENTRAPEDIA_CATALOG,
  SENTRAPEDIA_CATEGORIES,
  searchSentrapedia,
} from './sentrapediaCatalog.js'

assert.equal(SENTRAPEDIA_CATALOG.length, 144)
assert.equal(SENTRAPEDIA_CATEGORIES.length, 14)
assert.equal(SENTRAPEDIA_CATALOG.some((item) => item.category === 'Pernapasan Bawah'), false)
assert.equal(SENTRAPEDIA_CATALOG.some((item) => item.category === 'Saluran Cerna'), false)
assert.equal(searchSentrapedia('J00').some((item) => item.code === 'J00'), true)
assert.equal(searchSentrapedia('hidung tersumbat').length > 0, true)

console.log('sentrapedia catalog contracts passed')
