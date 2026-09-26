'use client'

import { Stack, Tag } from '@carbon/react'

export interface ChiefComplaintData {
  mainComplaint: string
  symptoms: string[]
  timeline: string
  riskFactors: string[]
}

interface ChiefComplaintCardProps {
  data: ChiefComplaintData
}

export function ChiefComplaintCard({ data }: ChiefComplaintCardProps) {
  return (
    <section className="medlink-panel medlink-context-card medlink-open-panel">
      <Stack gap={7}>
        <div className="medlink-panel__heading">
          <div>
            <p className="medlink-panel__label">Input summary</p>
            <h3>Clinical Query Context</h3>
          </div>
        </div>

        <p className="medlink-context-card__query">{data.mainComplaint}</p>

        <div className="medlink-context-card__group">
          <p className="medlink-context-card__label">Referral signals</p>
          {data.symptoms.length > 0 ? (
            <div className="medlink-tag-list">
              {data.symptoms.map((symptom, index) => (
                <Tag key={index} type="red">
                  {symptom}
                </Tag>
              ))}
            </div>
          ) : (
            <p className="medlink-panel__empty-copy">
              No structured referral signals are available yet.
            </p>
          )}
        </div>

        <div className="medlink-context-card__group">
          <p className="medlink-context-card__label">Clinical notes</p>
          <p className="medlink-context-card__note">{data.timeline}</p>
        </div>

        <div className="medlink-context-card__group">
          <p className="medlink-context-card__label">Decision guardrails</p>
          <div className="medlink-tag-list">
            {data.riskFactors.map((factor, index) => (
              <Tag key={index} type="cool-gray">
                {factor}
              </Tag>
            ))}
          </div>
        </div>
      </Stack>
    </section>
  )
}
