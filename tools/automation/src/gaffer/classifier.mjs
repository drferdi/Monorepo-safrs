import { Route, WorkerClass } from './constants.mjs';

const HIGH_RISK_TAGS = new Set([
  'security', 'auth', 'authentication', 'authorization', 'billing', 'payments',
  'migration', 'destructive', 'production', 'infrastructure', 'concurrency',
]);

function hasHighRiskTag(tags = []) {
  return tags.some((tag) => HIGH_RISK_TAGS.has(String(tag).toLowerCase()));
}

export function selectExecutionRoute(input = {}) {
  const {
    estimatedUnits = 1,
    separable = false,
    ambiguity = 'low',
    blastRadius = 'local',
    delegationOverhead = 'low',
  } = input;

  if (ambiguity === 'high') return Route.SOLO;
  if (estimatedUnits <= 1 && blastRadius === 'local') return Route.SOLO;
  if (delegationOverhead === 'high' && estimatedUnits <= 2) return Route.SOLO;
  if (separable && estimatedUnits >= 2) return Route.DECOMPOSE;
  if (blastRadius === 'cross-project' || estimatedUnits >= 3) return Route.DECOMPOSE;
  return Route.SOLO;
}

export function classifyWorker(task = {}, safrsDecision = {}) {
  if (safrsDecision.forceWorkerClass) return safrsDecision.forceWorkerClass;
  if (safrsDecision.highRisk === true || hasHighRiskTag(task.riskTags)) return WorkerClass.STRONG;

  const bounded = Array.isArray(task.ownedPaths) && task.ownedPaths.length > 0;
  const testable = Array.isArray(task.verification) && task.verification.length > 0;
  const architectureSettled = task.architectureSettled !== false;
  const ambiguous = task.ambiguity === 'high';
  const crossModule = task.crossModule === true;

  if (bounded && testable && architectureSettled && !ambiguous && !crossModule) {
    return WorkerClass.ECONOMY;
  }
  return WorkerClass.STRONG;
}
