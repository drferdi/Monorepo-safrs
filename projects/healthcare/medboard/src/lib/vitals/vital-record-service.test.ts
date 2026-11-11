/**
 * vital-record-service tests
 *
 * Tests pure utility functions (hash derivation, identifier building).
 * DB-dependent functions (persist, retrieve) are covered by integration
 * tests in CI — skipped here since no DB is available in local unit test.
 *
 * Clinical Momentum Engine — Phase 1B
 */

import assert from 'node:assert/strict'
import test from 'node:test'

// Import only pure functions from utils (no "server-only" / prisma dependency)
import { buildPatientIdentifierFromRM, buildPatientIdentifierHash } from './vital-record-utils'

// ── buildPatientIdentifierHash ───────────────────────────────────────────────

test('builds stable SHA-256 hash from noRm + nama + dob', () => {
  const hash1 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  const hash2 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  assert.equal(hash1, hash2, 'Same inputs must produce same hash')
  assert.equal(hash1.length, 64, 'SHA-256 hex is 64 chars')
  assert.match(hash1, /^[0-9a-f]{64}$/, 'Hash must be lowercase hex')
})

test('different inputs produce different hashes', () => {
  const h1 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  const h2 = buildPatientIdentifierHash('RM001235', 'Siti Rahayu', '1980-04-15')
  const h3 = buildPatientIdentifierHash('RM001234', 'Siti Rahmawati', '1980-04-15')
  const h4 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-16')
  assert.notEqual(h1, h2, 'Different RM → different hash')
  assert.notEqual(h1, h3, 'Different name → different hash')
  assert.notEqual(h1, h4, 'Different DOB → different hash')
})

test('normalizes name casing and extra whitespace', () => {
  const h1 = buildPatientIdentifierHash('RM001234', 'siti rahayu', '1980-04-15')
  const h2 = buildPatientIdentifierHash('RM001234', 'SITI RAHAYU', '1980-04-15')
  const h3 = buildPatientIdentifierHash('RM001234', 'Siti  Rahayu', '1980-04-15') // double space
  const h4 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  assert.equal(h1, h2, 'Case insensitive on name')
  assert.equal(h2, h3, 'Extra whitespace normalized')
  assert.equal(h3, h4, 'Normalized matches canonical')
})

test('normalizes RM number to uppercase', () => {
  const h1 = buildPatientIdentifierHash('rm001234', 'Siti Rahayu', '1980-04-15')
  const h2 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  assert.equal(h1, h2, 'RM case insensitive')
})

test('trims whitespace from all fields', () => {
  const h1 = buildPatientIdentifierHash('  RM001234  ', '  Siti Rahayu  ', '  1980-04-15  ')
  const h2 = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  assert.equal(h1, h2, 'Leading/trailing whitespace trimmed')
})

// ── buildPatientIdentifierFromRM ─────────────────────────────────────────────

test('buildPatientIdentifierFromRM produces valid 64-char hex hash', () => {
  const hash = buildPatientIdentifierFromRM('RM001234')
  assert.equal(hash.length, 64)
  assert.match(hash, /^[0-9a-f]{64}$/)
})

test('buildPatientIdentifierFromRM is stable', () => {
  const h1 = buildPatientIdentifierFromRM('RM001234')
  const h2 = buildPatientIdentifierFromRM('RM001234')
  assert.equal(h1, h2)
})

test('buildPatientIdentifierFromRM normalizes RM to uppercase', () => {
  const h1 = buildPatientIdentifierFromRM('rm001234')
  const h2 = buildPatientIdentifierFromRM('RM001234')
  assert.equal(h1, h2)
})

test('buildPatientIdentifierFromRM differs from composite hash for same RM', () => {
  // These two methods use different key formats, so they should not collide
  const rmOnly = buildPatientIdentifierFromRM('RM001234')
  const composite = buildPatientIdentifierHash('RM001234', 'any name', '1990-01-01')
  assert.notEqual(rmOnly, composite, 'Different methods produce different namespaces')
})

// ── PHI Safety Verification ───────────────────────────────────────────────────

test('hash is not reversible — patient name not present in hash output', () => {
  const hash = buildPatientIdentifierHash('RM001234', 'Siti Rahayu', '1980-04-15')
  assert.ok(!hash.includes('siti'), 'Patient name must not appear in hash')
  assert.ok(!hash.includes('1980'), 'DOB must not appear in hash')
  assert.ok(!hash.includes('RM001234'), 'MR number must not appear in hash')
})
