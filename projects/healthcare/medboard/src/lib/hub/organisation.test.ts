import assert from 'node:assert/strict'
import test from 'node:test'

import { CORE_ROLES, EBITDA, PRODUCTS, REPORTED_TOTAL_REVENUE, SAFE_PROFIT_PLAN } from './organisation'

// Figures below are copied from the Charter v1.3 (ORG-2026-01) and Financial Architecture
// (FIN-2026-01), both revision 1.3 of 16 August 2026.
// The page data only holds base figures; every derived number is recomputed here.

const round = (value: number, digits = 2) => Number(value.toFixed(digits))

test('the 2027-2029 safe profit plan totals Rp9.010 billion', () => {
  assert.equal(SAFE_PROFIT_PLAN.reduce((sum, year) => sum + year.millions, 0), 9010)
})

test('product revenue lines add up to the consolidated revenue of each year', () => {
  REPORTED_TOTAL_REVENUE.forEach((reported, year) => {
    assert.equal(round(PRODUCTS.reduce((sum, product) => sum + product.revenue[year], 0)), reported)
  })
  assert.deepEqual(REPORTED_TOTAL_REVENUE, [1.53, 5.28, 15.77, 42.26])
})

test('EBITDA stays negative until 2030 with a cumulative early loss of Rp7.7 billion', () => {
  assert.deepEqual(EBITDA.map((value) => value < 0), [true, true, true, false])
  assert.equal(round(EBITDA.slice(0, 3).reduce((sum, value) => sum + value, 0), 1), -7.7)
})

test('the operating core is the founder and the five charter roles, in charter order', () => {
  assert.deepEqual(
    CORE_ROLES.map((role) => role.name),
    [
      'dr. Ferdi Iskandar, S.H., M.Kn.',
      'Asyraf Hadi',
      'Josep Arianto',
      'dr. Novia Anggraini',
      'Karel Sinatra',
      'Farhan Nugroho, S.T.',
    ]
  )
})
