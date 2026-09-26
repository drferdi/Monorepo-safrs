// Designed and constructed by Drferdi.
/**
 * Clinical Alert Components
 *
 * Reusable alert components for displaying clinical warnings,
 * recommendations, and crisis notifications
 *
 * @module components/clinical/ClinicalAlert
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'info' | 'success';

/**
 * ClinicalAlertProps interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface ClinicalAlertProps {
  severity: AlertSeverity;
  title: string;
  message?: string;
  icon?: string;
  actions?: AlertAction[];
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

/**
 * AlertAction interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface AlertAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// ============================================================================
// CLINICAL ALERT COMPONENT
// ============================================================================

export const ClinicalAlert: React.FC<ClinicalAlertProps> = ({
  severity,
  title,
  message,
  icon,
  actions,
  dismissible = false,
  onDismiss,
  children,
}) => {
  const severityConfig = getSeverityConfig(severity);
  const displayIcon = icon || severityConfig.icon;

  return (
    <div className={`clinical-alert clinical-alert-${severity} glass-alert-${severity}`}>
      <div className="clinical-alert-header">
        <div className="clinical-alert-icon">{displayIcon}</div>
        <div className="clinical-alert-title-section">
          <h4 className="clinical-alert-title">{title}</h4>
          {message && <p className="clinical-alert-message">{message}</p>}
        </div>
        {dismissible && onDismiss && (
          <button onClick={onDismiss} className="clinical-alert-dismiss" aria-label="Dismiss alert">
            ✕
          </button>
        )}
      </div>

      {children && <div className="clinical-alert-content">{children}</div>}

      {actions && actions.length > 0 && (
        <div className="clinical-alert-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`clinical-alert-btn clinical-alert-btn-${action.variant || 'secondary'}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CRISIS ALERT (Special high-priority alert)
// ============================================================================

export interface CrisisAlertProps {
  type: 'HYPOGLYCEMIA' | 'HTN_EMERGENCY' | 'DKA_HHS' | 'OCCULT_SHOCK';
  value?: string | number;
  actions: string[];
  onAcknowledge?: () => void;
}

export const CrisisAlert: React.FC<CrisisAlertProps> = ({
  type,
  value,
  actions,
  onAcknowledge,
}) => {
  const config = getCrisisConfig(type);

  return (
    <div className="crisis-alert glass-card">
      <div className="crisis-alert-header">
        <div className="crisis-alert-icon">{config.icon}</div>
        <div className="crisis-alert-title-section">
          <div className="crisis-alert-badge">{config.badge}</div>
          <h3 className="crisis-alert-title">{config.title}</h3>
          {value && <p className="crisis-alert-value">{value}</p>}
        </div>
      </div>

      <div className="crisis-alert-actions-list">
        <h4 className="crisis-alert-actions-title">⚡ IMMEDIATE ACTIONS:</h4>
        <ul className="crisis-alert-actions-items">
          {actions.map((action, index) => (
            <li key={index} className="crisis-alert-action-item">
              {action}
            </li>
          ))}
        </ul>
      </div>

      {onAcknowledge && (
        <div className="crisis-alert-footer">
          <button onClick={onAcknowledge} className="crisis-alert-acknowledge-btn">
            ✓ Acknowledge & Proceed
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// REASONING DISPLAY
// ============================================================================

export interface ReasoningStep {
  step_number: number;
  description: string;
  data_used: { label: string; value: unknown }[];
  logic: string;
  result: string;
}

/**
 * ReasoningDisplayProps interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export interface ReasoningDisplayProps {
  steps: ReasoningStep[];
  conclusion: string;
  expanded?: boolean;
}

export const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({
  steps,
  conclusion,
  expanded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  return (
    <div className="reasoning-display">
      <button onClick={() => setIsExpanded(!isExpanded)} className="reasoning-toggle">
        <span className="reasoning-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="reasoning-toggle-text">Bagaimana Sistem Sampai Kesimpulan Ini?</span>
      </button>

      {isExpanded && (
        <div className="reasoning-content">
          {steps.map((step) => (
            <div key={step.step_number} className="reasoning-step">
              <div className="reasoning-step-header">
                <span className="reasoning-step-number">{step.step_number}️⃣</span>
                <span className="reasoning-step-description">{step.description}</span>
              </div>

              <div className="reasoning-step-data">
                {step.data_used.map((data, index) => (
                  <div key={index} className="reasoning-data-item">
                    <span className="reasoning-data-label">• {data.label}:</span>
                    <span className="reasoning-data-value">{formatReasoningValue(data.value)}</span>
                  </div>
                ))}
              </div>

              <div className="reasoning-step-logic">→ {step.logic}</div>

              <div className="reasoning-step-result">
                <strong>{step.result}</strong>
              </div>
            </div>
          ))}

          <div className="reasoning-conclusion">
            <div className="reasoning-conclusion-icon">📋</div>
            <div className="reasoning-conclusion-text">
              <strong>Kesimpulan:</strong> {conclusion}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// RECOMMENDATION LIST
// ============================================================================

export interface RecommendationListProps {
  title: string;
  recommendations: string[];
  variant?: 'default' | 'compact';
}

export const RecommendationList: React.FC<RecommendationListProps> = ({
  title,
  recommendations,
  variant = 'default',
}) => {
  return (
    <div className={`recommendation-list recommendation-list-${variant}`}>
      <h4 className="recommendation-list-title">{title}</h4>
      <ul className="recommendation-list-items">
        {recommendations.map((rec, index) => (
          <li key={index} className="recommendation-list-item">
            {rec}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSeverityConfig(severity: AlertSeverity) {
  const configs = {
    critical: {
      icon: '🚨',
      color: 'var(--error-primary)',
    },
    high: {
      icon: '⚠️',
      color: 'var(--warning-primary)',
    },
    moderate: {
      icon: '⚡',
      color: 'var(--info-primary)',
    },
    info: {
      icon: '💡',
      color: 'var(--info-primary)',
    },
    success: {
      icon: '✅',
      color: 'var(--success-primary)',
    },
  };

  return configs[severity];
}

function formatReasoningValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') {
    return value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function getCrisisConfig(type: CrisisAlertProps['type']) {
  const configs = {
    HYPOGLYCEMIA: {
      icon: '🚨',
      badge: 'CRITICAL',
      title: 'HIPOGLIKEMIA - TANGANI SEGERA',
    },
    HTN_EMERGENCY: {
      icon: '🚑',
      badge: 'EMERGENCY',
      title: 'HIPERTENSI EMERGENSI - RUJUK ICU',
    },
    DKA_HHS: {
      icon: '🚑',
      badge: 'EMERGENCY',
      title: 'KRISIS HIPERGLIKEMIA - RUJUK ICU',
    },
    OCCULT_SHOCK: {
      icon: '🚨',
      badge: 'HIGH RISK',
      title: 'OCCULT SHOCK SUSPECTED',
    },
  };

  return configs[type];
}

// ============================================================================
// STYLES
// ============================================================================

export const clinicalAlertStyles = `
/* Clinical Alert */
.clinical-alert {
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.clinical-alert-critical {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-left-color: var(--error-primary);
  border-left-width: 4px;
}

.clinical-alert-high {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-left-color: var(--warning-primary);
  border-left-width: 4px;
}

.clinical-alert-moderate {
  background: var(--info-bg);
  border-color: var(--info-primary);
}

.clinical-alert-info {
  background: var(--info-bg);
  border-color: var(--info-border);
}

.clinical-alert-success {
  background: var(--success-bg);
  border-color: var(--success-primary);
}

.clinical-alert-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.clinical-alert-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.clinical-alert-title-section {
  flex: 1;
}

.clinical-alert-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.clinical-alert-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.clinical-alert-dismiss {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.clinical-alert-content {
  margin-top: 12px;
  padding-left: 32px;
}

.clinical-alert-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-left: 32px;
}

.clinical-alert-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.clinical-alert-btn-primary {
  background: var(--accent-primary);
  color: white;
}

.clinical-alert-btn-secondary {
  background: var(--surface-tertiary);
  color: var(--text-primary);
}

/* Crisis Alert */
.crisis-alert {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(153, 27, 27, 0.2) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--error-primary);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--error-primary); }
  50% { border-color: var(--error-secondary); }
}

.crisis-alert-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.crisis-alert-icon {
  font-size: 32px;
}

.crisis-alert-badge {
  display: inline-block;
  background: var(--error-primary);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.crisis-alert-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--error-text);
  margin: 0;
}

.crisis-alert-value {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.crisis-alert-actions-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.crisis-alert-actions-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--error-text);
  margin: 0 0 12px 0;
}

.crisis-alert-actions-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.crisis-alert-action-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 14px;
}

.crisis-alert-action-item:last-child {
  border-bottom: none;
}

.crisis-alert-footer {
  display: flex;
  justify-content: center;
}

.crisis-alert-acknowledge-btn {
  background: var(--error-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.crisis-alert-acknowledge-btn:hover {
  background: var(--error-hover);
  transform: translateY(-1px);
}

/* Reasoning Display */
.reasoning-display {
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
}

.reasoning-toggle {
  width: 100%;
  background: var(--surface-secondary);
  border: none;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.reasoning-toggle:hover {
  background: var(--surface-hover);
}

.reasoning-toggle-icon {
  font-size: 12px;
  color: var(--text-tertiary);
}

.reasoning-toggle-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.reasoning-content {
  padding: 16px;
  background: var(--surface-primary);
}

.reasoning-step {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.reasoning-step:last-of-type {
  border-bottom: none;
}

.reasoning-step-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.reasoning-step-number {
  font-size: 16px;
}

.reasoning-step-description {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.reasoning-step-data {
  margin: 8px 0 8px 24px;
  font-size: 13px;
  color: var(--text-secondary);
}

.reasoning-data-item {
  margin: 4px 0;
}

.reasoning-data-label {
  color: var(--text-tertiary);
}

.reasoning-data-value {
  color: var(--text-primary);
  margin-left: 4px;
}

.reasoning-step-logic {
  margin: 8px 0 8px 24px;
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
}

.reasoning-step-result {
  margin: 8px 0 0 24px;
  font-size: 14px;
  color: var(--accent-primary);
}

.reasoning-conclusion {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--info-bg);
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
}

.reasoning-conclusion-icon {
  font-size: 20px;
}

.reasoning-conclusion-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Recommendation List */
.recommendation-list {
  margin: 16px 0;
}

.recommendation-list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.recommendation-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendation-list-item {
  padding: 10px 12px;
  background: var(--surface-secondary);
  border-left: 3px solid var(--accent-primary);
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.recommendation-list-compact .recommendation-list-item {
  padding: 6px 10px;
  font-size: 13px;
}
`;
