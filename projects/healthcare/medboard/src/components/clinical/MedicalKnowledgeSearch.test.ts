import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('MedicalKnowledgeSearch renders a labeled search panel', async () => {
  let mod: any = null
  try {
    mod = await import('./MedicalKnowledgeSearch')
  } catch {
    mod = null
  }

  assert.ok(mod?.MedicalKnowledgeSearch, 'Expected ./MedicalKnowledgeSearch.tsx to export MedicalKnowledgeSearch')

  const html = renderToStaticMarkup(React.createElement(mod.MedicalKnowledgeSearch))
  assert.match(html, /Pencarian Pengetahuan Medis/i)
})
