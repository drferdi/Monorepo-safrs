import { FailureClass, WorkerClass } from './constants.mjs';

export function escalationDecision({ failureClass, currentClass, attempts = 1, maxAttempts = 2 }) {
  if (!Object.values(FailureClass).includes(failureClass)) {
    throw new TypeError(`Unknown failure class: ${failureClass}`);
  }
  if (failureClass === FailureClass.CAPABILITY_MISMATCH || failureClass === FailureClass.SECURITY_RISK) {
    if (currentClass === WorkerClass.ECONOMY) return { action: 'ESCALATE', workerClass: WorkerClass.STRONG };
    return { action: 'BLOCK', reason: failureClass };
  }
  if (failureClass === FailureClass.SPEC_ERROR && currentClass === WorkerClass.ECONOMY && attempts < Math.min(maxAttempts, 2)) {
    return { action: 'RETRY_SAME', workerClass: currentClass };
  }
  if ([FailureClass.SCOPE_VIOLATION, FailureClass.BLOCKED_REQUIREMENT, FailureClass.BUDGET_EXHAUSTED].includes(failureClass)) {
    return { action: 'BLOCK', reason: failureClass };
  }
  if (attempts >= maxAttempts) {
    if (currentClass === WorkerClass.ECONOMY) return { action: 'ESCALATE', workerClass: WorkerClass.STRONG };
    return { action: 'BLOCK', reason: 'ATTEMPT_LIMIT' };
  }
  return { action: 'RETRY_SAME', workerClass: currentClass };
}
