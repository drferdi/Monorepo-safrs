import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { NAV_GROUPS } from '../../components/shell/nav-items'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')
const page = read('src/app/atlas/page.tsx')
const scene = read('src/app/atlas/AtlasScene.tsx')

test('Atlas Anatomi sits in the Klinis rail group', () => {
  const clinical = NAV_GROUPS.find((group) => group.label === 'Klinis')
  assert.ok(clinical?.items.some((item) => item.href === '/atlas' && item.label === 'Atlas Anatomi'))
})

test('the CC BY credits travel with the page: licence, source, publication and full attribution', () => {
  assert.equal(existsSync(path.join(process.cwd(), 'public/atlas/ATTRIBUTION.md')), true)
  for (const link of ['source.licence', 'source.download', 'source.publication', '/atlas/ATTRIBUTION.md']) {
    assert.ok(page.includes(link), link)
  }
})

test('the screen speaks Indonesian: no Arabic and none of the source English interface text', () => {
  const english = [
    'Find a structure', 'Explode anatomy', 'Isolate structure', 'Clear selection', 'Reset', 'Systems', 'Hide all',
    'Drag to orbit', 'Preparing the anatomy', 'reference body', 'could not',
  ]
  for (const file of [page, scene]) {
    assert.doesNotMatch(file, /[؀-ۿ]/)
    for (const phrase of english) assert.ok(!file.includes(`'${phrase}`) && !file.includes(`>${phrase}`), phrase)
  }
})

test('the 3D scene loads in the browser only, and wheel zoom is kept from the page scroll', () => {
  assert.match(page, /dynamic\(\(\) => import\('\.\/AtlasScene'\), \{ ssr: false \}\)/)
  assert.match(scene, /data-lenis-prevent/)
})
