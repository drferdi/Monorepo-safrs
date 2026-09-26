// Designed and constructed by Drferdi.
/**
 * HTN Crisis Triage Component
 *
 * Interactive triage for hypertensive crisis (Urgency vs Emergency)
 * Part of Gate 2: Hypertension Classification
 *
 * @module components/clinical/HTNCrisisTriage
 */

import React, { useState } from 'react';
import {
  BPReading,
  CAPTOPRIL_PROTOCOL,
  HMODRedFlags,
  triageHypertensiveCrisis,
} from '../../lib/emergency-detector/htn-classifier';
import { CrisisAlert, RecommendationList } from './ClinicalAlert';

// ============================================================================
// TYPES
// ============================================================================

export interface HTNCrisisTriageProps {
  bp: BPReading;
  onComplete: (result: HTNCrisisResult) => void;
  onCancel?: () => void;
}

/**
 * HTNCrisisResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface HTNCrisisResult {
  type: 'HTN_URGENCY' | 'HTN_EMERGENCY';
  red_flags: HMODRedFlags;
  protocol: 'CAPTOPRIL_SL' | 'IMMEDIATE_ER_REFERRAL';
}

type TriageStep = 'RED_FLAGS' | 'RESULT';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HTNCrisisTriage: React.FC<HTNCrisisTriageProps> = ({ bp, onComplete, onCancel }) => {
  const [step, setStep] = useState<TriageStep>('RED_FLAGS');
  const [redFlags, setRedFlags] = useState<HMODRedFlags>({
    chest_pain: false,
    pulmonary_edema: false,
    neurological_deficit: false,
    vision_changes: false,
    severe_headache: false,
    oliguria: false,
    altered_mental_status: false,
  });

  const handleRedFlagChange = (flag: keyof HMODRedFlags, value: boolean) => {
    setRedFlags((prev) => ({ ...prev, [flag]: value }));
  };

  const handleContinue = () => {
    setStep('RESULT');
  };

  const handleComplete = () => {
    const type = triageHypertensiveCrisis(bp, redFlags);
    const protocol = type === 'HTN_EMERGENCY' ? 'IMMEDIATE_ER_REFERRAL' : 'CAPTOPRIL_SL';

    onComplete({
      type,
      red_flags: redFlags,
      protocol,
    });
  };

  const hasAnyRedFlag = Object.values(redFlags).some((flag) => flag === true);
  const crisisType = triageHypertensiveCrisis(bp, redFlags);

  return (
    <div className="htn-crisis-triage">
      {/* Header */}
      <div className="htn-crisis-header">
        <div className="htn-crisis-title-section">
          <h3 className="htn-crisis-title">⚠️ Hypertensive Crisis Triage</h3>
          <p className="htn-crisis-subtitle">
            TD: {bp.sbp}/{bp.dbp} mmHg ≥180/110
          </p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="htn-crisis-close">
            ✕
          </button>
        )}
      </div>

      {/* Step 1: HMOD Red Flags Checklist */}
      {step === 'RED_FLAGS' && (
        <div className="htn-crisis-step">
          <div className="htn-crisis-instruction">
            <h4>🔍 Check for HMOD (Hypertension-Mediated Organ Damage)</h4>
            <p>Centang gejala yang ADA pada pasien:</p>
          </div>

          <div className="htn-red-flags-checklist">
            {/* Cardiac */}
            <div className="htn-red-flag-category">
              <h5>💔 Cardiac</h5>
              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.chest_pain}
                  onChange={(e) => handleRedFlagChange('chest_pain', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Chest Pain</strong>
                  <span className="htn-red-flag-description">Nyeri dada (suspect ACS)</span>
                </span>
              </label>

              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.pulmonary_edema}
                  onChange={(e) => handleRedFlagChange('pulmonary_edema', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Pulmonary Edema</strong>
                  <span className="htn-red-flag-description">Sesak napas akut + ronki basah</span>
                </span>
              </label>
            </div>

            {/* Neurological */}
            <div className="htn-red-flag-category">
              <h5>🧠 Neurological</h5>
              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.neurological_deficit}
                  onChange={(e) => handleRedFlagChange('neurological_deficit', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Neurological Deficit</strong>
                  <span className="htn-red-flag-description">
                    Kelemahan anggota gerak, bicara pelo
                  </span>
                </span>
              </label>

              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.vision_changes}
                  onChange={(e) => handleRedFlagChange('vision_changes', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Vision Changes</strong>
                  <span className="htn-red-flag-description">Pandangan kabur mendadak</span>
                </span>
              </label>

              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.severe_headache}
                  onChange={(e) => handleRedFlagChange('severe_headache', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Severe Headache</strong>
                  <span className="htn-red-flag-description">
                    Nyeri kepala hebat (suspect encephalopathy)
                  </span>
                </span>
              </label>

              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.altered_mental_status}
                  onChange={(e) => handleRedFlagChange('altered_mental_status', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Altered Mental Status</strong>
                  <span className="htn-red-flag-description">Penurunan kesadaran</span>
                </span>
              </label>
            </div>

            {/* Renal */}
            <div className="htn-red-flag-category">
              <h5>🫘 Renal</h5>
              <label className="htn-red-flag-item">
                <input
                  type="checkbox"
                  checked={redFlags.oliguria}
                  onChange={(e) => handleRedFlagChange('oliguria', e.target.checked)}
                />
                <span className="htn-red-flag-label">
                  <strong>Oliguria</strong>
                  <span className="htn-red-flag-description">
                    Urine output menurun (&lt;0.5 mL/kg/hr)
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="htn-crisis-summary">
            {hasAnyRedFlag ? (
              <div className="htn-crisis-warning">
                ⚠️{' '}
                <strong>
                  {Object.values(redFlags).filter((f) => f).length} Red Flag(s) Detected
                </strong>
              </div>
            ) : (
              <div className="htn-crisis-info">✓ No HMOD red flags detected</div>
            )}
          </div>

          <button onClick={handleContinue} className="htn-crisis-btn htn-crisis-btn-primary">
            Continue to Result →
          </button>
        </div>
      )}

      {/* Step 2: Result & Protocol */}
      {step === 'RESULT' && (
        <div className="htn-crisis-step">
          {crisisType === 'HTN_EMERGENCY' ? (
            <>
              <CrisisAlert
                type="HTN_EMERGENCY"
                value={`${bp.sbp}/${bp.dbp} mmHg + HMOD`}
                actions={[
                  'IV access (2 large-bore lines)',
                  'Continuous BP monitoring',
                  'Call ambulance NOW',
                  'Target: ↓25% MAP in 1-2 hours (gradual!)',
                  'Do NOT give oral antihypertensives',
                ]}
              />

              <div className="htn-crisis-reasoning">
                <h4>🔍 Why Emergency?</h4>
                <p>
                  TD ≥180/110 <strong>WITH</strong> organ damage ={' '}
                  <strong>Hypertensive Emergency</strong>
                </p>
                <p>Red flags detected:</p>
                <ul>
                  {Object.entries(redFlags)
                    .filter(([, value]) => value)
                    .map(([key]) => (
                      <li key={key}>{formatRedFlagName(key)}</li>
                    ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="htn-urgency-alert">
                <div className="htn-urgency-header">
                  <span className="htn-urgency-icon">🚨</span>
                  <div>
                    <h4>Hypertensive Urgency</h4>
                    <p>
                      TD {bp.sbp}/{bp.dbp} mmHg WITHOUT organ damage
                    </p>
                  </div>
                </div>
              </div>

              <div className="htn-crisis-reasoning">
                <h4>🔍 Why Urgency (Not Emergency)?</h4>
                <p>
                  TD ≥180/110 <strong>WITHOUT</strong> HMOD = <strong>Hypertensive Urgency</strong>
                </p>
                <p>✓ No red flags detected → Safe for oral treatment</p>
              </div>

              {/* Captopril Protocol Timeline */}
              <div className="htn-captopril-protocol">
                <h4>💊 Captopril SL Protocol</h4>
                <div className="htn-protocol-timeline">
                  {CAPTOPRIL_PROTOCOL.map((step, index) => (
                    <div key={index} className="htn-protocol-step">
                      <div className="htn-protocol-time">
                        <span className="htn-protocol-time-badge">
                          {step.time_minutes === 0 ? 'NOW' : `${step.time_minutes} min`}
                        </span>
                      </div>
                      <div className="htn-protocol-content">
                        <h5>{step.action}</h5>
                        <div className="htn-protocol-monitoring">
                          <strong>Monitor:</strong>
                          <ul>
                            {step.monitoring.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        {step.decision_point && (
                          <div className="htn-protocol-decision">
                            <strong>Decision Point:</strong>
                            <p>IF {step.decision_point.condition}:</p>
                            <ul>
                              <li>✓ Yes → {step.decision_point.if_true}</li>
                              <li>✗ No → {step.decision_point.if_false}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <RecommendationList
                title="⚠️ Important Reminders"
                recommendations={[
                  'Monitor for hypoperfusion (dizziness, weakness)',
                  'Recheck BP every 15 min during treatment',
                  'Follow-up ≤7 days',
                  'Patient education: medication adherence, lifestyle',
                ]}
              />
            </>
          )}

          <button onClick={handleComplete} className="htn-crisis-btn htn-crisis-btn-primary">
            ✓ Complete Triage
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRedFlagName(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// STYLES
// ============================================================================

export const htnCrisisTriageStyles = `
.htn-crisis-triage {
  background: var(--glass-bg, rgba(22, 24, 29, 0.95));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 2px solid var(--warning-primary);
  border-radius: 12px;
  padding: 20px;
  max-width: 700px;
  margin: 0 auto;
}

.htn-crisis-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.htn-crisis-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--warning-text);
  margin: 0 0 4px 0;
}

.htn-crisis-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.htn-crisis-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.htn-crisis-step {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.htn-crisis-instruction {
  background: var(--info-bg);
  border-left: 3px solid var(--info-border);
  padding: 16px;
  border-radius: 6px;
}

.htn-crisis-instruction h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.htn-crisis-instruction p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.htn-red-flags-checklist {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.htn-red-flag-category {
  background: var(--surface-secondary);
  border-radius: 8px;
  padding: 16px;
}

.htn-red-flag-category h5 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.htn-red-flag-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--surface-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.htn-red-flag-item:hover {
  background: var(--surface-hover);
}

.htn-red-flag-item:last-child {
  margin-bottom: 0;
}

.htn-red-flag-item input[type="checkbox"] {
  margin-top: 2px;
  cursor: pointer;
}

.htn-red-flag-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.htn-red-flag-label strong {
  font-size: 14px;
  color: var(--text-primary);
}

.htn-red-flag-description {
  font-size: 12px;
  color: var(--text-tertiary);
}

.htn-crisis-summary {
  padding: 12px;
  border-radius: 6px;
}

.htn-crisis-warning {
  background: var(--error-bg);
  border-left: 3px solid var(--error-primary);
  padding: 12px;
  border-radius: 6px;
  color: var(--error-text);
  font-size: 14px;
}

.htn-crisis-info {
  background: var(--success-bg);
  border-left: 3px solid var(--success-primary);
  padding: 12px;
  border-radius: 6px;
  color: var(--success-text);
  font-size: 14px;
}

.htn-crisis-btn {
  width: 100%;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.htn-crisis-btn-primary {
  background: var(--accent-primary);
  color: white;
}

.htn-crisis-btn-primary:hover {
  background: var(--accent-hover);
}

.htn-urgency-alert {
  background: var(--warning-bg);
  border: 2px solid var(--warning-primary);
  border-radius: 8px;
  padding: 16px;
}

.htn-urgency-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.htn-urgency-icon {
  font-size: 32px;
}

.htn-urgency-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--warning-text);
  margin: 0 0 4px 0;
}

.htn-urgency-header p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.htn-crisis-reasoning {
  background: var(--surface-secondary);
  padding: 16px;
  border-radius: 8px;
}

.htn-crisis-reasoning h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.htn-crisis-reasoning p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 8px 0;
}

.htn-crisis-reasoning ul {
  margin: 8px 0 0 20px;
  padding: 0;
}

.htn-crisis-reasoning li {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

.htn-captopril-protocol {
  background: var(--surface-secondary);
  padding: 16px;
  border-radius: 8px;
}

.htn-captopril-protocol h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.htn-protocol-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.htn-protocol-step {
  display: flex;
  gap: 16px;
  position: relative;
}

.htn-protocol-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 32px;
  top: 40px;
  bottom: -16px;
  width: 2px;
  background: var(--border-subtle);
}

.htn-protocol-time {
  flex-shrink: 0;
}

.htn-protocol-time-badge {
  display: inline-block;
  background: var(--accent-primary);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.htn-protocol-content {
  flex: 1;
  background: var(--surface-primary);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
}

.htn-protocol-content h5 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.htn-protocol-monitoring {
  margin: 8px 0;
  font-size: 13px;
}

.htn-protocol-monitoring strong {
  color: var(--text-primary);
}

.htn-protocol-monitoring ul {
  margin: 4px 0 0 20px;
  padding: 0;
}

.htn-protocol-monitoring li {
  color: var(--text-secondary);
  margin: 2px 0;
}

.htn-protocol-decision {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  font-size: 13px;
}

.htn-protocol-decision strong {
  color: var(--text-primary);
}

.htn-protocol-decision p {
  margin: 4px 0;
  color: var(--text-secondary);
}

.htn-protocol-decision ul {
  margin: 4px 0 0 20px;
  padding: 0;
}

.htn-protocol-decision li {
  color: var(--text-secondary);
  margin: 2px 0;
}
`;
