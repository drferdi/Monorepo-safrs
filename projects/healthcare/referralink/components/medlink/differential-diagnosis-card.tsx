'use client'

import { Information } from '@carbon/icons-react'
import { Button, Stack, Tag, Tooltip } from '@carbon/react'

export interface Diagnosis {
  id: string
  name: string
  code?: string
  confidence?: number
  urgency: 'high' | 'moderate' | 'low'
  supportingSignals: string[]
  contextTags: string[]
  justification: string
}

interface DifferentialDiagnosisCardProps {
  diagnoses: Diagnosis[]
  onSelect: (diagnosis: Diagnosis) => void
  selectedId?: string
}

function getUrgencyColor(urgency: Diagnosis['urgency']) {
  if (urgency === 'high') return 'red'
  if (urgency === 'moderate') return 'warm-gray'
  return 'green'
}

export function DifferentialDiagnosisCard({
  diagnoses,
  onSelect,
  selectedId,
}: DifferentialDiagnosisCardProps) {
  const primaryDiagnosis = diagnoses[0]

  return (
    <section className="medlink-panel medlink-candidate-card">
      <Stack gap={7}>
        <div className="medlink-panel__heading">
          <div>
            <p className="medlink-panel__label">Engine output</p>
            <h3>Primary Referral Candidate</h3>
          </div>
          {primaryDiagnosis ? (
            <Tag type={getUrgencyColor(primaryDiagnosis.urgency)}>{primaryDiagnosis.urgency}</Tag>
          ) : null}
        </div>

        {diagnoses.map((diagnosis, index) => {
          const isSelected = selectedId === diagnosis.id
          const isPrimary = index === 0
          return (
            <div
              key={diagnosis.id}
              className={`medlink-candidate ${isSelected ? 'medlink-candidate--selected' : ''} ${isPrimary ? 'medlink-candidate--primary' : ''}`}
            >
              <div className="medlink-candidate__header">
                <div className="medlink-candidate__identity">
                  <span className="medlink-candidate__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="medlink-candidate__type">
                      {isPrimary ? 'Primary result' : 'Referral option'}
                    </p>
                    <h4>{diagnosis.name}</h4>
                    <p className="medlink-candidate__meta">
                      {diagnosis.code || 'Code unavailable'}
                      {typeof diagnosis.confidence === 'number'
                        ? ` · Triage ${diagnosis.confidence}/10`
                        : ''}
                    </p>
                  </div>
                </div>
                <Tag type={getUrgencyColor(diagnosis.urgency)}>{diagnosis.urgency}</Tag>
              </div>

              <p className="medlink-candidate__reasoning">{diagnosis.justification}</p>

              <details className="medlink-candidate__disclosure">
                <summary className="medlink-candidate__disclosure-summary">
                  {isPrimary ? 'Clinical evidence' : 'Referral evidence'}
                </summary>
                <div className="medlink-candidate__disclosure-body">
                  <div className="medlink-candidate__context">
                    <div>
                      <p>Supporting signals</p>
                      {diagnosis.supportingSignals.length ? (
                        <div className="medlink-tag-list">
                          {diagnosis.supportingSignals.map((signal) => (
                            <Tag key={signal} type="cool-gray">
                              {signal}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <span className="medlink-panel__empty-copy">Not returned</span>
                      )}
                    </div>
                    <div>
                      <div className="medlink-candidate__context-label">
                        Referral context{' '}
                        <Tooltip
                          label="Validated metadata returned by the active engine"
                          align="top"
                        >
                          <Information size={14} />
                        </Tooltip>
                      </div>
                      {diagnosis.contextTags.length ? (
                        <div className="medlink-tag-list">
                          {diagnosis.contextTags.map((tag) => (
                            <Tag key={tag} type="blue">
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <span className="medlink-panel__empty-copy">Not returned</span>
                      )}
                    </div>
                  </div>
                </div>
              </details>

              <Button
                size="sm"
                kind={isSelected ? 'primary' : 'tertiary'}
                onClick={() => onSelect(diagnosis)}
              >
                {isSelected ? 'Selected for referral brief' : 'Review referral path'}
              </Button>
            </div>
          )
        })}
      </Stack>
    </section>
  )
}
