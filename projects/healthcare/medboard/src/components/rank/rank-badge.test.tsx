import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { summarizeRank } from '@/lib/crew-rank'

import { LevelEdge, RankBadge } from './RankBadge'

test('the badge names the rank in words under the image', () => {
  const html = renderToStaticMarkup(<RankBadge rank={summarizeRank(80, 160 * 3600)} size={64} />)
  assert.match(html, /residen_senior\.png/)
  assert.match(html, /Lv\.3 · Residen Senior/)
})

test('a missing rank shows an Intern badge, never a broken image', () => {
  assert.match(renderToStaticMarkup(<RankBadge rank={null} size={48} />), /Lv\.1 · Intern/)
})

test('CEO and Administrator are text at the card edge; a User gets nothing', () => {
  assert.match(renderToStaticMarkup(<LevelEdge role="CEO_SENTRA" />), />CEO</)
  assert.match(renderToStaticMarkup(<LevelEdge role="ADMINISTRATOR" />), />Administrator</)
  assert.equal(renderToStaticMarkup(<LevelEdge role="DOKTER" />), '')
})

test('no profile spot still shows the old CEO or admin insignia', () => {
  for (const file of [
    'src/app/page.tsx',
    'src/app/hub/page.tsx',
    'src/app/hub/[username]/page.tsx',
    'src/app/hub/lab/[username]/page.tsx',
  ]) {
    const source = readFileSync(file, 'utf-8')
    assert.doesNotMatch(source, /\/ceo\.png|\/admin\.png|resolveCrewRankBadgeSrc|getRankBadgeSrc/, file)
  }
})
