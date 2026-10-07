import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { awardsFor, summarizeRank } from '@/lib/crew-rank'

import { RankAwardCard } from './RankAwardCard'

test('progress names both needs for the next level', () => {
  const html = renderToStaticMarkup(<RankAwardCard rank={summarizeRank(18, 31 * 3600)} awards={awardsFor([])} />)
  assert.match(html, /18 \/ 25 kasus/)
  assert.match(html, /31 \/ 50 jam/)
})

test('a reached award carries its date; the other seven are dimmed', () => {
  // The 25th report is 2026-10-02 00:00 UTC, 07.00 WIB on 2 October.
  const dates = Array.from({ length: 25 }, (_, i) => new Date(Date.UTC(2026, 9, 1, i)))
  const html = renderToStaticMarkup(<RankAwardCard rank={summarizeRank(25, 0)} awards={awardsFor(dates)} />)
  assert.match(html, /2 Okt 2026/)
  assert.equal((html.match(/data-reached="false"/g) ?? []).length, 7)
})

test('at Legendary there is no next level to chase', () => {
  const html = renderToStaticMarkup(
    <RankAwardCard rank={summarizeRank(5000, 10000 * 3600)} awards={awardsFor([])} />
  )
  assert.match(html, /Level tertinggi/)
  assert.doesNotMatch(html, /undefined/)
})
