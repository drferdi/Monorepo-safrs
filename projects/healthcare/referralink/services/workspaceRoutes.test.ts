import assert from 'node:assert/strict'

import {
  SENTRAVERSE_URL,
  openSentraverse,
  parseWorkspaceHash,
  toWorkspaceHash,
} from './workspaceRoutes.js'

assert.equal(parseWorkspaceHash('#logbook'), 'logbook')
assert.equal(parseWorkspaceHash('#credential'), 'credential')
assert.equal(parseWorkspaceHash('#sentrapedia'), 'sentrapedia')
assert.equal(parseWorkspaceHash('#notifications'), 'notifications')
assert.equal(parseWorkspaceHash('#settings'), 'settings')
assert.equal(parseWorkspaceHash('#unknown'), 'medlink')
assert.equal(toWorkspaceHash('sentraboard'), '#sentraboard')

let opened = ''
openSentraverse((url, target, features) => {
  opened = `${url}|${target}|${features}`
  return null
})
assert.equal(opened, `${SENTRAVERSE_URL}|_blank|noopener,noreferrer`)

console.log('workspace route contracts passed')
