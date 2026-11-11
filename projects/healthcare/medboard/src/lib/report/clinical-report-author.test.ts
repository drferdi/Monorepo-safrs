import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'

test('the author is the signed-in user, never a name typed in the form', async () => {
  const { clinicalReportAuthor } = await import('./clinical-report-store')
  assert.equal(clinicalReportAuthor({ username: 'dr.ferdi' }), 'dr.ferdi')
  assert.equal(clinicalReportAuthor(null), null)
})
