'use client'

import { Button, Tile } from '@carbon/react'
import { lazy, Suspense, useEffect, useState } from 'react'

const Icd10LegacyTranslator = lazy(() =>
  import('./icd10-legacy-translator').then((module) => ({
    default: module.Icd10LegacyTranslator,
  }))
)

const TRANSLATOR_HASH = '#icd10-legacy-translator'

function TranslatorPlaceholder({ onOpen }: { onOpen: () => void }) {
  return (
    <Tile className="medlink-panel medlink-translator">
      <div className="medlink-panel__heading">
        <div>
          <p className="medlink-panel__label">Coding support</p>
          <h2>ICD-10 Legacy Translator</h2>
        </div>
        <span className="medlink-panel__hint">Available on demand</span>
      </div>
      <p className="medlink-translator__intro">
        Open the translator to load the local ICD-10 master without adding it to the initial
        referral workspace payload.
      </p>
      <Button kind="tertiary" size="sm" onClick={onOpen}>
        Open ICD-10 translator
      </Button>
    </Tile>
  )
}

function TranslatorLoadingState() {
  return (
    <Tile className="medlink-panel medlink-translator" aria-live="polite">
      <div className="medlink-panel__heading">
        <div>
          <p className="medlink-panel__label">Coding support</p>
          <h2>ICD-10 Legacy Translator</h2>
        </div>
        <span className="medlink-panel__hint">Loading master</span>
      </div>
      <p className="medlink-translator__intro">Loading the local ICD-10 master for review.</p>
    </Tile>
  )
}

export function LazyIcd10LegacyTranslator() {
  const [shouldLoadTranslator, setShouldLoadTranslator] = useState(false)

  useEffect(() => {
    const loadFromTranslatorNavigation = () => {
      if (window.location.hash === TRANSLATOR_HASH) {
        setShouldLoadTranslator(true)
      }
    }

    loadFromTranslatorNavigation()
    window.addEventListener('hashchange', loadFromTranslatorNavigation)
    return () => window.removeEventListener('hashchange', loadFromTranslatorNavigation)
  }, [])

  return (
    <div id="icd10-legacy-translator">
      {shouldLoadTranslator ? (
        <Suspense fallback={<TranslatorLoadingState />}>
          <Icd10LegacyTranslator />
        </Suspense>
      ) : (
        <TranslatorPlaceholder onOpen={() => setShouldLoadTranslator(true)} />
      )}
    </div>
  )
}
