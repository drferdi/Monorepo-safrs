import { Checkmark, Launch, Settings } from '@carbon/icons-react'
import { useState } from 'react'

import { useCredentialMetadata } from '../hooks/useCredentialMetadata'
import { useLogbookRecords } from '../hooks/useLogbookRecords'

type SettingsDashboardProps = {
  onOpenLogbook: () => void
}

export default function SettingsDashboard({ onOpenLogbook }: SettingsDashboardProps) {
  const { records, storageStatus: logbookStorage } = useLogbookRecords()
  const { records: credentials, storageStatus: credentialStorage } = useCredentialMetadata()
  const [compact, setCompact] = useState(false)

  return (
    <main
      id="main-content"
      className={`db01-operational-page${compact ? ' db01-operational-page--compact' : ''}`}
    >
      <header className="db01-operational-topbar">
        <Settings size={20} aria-hidden="true" />
        <span>Setting · Workspace preferences</span>
      </header>
      <div className="db01-operational-content">
        <section className="db01-operational-hero">
          <div>
            <p className="db01-operational-eyebrow">Local workspace configuration</p>
            <h1>Setting</h1>
            <p>Review the active sandbox boundaries and adjust presentation preferences.</p>
          </div>
        </section>
        <p className="db01-operational-note">
          MEDLINK is a synthetic public sandbox. Settings below affect this browser session only; no
          clinical records or secrets are managed here.
        </p>
        <section className="db01-settings-grid" aria-label="Workspace settings">
          <article className="db01-settings-card">
            <p className="db01-operational-eyebrow">Workspace mode</p>
            <h2>Public synthetic sandbox</h2>
            <p>Patient identifiers, PHI, EMR workflows, and clinical decisions are out of scope.</p>
            <span className="db01-settings-status">
              <Checkmark size={16} /> Active boundary
            </span>
          </article>
          <article className="db01-settings-card">
            <p className="db01-operational-eyebrow">Active engine</p>
            <h2>MEDLINK</h2>
            <p>Validated ICD-10 and referral analysis endpoint with clinician review required.</p>
            <span className="db01-settings-status">
              <Checkmark size={16} /> Ready for analysis
            </span>
          </article>
          <article className="db01-settings-card">
            <p className="db01-operational-eyebrow">Local storage</p>
            <h2>
              {logbookStorage === 'ready' && credentialStorage === 'ready'
                ? 'Available'
                : 'Session fallback'}
            </h2>
            <p>
              {records.length} Logbook records · {credentials.length} credential metadata records.
            </p>
            <span className="db01-settings-status">
              <Checkmark size={16} />{' '}
              {logbookStorage === 'ready' && credentialStorage === 'ready'
                ? 'IndexedDB boundary'
                : 'Memory fallback'}
            </span>
          </article>
          <article className="db01-settings-card">
            <p className="db01-operational-eyebrow">Display</p>
            <h2>DB01 dark workspace</h2>
            <label className="db01-settings-toggle">
              <input
                type="checkbox"
                checked={compact}
                onChange={(event) => setCompact(event.target.checked)}
              />
              <span>Compact density</span>
            </label>
            <p>Use compact spacing for smaller screens or dense review sessions.</p>
          </article>
        </section>
        <section className="db01-operational-panel db01-settings-actions">
          <div>
            <h2>Operational shortcuts</h2>
            <p>Continue reviewing the local analysis history or open the public Sentra website.</p>
          </div>
          <div className="db01-operational-form-actions">
            <button
              type="button"
              className="db01-operational-button db01-operational-button--secondary"
              onClick={onOpenLogbook}
            >
              Open Logbook
            </button>
            <a
              className="db01-operational-button db01-operational-button--secondary"
              href="https://sentrahai.com"
              target="_blank"
              rel="noreferrer"
            >
              <Launch size={16} aria-hidden="true" />
              Sentra website
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
