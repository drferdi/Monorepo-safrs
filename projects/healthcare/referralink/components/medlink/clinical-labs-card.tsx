'use client'

import { Stack, Accordion, AccordionItem } from '@carbon/react'

export interface LabValue {
  name: string
  value: string
  unit: string
  normal: string
  status: 'normal' | 'low' | 'high'
}

interface ClinicalLabsCardProps {
  physicalExam: string[]
  labValues: LabValue[]
  imagingSummary: string
}

export function ClinicalLabsCard({
  physicalExam,
  labValues,
  imagingSummary,
}: ClinicalLabsCardProps) {
  return (
    <section className="medlink-panel medlink-evidence-card medlink-open-panel">
      <Stack gap={7}>
        <div className="medlink-panel__heading">
          <div>
            <p className="medlink-panel__label">Supporting evidence</p>
            <h3>Clinical Evidence Signals</h3>
          </div>
          <span className="medlink-panel__hint">Engine-derived only</span>
        </div>

        <Accordion>
          <AccordionItem title="Clinical notes" open>
            <Stack gap={4}>
              {physicalExam.map((finding, index) => (
                <div key={index} className="medlink-evidence-card__finding">
                  <p>{finding}</p>
                </div>
              ))}
            </Stack>
          </AccordionItem>

          <AccordionItem title="Structured markers">
            {labValues.length > 0 ? (
              <div className="medlink-evidence-card__table-wrap">
                <table className="medlink-evidence-card__table">
                  <thead>
                    <tr>
                      <th>Signal</th>
                      <th>Result</th>
                      <th>Unit</th>
                      <th>Range</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labValues.map((lab, index) => (
                      <tr key={index}>
                        <td>{lab.name}</td>
                        <td>{lab.value}</td>
                        <td>{lab.unit || '—'}</td>
                        <td>{lab.normal}</td>
                        <td>
                          <span
                            className={`medlink-evidence-card__status medlink-evidence-card__status--${lab.status}`}
                          >
                            {lab.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="medlink-panel__empty-copy">
                No structured markers were returned for this request.
              </p>
            )}
          </AccordionItem>

          <AccordionItem title="Referral interpretation">
            <p className="medlink-evidence-card__summary">{imagingSummary}</p>
          </AccordionItem>
        </Accordion>
      </Stack>
    </section>
  )
}
