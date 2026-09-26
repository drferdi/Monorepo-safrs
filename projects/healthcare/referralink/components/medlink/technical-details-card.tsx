'use client'

import { ChartNetwork, Catalog, CloudDataOps } from '@carbon/icons-react'
import { Stack, Tag } from '@carbon/react'

const architectureItems = [
  {
    icon: ChartNetwork,
    title: 'Referral reasoning engine',
    copy: 'MEDLINK combines the clinical query, available evidence, and referral-priority signals into reviewable referral candidates.',
  },
  {
    icon: CloudDataOps,
    title: 'Clinical input boundary',
    copy: 'The workspace uses the submitted clinical context only. EHR integration and patient identity are not active in this local build.',
  },
  {
    icon: Catalog,
    title: 'Review guardrail',
    copy: 'Every output is decision support for clinician review. MEDLINK does not replace the responsible clinician’s judgement.',
  },
]

export function TechnicalDetailsCard() {
  return (
    <section className="medlink-panel medlink-technical-card medlink-open-panel">
      <div className="medlink-panel__heading">
        <div>
          <p className="medlink-panel__label">Workspace reference</p>
          <h3>MEDLINK operating context</h3>
        </div>
      </div>
      <Stack gap={6} className="medlink-technical-card__items">
        {architectureItems.map(({ icon: Icon, title, copy }) => (
          <div className="medlink-technical-card__item" key={title}>
            <Icon size={20} aria-hidden="true" />
            <div>
              <h4>{title}</h4>
              <p>{copy}</p>
            </div>
          </div>
        ))}
      </Stack>
      <div className="medlink-technical-card__tags">
        <Tag type="cool-gray">Clinical workspace</Tag>
        <Tag type="cool-gray">Human review</Tag>
        <Tag type="cool-gray">Referral signals</Tag>
      </div>
    </section>
  )
}
