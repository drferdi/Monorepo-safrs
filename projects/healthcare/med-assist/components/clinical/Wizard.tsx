// Designed and constructed by Drferdi.
/**
 * Wizard Framework Component
 *
 * Reusable multi-step wizard for process-guided workflows
 * Used across all 4 gates for step-by-step guidance
 *
 * @module components/clinical/Wizard
 */

import React, { useState, useCallback } from 'react';

type WizardDataMap = Record<string, unknown>;

function humanizeUiText(value: string): string {
  return value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================================
// TYPES
// ============================================================================

export interface WizardStep {
  id: string;
  title: string;
  instruction: string;
  educational_tip?: string;
  component: React.ComponentType<WizardStepProps>;
}

/**
 * WizardStepProps interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface WizardStepProps {
  onNext: (data: unknown) => void;
  onBack: () => void;
  data: unknown;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * WizardProps interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface WizardProps {
  steps: WizardStep[];
  onComplete: (allData: WizardDataMap) => void;
  onCancel?: () => void;
  title: string;
  subtitle?: string;
}

// ============================================================================
// WIZARD COMPONENT
// ============================================================================

export const Wizard: React.FC<WizardProps> = ({ steps, onComplete, onCancel, title, subtitle }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<WizardDataMap>({});

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = useCallback(
    (data: unknown) => {
      // Save step data
      setStepData((prev) => ({
        ...prev,
        [currentStep.id]: data,
      }));

      // Check if last step
      if (currentStepIndex === steps.length - 1) {
        // Complete wizard
        onComplete({
          ...stepData,
          [currentStep.id]: data,
        });
      } else {
        // Move to next step
        setCurrentStepIndex((prev) => prev + 1);
      }
    },
    [currentStepIndex, currentStep, steps.length, stepData, onComplete]
  );

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const StepComponent = currentStep.component;

  return (
    <div className="wizard-container">
      {/* Header */}
      <div className="wizard-header">
        <div className="wizard-title-section">
          <h2 className="wizard-title">{title}</h2>
          {subtitle && <p className="wizard-subtitle">{subtitle}</p>}
        </div>

        {onCancel && (
          <button onClick={onCancel} className="wizard-cancel-btn" aria-label="Cancel wizard">
            ✕
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="wizard-progress">
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="wizard-progress-text">
          Step {currentStepIndex + 1} of {steps.length}: {humanizeUiText(currentStep.title)}
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {/* Instruction */}
        <div className="wizard-instruction">
          <h3 className="wizard-instruction-title">📋 {humanizeUiText(currentStep.instruction)}</h3>

          {currentStep.educational_tip && (
            <div className="wizard-tip">
              <span className="wizard-tip-icon">💡</span>
              <span className="wizard-tip-text">{humanizeUiText(currentStep.educational_tip)}</span>
            </div>
          )}
        </div>

        {/* Step Component */}
        <div className="wizard-step-component">
          <StepComponent
            onNext={handleNext}
            onBack={handleBack}
            data={stepData[currentStep.id]}
            isFirst={currentStepIndex === 0}
            isLast={currentStepIndex === steps.length - 1}
          />
        </div>
      </div>

      {/* Footer with navigation hints */}
      <div className="wizard-footer">
        <div className="wizard-navigation-hints">
          {currentStepIndex > 0 && <span className="wizard-hint">← Back available</span>}
          {currentStepIndex < steps.length - 1 && (
            <span className="wizard-hint">
              Next step: {humanizeUiText(steps[currentStepIndex + 1].title)} →
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WIZARD STEP WRAPPER
// ============================================================================

/**
 * Wrapper for wizard step content with standard navigation buttons
 */
export const WizardStepWrapper: React.FC<{
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}> = ({ children, onNext, onBack, isFirst, isLast, nextDisabled = false, nextLabel }) => {
  return (
    <div className="wizard-step-wrapper">
      <div className="wizard-step-content">{children}</div>

      <div className="wizard-step-actions">
        {!isFirst && (
          <button onClick={onBack} className="wizard-btn wizard-btn-secondary">
            ← Back
          </button>
        )}

        <button onClick={onNext} disabled={nextDisabled} className="wizard-btn wizard-btn-primary">
          {nextLabel || (isLast ? 'Complete' : 'Next →')}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

export const wizardStyles = `
.wizard-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-primary);
  border-radius: 8px;
  overflow: hidden;
}

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.wizard-title-section {
  flex: 1;
}

.wizard-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.wizard-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.wizard-cancel-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.wizard-cancel-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.wizard-progress {
  padding: 16px 24px;
  background: var(--surface-secondary);
}

.wizard-progress-bar {
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.wizard-progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.3s ease;
}

.wizard-progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.wizard-instruction {
  margin-bottom: 24px;
}

.wizard-instruction-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.wizard-tip {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--info-bg);
  border-left: 3px solid var(--info-border);
  border-radius: 4px;
}

.wizard-tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.wizard-tip-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.wizard-step-component {
  /* Step content styles */
}

.wizard-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-secondary);
}

.wizard-navigation-hints {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-tertiary);
}

.wizard-hint {
  /* Navigation hint styles */
}

.wizard-step-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.wizard-step-content {
  flex: 1;
}

.wizard-step-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.wizard-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.wizard-btn-primary {
  background: var(--accent-primary);
  color: white;
}

.wizard-btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.wizard-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard-btn-secondary {
  background: var(--surface-tertiary);
  color: var(--text-primary);
}

.wizard-btn-secondary:hover {
  background: var(--surface-hover);
}
`;
