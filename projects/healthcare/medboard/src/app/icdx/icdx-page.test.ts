import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { icdCodeDetail, lookupIcdDynamically } from '@/lib/icd/dynamic-db'
import { ICD_TIMELINE } from '@/lib/icd/timeline'

const read = (relative: string): string => readFileSync(path.join(process.cwd(), relative), 'utf8')

test('an ICD lookup never sends server file paths to the browser (Chief 2026-10-07: delete the DB line)', () => {
  const response = lookupIcdDynamically('A00')
  assert.ok(response.results.length > 0)
  assert.ok(!('loadedFrom' in response))
  assert.ok(!('extensionSource' in response))
  assert.doesNotMatch(read('src/lib/clinical-adapter/icd.ts'), /loadedFrom|extensionSource/)
})

test('the ICD page shows no database line and no LB1 generator (Chief 2026-10-07)', () => {
  const page = read('src/app/icdx/page.tsx')
  assert.doesNotMatch(page, /DB: |dbInfo|extensionSource|Dynamic database/)
  assert.doesNotMatch(page, /LB1|lb1|report\/automation/)
})

test('a diagnosis typed as words finds codes but is never shown as a code to convert ("Pneumonia")', () => {
  const response = lookupIcdDynamically('Pneumonia')
  assert.ok(response.results.length > 0)
  assert.deepEqual(response.rows, [])
})

test('a code typed by the doctor still gets its conversion row', () => {
  assert.equal(lookupIcdDynamically('J18.9').rows[0]?.legacy, 'J18.9')
})

test('on the real catalogue a misspelt "pnemonia" is redirected to pneumonia, plainest code first', () => {
  const response = lookupIcdDynamically('pnemonia')
  assert.equal(response.correctedQuery, 'pneumonia')
  assert.equal(response.results[0]?.code, 'J18.9')
})

test('a correctly spelt "Pneumonia" puts "Pneumonia, unspecified" first, not sepsis', () => {
  const response = lookupIcdDynamically('Pneumonia')
  assert.equal(response.results[0]?.code, 'J18.9')
  assert.equal(response.correctedQuery, undefined)
})

test('Indonesian disease names from the KKI list find their code, typos included', () => {
  const codes = lookupIcdDynamically('hipertnsi').results.map((r) => r.code)
  assert.ok(codes.slice(0, 5).some((code) => code.startsWith('I10')), codes.slice(0, 5).join(','))
})

test('the page says where a misspelling was redirected and offers the AI pick through the guarded route', () => {
  const page = read('src/app/icdx/page.tsx')
  assert.match(page, /Menampilkan hasil untuk/)
  assert.match(page, /\/api\/icdx\/rank/)
  const route = read('src/app/api/icdx/rank/route.ts')
  assert.ok(route.indexOf('isCrewAuthorizedRequest(request)') < route.indexOf('pickBestIcd('))
})

test('the page is compact on MedBoard tokens: one module stylesheet, no numbered stream phases, no inline token object', () => {
  const page = read('src/app/icdx/page.tsx')
  assert.match(page, /import styles from '\.\/icdx\.module\.css'/)
  assert.doesNotMatch(page, /useL\(|emr-phase-label|clinical-stream|var\(--c-asesmen\)/)
})

test('choosing a code opens its detail with subcodes and its parent (Chief 2026-10-07: "pilih A00")', () => {
  const a00 = icdCodeDetail('A00')
  assert.ok(a00)
  assert.equal(a00.name, 'Cholera')
  assert.equal(a00.in2010, true)
  assert.equal(a00.parent, null)
  assert.deepEqual(a00.children.map((child) => child.code), ['A00.0', 'A00.1', 'A00.9'])
  assert.equal(icdCodeDetail('a00.1')?.parent?.code, 'A00')
  assert.equal(icdCodeDetail('Q99.99'), null)
})

test('under the chosen code a timeline says which ICD version Indonesia uses and where (PCare, ePuskesmas)', () => {
  // Chief: only the ICD Indonesia uses (PCare) and the reference most used in the world.
  assert.deepEqual(ICD_TIMELINE.map((stop) => stop.year), ['2010', '2019'])
  const [indonesia, world] = ICD_TIMELINE
  assert.deepEqual(indonesia.systems, ['PCare BPJS', 'ePuskesmas', 'E-Claim'])
  // Chief: the systems line is tosca, not red.
  assert.match(read('src/app/icdx/icdx.module.css'), /\.systems \{[^}]*color: var\(--tosca\)/)
  assert.match(read('src/app/globals.css'), /--tosca: #0f766e;/)
  assert.deepEqual(world.systems, [])
  // Chief: short labels, no sentences ("buat ringkas, misal Worldwide ICD").
  assert.deepEqual(ICD_TIMELINE.map((stop) => stop.label), ['ICD Indonesia', 'Worldwide ICD'])
  assert.equal(icdCodeDetail('A00')?.worldwideCode, 'A00')
  assert.match(read('src/app/icdx/IcdTimeline.tsx'), /worldwideCode/)
  const page = read('src/app/icdx/page.tsx')
  assert.match(page, /\/api\/icdx\/code\?code=/)
  assert.match(read('src/app/icdx/IcdTimeline.tsx'), /<ol className=\{styles\.timeline\} aria-label="Pemakaian kode di Indonesia">/)
  assert.doesNotMatch(page, /activeYear/)
})

test('the timeline moves when a code is chosen, calmly, and stands still for less motion (Chief: "harus Motion")', () => {
  const page = read('src/app/icdx/page.tsx')
  assert.match(page, /<IcdTimeline\s+key=\{selected\.code\}/)
  const timeline = read('src/app/icdx/IcdTimeline.tsx')
  assert.match(timeline, /from 'motion\/react'/)
  assert.match(timeline, /scaleY/)
  assert.match(timeline, /useReducedMotion\(\)/)
  assert.match(timeline, /initial=\{still \? false :/)
  assert.doesNotMatch(timeline, /type:\s*'spring'|bounce:/)
})

test('chapter labels are words, not capitals: "CHAPTER A" shows as "Bab A"', () => {
  assert.ok(read('src/app/icdx/page.tsx').includes(String.raw`replace(/^CHAPTER\s+/i, 'Bab ')`))
})

test('under the ICD versions, referral help: I10 is FKTP work, and its hospital-level relatives are listed', () => {
  const referral = icdCodeDetail('I10')?.referral
  assert.ok(referral)
  assert.equal(referral.authority, 'fktp')
  assert.deepEqual(referral.related.map((item) => item.code), ['I11', 'I12', 'I13', 'I15', 'I21', 'I50', 'I25', 'I20'])
  assert.equal(icdCodeDetail('K35')?.referral.authority, 'rs')
  const panel = read('src/app/icdx/IcdReferral.tsx')
  assert.match(panel, /aria-label="Rujukan"/)
  assert.match(panel, /TACC/)
  assert.match(read('src/app/icdx/page.tsx'), /<IcdReferral/)
})

test('Asma: after the ICD versions a line leads down to "Rujuk?", which opens the related referable codes', () => {
  const related = icdCodeDetail('J45.9')?.referral.related.map((item) => item.code) ?? []
  for (const code of ['J44', 'J46', 'J47']) assert.ok(related.includes(code), related.join(','))
  assert.equal(icdCodeDetail('J45')?.referral.fktpMatch?.name, 'Asma Bronkiale')
  const panel = read('src/app/icdx/IcdReferral.tsx')
  assert.match(panel, /aria-expanded=\{open\}/)
  assert.match(panel, />\s*Rujuk\?\s*</)
  assert.match(panel, /className=\{styles\.connector\}/)
  assert.match(read('src/app/icdx/page.tsx'), /<IcdReferral\s+key=\{selected\.code\}/)
})

test('each code in the ICD versions has a black neumorphic Copy button (Chief 2026-10-07)', () => {
  const timeline = read('src/app/icdx/IcdTimeline.tsx')
  assert.match(timeline, /navigator\.clipboard\.writeText\(code\)/)
  assert.match(timeline, /className=\{cx\('ui-btn ui-btn--secondary', styles\.copy\)\}/)
  // The label stays "Copy" so the line never re-wraps; only the icon turns to a check.
  assert.match(timeline, /\)\}\s+Copy\s+<\/button>/)
  assert.match(timeline, /state === 'copied' \? \(\s*<Check/)
  assert.equal(timeline.match(/<CopyCode code=/g)?.length, 2)
})

test('the results list has a thin, quiet scrollbar (Chief: "tipis saja, halus")', () => {
  const css = read('src/app/icdx/icdx.module.css')
  assert.match(css, /\.list::-webkit-scrollbar \{ width: 4px; \}/)
  assert.match(css, /\.list::-webkit-scrollbar-thumb \{ background: var\(--border\); border-radius: 999px; \}/)
})

test('on desktop the results list runs as tall as the detail panel, at least 75vh (Chief: panjang vertikal)', () => {
  assert.match(read('src/app/icdx/icdx.module.css'), /\.list \{ flex: 1 1 0; max-height: none; min-height: 75vh; \}/)
})

test('the AI pick button is named "Sentra Algorithme" (Chief 2026-10-07)', () => {
  const page = read('src/app/icdx/page.tsx')
  assert.match(page, /'Sentra Algorithme'/)
  assert.doesNotMatch(page, /Pilihkan yang terbaik dengan AI/)
})
