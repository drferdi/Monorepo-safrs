'use client'

import { Stack, Tag } from '@carbon/react'

import type { ICD10Result, ProposedReferral } from '../../types'

import type { Diagnosis } from './differential-diagnosis-card'

interface ReferralMappingCardProps {
  result?: ICD10Result | null
  selectedDiagnosis?: Diagnosis
}

function getKompetensiLabel(value?: string) {
  return value ? `Kompetensi ${value}` : 'Not specified'
}

function getSelectedReferral(
  selectedDiagnosis: Diagnosis | undefined,
  referrals: ProposedReferral[]
) {
  if (!selectedDiagnosis) return referrals[0]
  return referrals.find((item) => item.code === selectedDiagnosis.code) || referrals[0]
}

export function ReferralMappingCard({ result, selectedDiagnosis }: ReferralMappingCardProps) {
  const referrals = result?.proposed_referrals || []
  const selectedReferral = getSelectedReferral(selectedDiagnosis, referrals)

  return (
    <section className="medlink-panel medlink-referral-card">
      <Stack gap={7}>
        <div className="medlink-panel__heading">
          <div>
            <p className="medlink-panel__label">Referral planning</p>
            <h3>Referral Options</h3>
          </div>
          <span className="medlink-panel__hint">
            {referrals.length ? `${referrals.length} returned` : 'No referral proposed'}
          </span>
        </div>

        {result && referrals.length === 0 ? (
          <div className="medlink-referral-card__no-referral">
            <strong>No referral indicated</strong>
            <p>
              Low-risk engine result: routine urgency, triage score at or below five, and no red
              flags.
            </p>
            <span>
              Belum terverifikasi terhadap ruleset BPJS · clinician review remains required.
            </span>
          </div>
        ) : result && selectedReferral ? (
          <>
            <div className="medlink-referral-card__summary">
              <div>
                <p>Selected referral</p>
                <strong>{selectedReferral?.description}</strong>
                <span>{selectedReferral?.code}</span>
              </div>
              <div>
                <p>Referral level</p>
                <strong>{getKompetensiLabel(selectedReferral.kompetensi)}</strong>
                <span>{selectedReferral.urgency}</span>
              </div>
            </div>

            <details className="medlink-referral-card__brief">
              <summary className="medlink-referral-card__brief-summary">Tujuan layanan</summary>
              <div className="medlink-referral-card__brief-body">
                <strong>{selectedReferral?.destination_service}</strong>
                <span>{selectedReferral?.facility_level}</span>
              </div>
            </details>
            <details className="medlink-referral-card__brief">
              <summary className="medlink-referral-card__brief-summary">Alasan rujukan</summary>
              <div className="medlink-referral-card__brief-body">
                <p>{selectedReferral?.referral_reason}</p>
              </div>
            </details>
            <details className="medlink-referral-card__brief">
              <summary className="medlink-referral-card__brief-summary">
                Kapabilitas dibutuhkan
              </summary>
              <div className="medlink-referral-card__brief-body">
                <p>{selectedReferral?.required_capability}</p>
              </div>
            </details>

            <div>
              <p className="medlink-referral-card__list-label">Options returned by engine</p>
              <Stack gap={3}>
                {referrals.map((item) => {
                  const isSelected = selectedReferral?.code === item.code
                  return (
                    <details
                      key={item.code}
                      className={`medlink-referral-option ${isSelected ? 'medlink-referral-option--selected' : ''}`}
                    >
                      <summary className="medlink-referral-option__summary">
                        <span>
                          <strong>{item.description}</strong>
                          <small>
                            {item.code} · {item.destination_service}
                          </small>
                        </span>
                        <Tag type="blue">{getKompetensiLabel(item.kompetensi)}</Tag>
                      </summary>
                      <div className="medlink-referral-option__body">
                        <p>{item.clinical_reasoning}</p>
                        <dl>
                          <div>
                            <dt>Facility</dt>
                            <dd>{item.facility_level}</dd>
                          </div>
                          <div>
                            <dt>Urgency</dt>
                            <dd>{item.urgency}</dd>
                          </div>
                          <div>
                            <dt>Reason</dt>
                            <dd>{item.referral_reason}</dd>
                          </div>
                          <div>
                            <dt>Capability</dt>
                            <dd>{item.required_capability}</dd>
                          </div>
                        </dl>
                      </div>
                    </details>
                  )
                })}
              </Stack>
            </div>
            <p className="medlink-referral-card__guardrail">
              Belum terverifikasi terhadap ruleset BPJS. Final referral requires clinician review.
            </p>
          </>
        ) : (
          <div className="medlink-empty-state">
            <div>
              <h4>Referral options will appear here</h4>
              <p>MEDLINK presents only validated paths returned by the active engine.</p>
            </div>
          </div>
        )}
      </Stack>
    </section>
  )
}
