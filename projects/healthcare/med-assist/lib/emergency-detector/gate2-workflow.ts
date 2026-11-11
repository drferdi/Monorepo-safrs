// Designed and constructed by Drferdi.
import { getActionProtocol, type ABCDEPhase, type ActionProtocol } from './action-protocols';
import type { AlertSeverity } from './pattern-types';

export interface Gate2AlertInput {
  id: string;
  patternId?: string;
  severity: AlertSeverity;
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  actionProtocolId?: string;
  confidence?: number;
  matchedCriteria?: string[];
  differentials?: string[];
  source?: string;
}

export interface Gate2ActionItem {
  id: string;
  phase: ABCDEPhase;
  action: string;
}

export interface Gate2ActionLogItem extends Gate2ActionItem {
  completed: boolean;
}

export interface Gate2ProtocolView {
  id: string;
  name: string;
  condition: string;
  source: string;
}

export interface Gate2Workflow {
  active: boolean;
  severity: AlertSeverity | 'none';
  primaryAlert: Gate2AlertInput | null;
  primaryProtocol: Gate2ProtocolView | null;
  actionItems: Gate2ActionItem[];
  referralCriteria: string[];
  matchedCriteria: string[];
  problemDirections: string[];
  criticalAlerts: Gate2AlertInput[];
  highAlerts: Gate2AlertInput[];
  remeasurePrompt: string;
  reviewRequired: boolean;
}

export interface Gate2WorkflowPayload extends Gate2Workflow {
  actionLog: Gate2ActionLogItem[];
  completedActionCount: number;
  remeasureRequestedAt?: string;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  warning: 2,
};

const actionProtocolRank = (alert: Gate2AlertInput): number => (alert.actionProtocolId ? 0 : 1);

export function sortGate2Alerts<T extends Gate2AlertInput>(alerts: readonly T[]): T[] {
  return alerts
    .map((alert, index) => ({ alert, index }))
    .sort((left, right) => {
      const severityDiff =
        SEVERITY_ORDER[left.alert.severity] - SEVERITY_ORDER[right.alert.severity];
      if (severityDiff !== 0) return severityDiff;

      const actionDiff = actionProtocolRank(left.alert) - actionProtocolRank(right.alert);
      if (actionDiff !== 0) return actionDiff;

      const confidenceDiff = (right.alert.confidence ?? 0) - (left.alert.confidence ?? 0);
      if (confidenceDiff !== 0) return confidenceDiff;

      return left.index - right.index;
    })
    .map(({ alert }) => alert);
}

function toProtocolView(protocol: ActionProtocol | undefined): Gate2ProtocolView | null {
  if (!protocol) return null;

  return {
    id: protocol.id,
    name: protocol.name,
    condition: protocol.condition,
    source: protocol.source,
  };
}

function buildActionItems(alert: Gate2AlertInput, protocol: ActionProtocol | undefined) {
  if (protocol) {
    return protocol.steps.map((step, index) => ({
      id: `${protocol.id}-${index + 1}`,
      phase: step.phase,
      action: step.action,
    }));
  }

  return alert.recommendations.map((action, index) => ({
    id: `${alert.id}-recommendation-${index + 1}`,
    phase: 'other' as const,
    action,
  }));
}

function uniqueText(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
}

function resolveRemeasurePrompt(severity: AlertSeverity | 'none'): string {
  if (severity === 'critical') {
    return 'Re-measure vital sign tiap 5 menit sampai dokter/rujukan aktif.';
  }

  if (severity === 'high') {
    return 'Re-measure vital sign dalam 10-15 menit atau lebih cepat bila memburuk.';
  }

  if (severity === 'warning') {
    return 'Re-measure sesuai observasi klinis dan ulang bila gejala berubah.';
  }

  return '';
}

export function buildGate2Workflow(alerts: readonly Gate2AlertInput[]): Gate2Workflow {
  const sortedAlerts = sortGate2Alerts(alerts);
  const primaryAlert =
    sortedAlerts.find((alert) => alert.actionProtocolId) ?? sortedAlerts[0] ?? null;

  if (!primaryAlert) {
    return {
      active: false,
      severity: 'none',
      primaryAlert: null,
      primaryProtocol: null,
      actionItems: [],
      referralCriteria: [],
      matchedCriteria: [],
      problemDirections: [],
      criticalAlerts: [],
      highAlerts: [],
      remeasurePrompt: '',
      reviewRequired: false,
    };
  }

  const protocol = primaryAlert.actionProtocolId
    ? getActionProtocol(primaryAlert.actionProtocolId)
    : undefined;

  return {
    active: true,
    severity: primaryAlert.severity,
    primaryAlert,
    primaryProtocol: toProtocolView(protocol),
    actionItems: buildActionItems(primaryAlert, protocol),
    referralCriteria: protocol?.referralCriteria ?? primaryAlert.recommendations,
    matchedCriteria: primaryAlert.matchedCriteria ?? [],
    problemDirections: uniqueText([
      ...(primaryAlert.differentials ?? []),
      protocol?.condition,
      primaryAlert.gate.replace('GATE_', '').replace(/_/g, ' '),
    ]),
    criticalAlerts: sortedAlerts.filter((alert) => alert.severity === 'critical'),
    highAlerts: sortedAlerts.filter((alert) => alert.severity === 'high'),
    remeasurePrompt: resolveRemeasurePrompt(primaryAlert.severity),
    reviewRequired: primaryAlert.severity === 'critical' || primaryAlert.severity === 'high',
  };
}
