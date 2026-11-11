'use client'

import { Button, Stack, Tag, TextInput, Tile } from '@carbon/react'
import { useState } from 'react'

import { ICD10_LEGACY_MASTER_SUMMARY } from '../../data/icd10LegacyCatalog'
import {
  getIcd10LegacyMatchExplanation,
  searchIcd10LegacyCatalog,
  type Icd10LegacySearchResult,
} from '../../services/icd10LegacyTranslator'

function matchLabel(kind: Icd10LegacySearchResult['match']['kind']) {
  return kind === 'exact-code' || kind === 'exact-label' ? 'Exact match' : 'Possible match'
}

function matchTagType(kind: Icd10LegacySearchResult['match']['kind']) {
  return kind === 'exact-code' || kind === 'exact-label' ? 'green' : 'warm-gray'
}

export function Icd10LegacyTranslator() {
  const [query, setQuery] = useState('')
  const trimmedQuery = query.trim()
  const results = trimmedQuery ? searchIcd10LegacyCatalog(trimmedQuery) : []

  return (
    <Tile className="medlink-panel medlink-translator" aria-labelledby="icd10-translator-title">
      <Stack gap={7}>
        <div className="medlink-panel__heading">
          <div>
            <p className="medlink-panel__label">Coding support</p>
            <h2 id="icd10-translator-title">ICD-10 Legacy Translator</h2>
          </div>
          <span className="medlink-panel__hint">
            {ICD10_LEGACY_MASTER_SUMMARY.entryCount.toLocaleString('en-US')}-entry{' '}
            {ICD10_LEGACY_MASTER_SUMMARY.versions.join(', ')} master
          </span>
        </div>

        <p className="medlink-translator__intro">
          Search a clinical term, Indonesian phrasing, common shorthand, or ICD-10 code. This
          supports review and does not determine final coding.
        </p>

        <div className="medlink-translator__disclaimer" role="note">
          <strong>Official master source.</strong> This translator uses the uploaded ICD-10 e-klaim
          workbook as the local MEDLINK code-and-label source of truth. It still supports review and
          does not replace final human coding verification.
        </div>

        <div className="medlink-translator__crosswalk-note" role="note">
          <strong>Crosswalk rule.</strong> Sentrapedia terms are used only as an Indonesian clinical
          enrichment layer. ICD codes and official labels still come from the MEDLINK ICD master
          workbook import.
        </div>

        <div className="medlink-translator__match-guide" aria-label="Match guide">
          <span>
            <Tag type="green">Exact match</Tag> Code or full official label.
          </span>
          <span>
            <Tag type="warm-gray">Possible match</Tag> Editorial alias, Sentrapedia crosswalk term,
            or partial label; verify before final coding.
          </span>
        </div>

        <TextInput
          id="icd10-legacy-query"
          labelText="Clinical term or ICD-10 code"
          placeholder="Examples: darah tinggi, ISPA, I10"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {!trimmedQuery ? (
          <div className="medlink-empty-state">
            <span className="medlink-empty-state__mark" aria-hidden="true" />
            <div>
              <h4>Ready for lookup</h4>
              <p>Exact code matches are shown separately from possible terminology matches.</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="medlink-empty-state">
            <span className="medlink-empty-state__mark" aria-hidden="true" />
            <div>
              <h4>No match in this ICD master</h4>
              <p>
                No result was found in the local workbook-backed master or its allowed enrichment
                layer. Verify through an approved coding reference.
              </p>
            </div>
          </div>
        ) : (
          <div className="medlink-translator__results" aria-live="polite">
            {results.map(({ entry, enrichment, match }) => (
              <article key={entry.code} className="medlink-translator__result">
                <div className="medlink-translator__result-heading">
                  <div>
                    <p className="medlink-translator__code">{entry.code}</p>
                    <h3>{entry.officialLabel}</h3>
                  </div>
                  <Tag type={matchTagType(match.kind)}>{matchLabel(match.kind)}</Tag>
                </div>
                <dl className="medlink-translator__details">
                  <div>
                    <dt>Official label</dt>
                    <dd>{entry.officialLabel}</dd>
                  </div>
                  <div>
                    <dt>Matched term</dt>
                    <dd>{match.term}</dd>
                  </div>
                  <div>
                    <dt>Match basis</dt>
                    <dd>{getIcd10LegacyMatchExplanation(match)}</dd>
                  </div>
                  {enrichment ? (
                    <>
                      <div>
                        <dt>Sentrapedia term</dt>
                        <dd>{enrichment.sentrapediaName}</dd>
                      </div>
                      <div>
                        <dt>Crosswalk bucket</dt>
                        <dd>{enrichment.bucket}</dd>
                      </div>
                      <div>
                        <dt>Sentrapedia code</dt>
                        <dd>{enrichment.sentrapediaCode}</dd>
                      </div>
                      <div>
                        <dt>Referral context</dt>
                        <dd>
                          {enrichment.referralContext ||
                            'No referral note captured in the local extract.'}
                        </dd>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <dt>Coding note</dt>
                    <dd>{entry.note}</dd>
                  </div>
                </dl>
                <p className="medlink-translator__source">{entry.source}</p>
              </article>
            ))}
          </div>
        )}

        <Button kind="tertiary" size="sm" onClick={() => setQuery('')} disabled={!query}>
          Clear lookup
        </Button>
      </Stack>
    </Tile>
  )
}
