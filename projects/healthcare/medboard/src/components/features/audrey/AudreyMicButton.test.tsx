// Drferdi — Tests for AudreyMicButton component
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { AudreyMicButton, type AudreyMicState } from './AudreyMicButton'

function renderButton(state: AudreyMicState, disabled = false): string {
  return renderToStaticMarkup(
    createElement(AudreyMicButton, { state, onPress: () => {}, disabled })
  )
}

// ── Render states ─────────────────────────────────────────────────────────────

describe('AudreyMicButton — render states', () => {
  it('renders idle state', () => {
    const html = renderButton('idle')
    assert.ok(html.includes('button'), 'should render a button element')
    assert.ok(html.includes('Mulai dikte'), 'idle aria-label should be "Mulai dikte"')
  })

  it('renders listening state with stop label', () => {
    const html = renderButton('listening')
    assert.ok(html.includes('Sedang mendengarkan'), 'listening aria-label')
  })

  it('renders processing state', () => {
    const html = renderButton('processing')
    assert.ok(html.includes('Memproses transkripsi'), 'processing aria-label')
  })

  it('renders error state', () => {
    const html = renderButton('error')
    assert.ok(html.includes('Gagal'), 'error aria-label')
  })
})

// ── Accessibility ─────────────────────────────────────────────────────────────

describe('AudreyMicButton — accessibility', () => {
  const states: AudreyMicState[] = ['idle', 'listening', 'processing', 'error']

  for (const state of states) {
    it(`has aria-label for state: ${state}`, () => {
      const html = renderButton(state)
      assert.ok(html.includes('aria-label='), `${state} should have aria-label`)
    })
  }

  it('button type is "button" (not submit)', () => {
    const html = renderButton('idle')
    assert.ok(html.includes('type="button"'), 'should be type="button"')
  })
})

// ── Disabled state ────────────────────────────────────────────────────────────

describe('AudreyMicButton — disabled', () => {
  it('renders disabled when prop is true', () => {
    const html = renderButton('idle', true)
    assert.ok(html.includes('disabled'), 'should have disabled attribute')
  })

  it('renders disabled during processing', () => {
    const html = renderButton('processing', false)
    assert.ok(html.includes('disabled'), 'processing state should be disabled')
  })
})
