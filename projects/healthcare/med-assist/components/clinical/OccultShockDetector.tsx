// Designed and constructed by Drferdi.
/**
 * Occult Shock Detector Component
 *
 * Early warning system for relative hypotension in HTN patients
 * Part of Gate 4: Occult Shock Detection
 *
 * @module components/clinical/OccultShockDetector
 */

import React, { useMemo, useState } from 'react';
import {
  AcuteSymptoms,
  assessPerfusion,
  calculateMAP,
  detectOccultShock,
  HistoricalBP,
  PerfusionAssessment,
  ShockAssessmentVitals,
} from '../../lib/emergency-detector/occult-shock-detector';
import { CrisisAlert, ReasoningDisplay, ReasoningStep } from './ClinicalAlert';

// ============================================================================
// TYPES
// ============================================================================

export interface OccultShockDetectorProps {
  currentBP: { sbp: number; dbp: number };
  glucose?: number;
  bpHistory?: HistoricalBP[];
  knownHTN: boolean;
  onComplete: (result: OccultShockDetectorResult) => void;
  onCancel?: () => void;
}

/**
 * OccultShockDetectorResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface OccultShockDetectorResult {
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  triggers: string[];
  recommendations: string[];
  perfusion_status?: 'adequate' | 'concerning' | 'poor';
}

type DetectorStep = 'SYMPTOMS' | 'PERFUSION' | 'RESULT';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OccultShockDetector: React.FC<OccultShockDetectorProps> = ({
  currentBP,
  glucose,
  bpHistory = [],
  knownHTN,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<DetectorStep>('SYMPTOMS');
  const [symptoms, setSymptoms] = useState<AcuteSymptoms>({
    dizziness: false,
    presyncope: false,
    syncope: false,
    weakness: false,
  });
  const [perfusion, setPerfusion] = useState<PerfusionAssessment>({
    mental_status: 'alert',
    skin_temp: 'warm',
    skin_moisture: 'dry',
    capillary_refill_sec: 2,
  });

  const map = useMemo(() => calculateMAP(currentBP.sbp, currentBP.dbp), [currentBP]);

  const handleSymptomChange = (symptom: keyof AcuteSymptoms, value: boolean) => {
    setSymptoms((prev) => ({ ...prev, [symptom]: value }));
  };

  const handleContinueFromSymptoms = () => {
    const hasSymptoms = Object.values(symptoms).some((s) => s);
    if (hasSymptoms) {
      setStep('PERFUSION');
    } else {
      // No symptoms - low risk, skip perfusion
      handleComplete();
    }
  };

  const handleContinueFromPerfusion = () => {
    setStep('RESULT');
  };

  const vitals: ShockAssessmentVitals = {
    current_sbp: currentBP.sbp,
    current_dbp: currentBP.dbp,
    glucose,
  };

  const shockResult = detectOccultShock({
    vitals,
    last_3_visits: bpHistory,
    symptoms,
    known_htn: knownHTN,
  });

  const perfusionResult = assessPerfusion(perfusion);

  const handleComplete = () => {
    onComplete({
      risk_level: shockResult.risk_level,
      triggers: shockResult.triggers,
      recommendations: shockResult.recommendations,
      perfusion_status: perfusionResult.status,
    });
  };

  const hasAnySymptom = Object.values(symptoms).some((s) => s);
  // Generate reasoning steps
  const reasoningSteps: ReasoningStep[] = useMemo(() => {
    const steps: ReasoningStep[] = [];

    // Step 1: Hypoglycemia check
    if (glucose !== undefined) {
      steps.push({
        step_number: 1,
        description: 'Check Hypoglycemia First',
        data_used: [{ label: 'Glucose', value: `${glucose} mg/dL` }],
        logic:
          glucose < 70 ? 'Glucose <70 can mimic shock symptoms' : 'Glucose ≥70, not hypoglycemia',
        result: glucose < 70 ? '⚠️ TREAT HYPOGLYCEMIA FIRST' : '✓ Proceed to shock assessment',
      });
    }

    // Step 2: Baseline BP
    if (bpHistory.length >= 3) {
      const baseline = bpHistory.reduce((sum, bp) => sum + bp.sbp, 0) / bpHistory.length;
      const delta = Math.round(baseline - currentBP.sbp);

      steps.push({
        step_number: steps.length + 1,
        description: 'Calculate Baseline BP',
        data_used: [
          {
            label: 'Last 3 visits',
            value: bpHistory.map((bp) => `${bp.sbp}/${bp.dbp}`).join(', '),
          },
          { label: 'Baseline SBP', value: `${Math.round(baseline)} mmHg` },
          { label: 'Current SBP', value: `${currentBP.sbp} mmHg` },
        ],
        logic: `ΔSBP = ${Math.round(baseline)} - ${currentBP.sbp} = ${delta} mmHg`,
        result:
          delta >= 40
            ? `⚠️ Relative hypotension (ΔSBP ${delta} ≥40)`
            : `✓ No relative hypotension (ΔSBP ${delta} <40)`,
      });
    }

    // Step 3: MAP calculation
    steps.push({
      step_number: steps.length + 1,
      description: 'Calculate MAP',
      data_used: [
        { label: 'SBP', value: `${currentBP.sbp} mmHg` },
        { label: 'DBP', value: `${currentBP.dbp} mmHg` },
      ],
      logic: `MAP = DBP + ⅓(SBP - DBP) = ${currentBP.dbp} + ⅓(${currentBP.sbp} - ${currentBP.dbp})`,
      result:
        map < 65 ? `⚠️ MAP ${map} <65 (organ hypoperfusion risk)` : `✓ MAP ${map} ≥65 (adequate)`,
    });

    return steps;
  }, [glucose, bpHistory, currentBP, map]);

  return (
    <div className="occult-shock-detector">
      {/* Header */}
      <div className="occult-shock-header">
        <div className="occult-shock-title-section">
          <h3 className="occult-shock-title">🔍 Occult Shock Assessment</h3>
          <p className="occult-shock-subtitle">
            TD: {currentBP.sbp}/{currentBP.dbp} mmHg | MAP: {map} mmHg
            {glucose && ` | Glucose: ${glucose} mg/dL`}
          </p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="occult-shock-close">
            ✕
          </button>
        )}
      </div>

      {/* Step 1: Acute Symptoms */}
      {step === 'SYMPTOMS' && (
        <div className="occult-shock-step">
          <div className="occult-shock-instruction">
            <h4>1️⃣ Check for Acute Symptoms</h4>
            <p>Centang gejala yang ADA pada pasien:</p>
          </div>

          <div className="occult-shock-symptoms">
            <label className="occult-shock-symptom-item">
              <input
                type="checkbox"
                checked={symptoms.dizziness}
                onChange={(e) => handleSymptomChange('dizziness', e.target.checked)}
              />
              <span className="occult-shock-symptom-label">
                <strong>Dizziness</strong>
                <span className="occult-shock-symptom-description">Pusing, kepala ringan</span>
              </span>
            </label>

            <label className="occult-shock-symptom-item">
              <input
                type="checkbox"
                checked={symptoms.presyncope}
                onChange={(e) => handleSymptomChange('presyncope', e.target.checked)}
              />
              <span className="occult-shock-symptom-label">
                <strong>Presyncope</strong>
                <span className="occult-shock-symptom-description">
                  Hampir pingsan, pandangan gelap
                </span>
              </span>
            </label>

            <label className="occult-shock-symptom-item">
              <input
                type="checkbox"
                checked={symptoms.syncope}
                onChange={(e) => handleSymptomChange('syncope', e.target.checked)}
              />
              <span className="occult-shock-symptom-label">
                <strong>Syncope</strong>
                <span className="occult-shock-symptom-description">
                  Pingsan (loss of consciousness)
                </span>
              </span>
            </label>

            <label className="occult-shock-symptom-item">
              <input
                type="checkbox"
                checked={symptoms.weakness}
                onChange={(e) => handleSymptomChange('weakness', e.target.checked)}
              />
              <span className="occult-shock-symptom-label">
                <strong>Weakness</strong>
                <span className="occult-shock-symptom-description">Lemas mendadak</span>
              </span>
            </label>
          </div>

          <div className="occult-shock-summary">
            {hasAnySymptom ? (
              <div className="occult-shock-warning">
                ⚠️{' '}
                <strong>
                  {Object.values(symptoms).filter((s) => s).length} Acute Symptom(s) Detected
                </strong>
              </div>
            ) : (
              <div className="occult-shock-info">
                ✓ No acute symptoms → Low risk for occult shock
              </div>
            )}
          </div>

          <button
            onClick={handleContinueFromSymptoms}
            className="occult-shock-btn occult-shock-btn-primary"
          >
            {hasAnySymptom ? 'Continue to Perfusion Assessment →' : 'Complete Assessment'}
          </button>
        </div>
      )}

      {/* Step 2: Perfusion Assessment */}
      {step === 'PERFUSION' && (
        <div className="occult-shock-step">
          <div className="occult-shock-instruction">
            <h4>2️⃣ Assess Perfusion Status</h4>
            <p>Evaluate signs of tissue perfusion:</p>
          </div>

          <div className="occult-shock-perfusion-form">
            {/* Mental Status */}
            <div className="occult-shock-form-group">
              <label>Mental Status:</label>
              <select
                value={perfusion.mental_status}
                onChange={(e) =>
                  setPerfusion((prev) => ({
                    ...prev,
                    mental_status: e.target.value as PerfusionAssessment['mental_status'],
                  }))
                }
                className="occult-shock-select"
              >
                <option value="alert">Alert (normal)</option>
                <option value="confused">Confused</option>
                <option value="lethargic">Lethargic</option>
                <option value="unresponsive">Unresponsive</option>
              </select>
            </div>

            {/* Skin Temperature */}
            <div className="occult-shock-form-group">
              <label>Skin Temperature:</label>
              <select
                value={perfusion.skin_temp}
                onChange={(e) =>
                  setPerfusion((prev) => ({
                    ...prev,
                    skin_temp: e.target.value as PerfusionAssessment['skin_temp'],
                  }))
                }
                className="occult-shock-select"
              >
                <option value="warm">Warm (normal)</option>
                <option value="cool">Cool</option>
                <option value="cold">Cold</option>
              </select>
            </div>

            {/* Skin Moisture */}
            <div className="occult-shock-form-group">
              <label>Skin Moisture:</label>
              <select
                value={perfusion.skin_moisture}
                onChange={(e) =>
                  setPerfusion((prev) => ({
                    ...prev,
                    skin_moisture: e.target.value as PerfusionAssessment['skin_moisture'],
                  }))
                }
                className="occult-shock-select"
              >
                <option value="dry">Dry (normal)</option>
                <option value="clammy">Clammy (cold sweat)</option>
              </select>
            </div>

            {/* Capillary Refill */}
            <div className="occult-shock-form-group">
              <label>Capillary Refill Time (seconds):</label>
              <input
                type="number"
                value={perfusion.capillary_refill_sec}
                onChange={(e) =>
                  setPerfusion((prev) => ({
                    ...prev,
                    capillary_refill_sec: parseFloat(e.target.value),
                  }))
                }
                className="occult-shock-input"
                min="0"
                max="10"
                step="0.5"
              />
              <span className="occult-shock-input-hint">
                Normal: &lt;2 sec | Abnormal: &gt;2 sec
              </span>
            </div>
          </div>

          <button
            onClick={handleContinueFromPerfusion}
            className="occult-shock-btn occult-shock-btn-primary"
          >
            Continue to Result →
          </button>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'RESULT' && (
        <div className="occult-shock-step">
          {(() => {
            const vitals: ShockAssessmentVitals = {
              current_sbp: currentBP.sbp,
              current_dbp: currentBP.dbp,
              glucose,
            };

            const shockResult = detectOccultShock({
              vitals,
              last_3_visits: bpHistory,
              symptoms,
              known_htn: knownHTN,
            });

            if (shockResult.risk_level === 'CRITICAL' || shockResult.risk_level === 'HIGH') {
              return (
                <>
                  <CrisisAlert
                    type="OCCULT_SHOCK"
                    value={`${currentBP.sbp}/${currentBP.dbp} mmHg`}
                    actions={shockResult.recommendations.slice(0, 5)}
                  />

                  <div className="occult-shock-triggers">
                    <h4>⚠️ Danger Triggers Detected:</h4>
                    <ul>
                      {shockResult.triggers.map((trigger, index) => (
                        <li key={index}>{trigger}</li>
                      ))}
                    </ul>
                  </div>

                  {perfusionResult.status !== 'adequate' && (
                    <div className="occult-shock-perfusion-alert">
                      <h4>🔍 Perfusion Status: {perfusionResult.status.toUpperCase()}</h4>
                      <ul>
                        {perfusionResult.findings.map((finding, index) => (
                          <li key={index}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            } else {
              return (
                <div className="occult-shock-low-risk">
                  <div className="occult-shock-low-risk-icon">✅</div>
                  <div className="occult-shock-low-risk-message">
                    <h4>No Occult Shock Detected</h4>
                    <p>
                      TD {currentBP.sbp}/{currentBP.dbp} mmHg | MAP {map} mmHg
                    </p>
                    <p>No danger triggers identified</p>
                  </div>
                </div>
              );
            }
          })()}

          <ReasoningDisplay
            steps={reasoningSteps}
            conclusion="Assessment complete. Follow recommendations above."
          />

          <button onClick={handleComplete} className="occult-shock-btn occult-shock-btn-primary">
            ✓ Complete Assessment
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

export const occultShockDetectorStyles = `
.occult-shock-detector {
  background: var(--surface-primary);
  border: 2px solid var(--info-primary);
  border-radius: 12px;
  padding: 20px;
  max-width: 700px;
  margin: 0 auto;
}

.occult-shock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.occult-shock-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.occult-shock-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.occult-shock-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.occult-shock-step {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.occult-shock-instruction {
  background: var(--info-bg);
  border-left: 3px solid var(--info-border);
  padding: 16px;
  border-radius: 6px;
}

.occult-shock-instruction h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.occult-shock-instruction p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.occult-shock-symptoms {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.occult-shock-symptom-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.occult-shock-symptom-item:hover {
  background: var(--surface-hover);
}

.occult-shock-symptom-item input[type="checkbox"] {
  margin-top: 2px;
  cursor: pointer;
}

.occult-shock-symptom-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.occult-shock-symptom-label strong {
  font-size: 14px;
  color: var(--text-primary);
}

.occult-shock-symptom-description {
  font-size: 12px;
  color: var(--text-tertiary);
}

.occult-shock-summary {
  padding: 12px;
  border-radius: 6px;
}

.occult-shock-warning {
  background: var(--warning-bg);
  border-left: 3px solid var(--warning-primary);
  padding: 12px;
  border-radius: 6px;
  color: var(--warning-text);
  font-size: 14px;
}

.occult-shock-info {
  background: var(--success-bg);
  border-left: 3px solid var(--success-primary);
  padding: 12px;
  border-radius: 6px;
  color: var(--success-text);
  font-size: 14px;
}

.occult-shock-perfusion-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.occult-shock-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.occult-shock-form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.occult-shock-select,
.occult-shock-input {
  padding: 10px 12px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.occult-shock-input {
  cursor: text;
}

.occult-shock-input-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.occult-shock-btn {
  width: 100%;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.occult-shock-btn-primary {
  background: var(--accent-primary);
  color: white;
}

.occult-shock-btn-primary:hover {
  background: var(--accent-hover);
}

.occult-shock-triggers {
  background: var(--error-bg);
  border: 1px solid var(--error-primary);
  border-radius: 8px;
  padding: 16px;
}

.occult-shock-triggers h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--error-text);
  margin: 0 0 12px 0;
}

.occult-shock-triggers ul {
  margin: 0;
  padding-left: 20px;
}

.occult-shock-triggers li {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

.occult-shock-perfusion-alert {
  background: var(--warning-bg);
  border: 1px solid var(--warning-primary);
  border-radius: 8px;
  padding: 16px;
}

.occult-shock-perfusion-alert h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--warning-text);
  margin: 0 0 12px 0;
}

.occult-shock-perfusion-alert ul {
  margin: 0;
  padding-left: 20px;
}

.occult-shock-perfusion-alert li {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

.occult-shock-low-risk {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  background: var(--success-bg);
  border: 1px solid var(--success-primary);
  border-radius: 8px;
}

.occult-shock-low-risk-icon {
  font-size: 32px;
}

.occult-shock-low-risk-message h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--success-text);
  margin: 0 0 8px 0;
}

.occult-shock-low-risk-message p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 4px 0;
}
`;
