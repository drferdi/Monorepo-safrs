import type { BotTemplate, ValidationIssue, ValidationResult, ConsequentialCategory } from '../domain/types';

const CORE_APPROVALS: ConsequentialCategory[] = [
  'external_communication',
  'purchase',
  'funds_transfer',
  'delete_or_overwrite',
  'permission_change',
  'production_change',
  'accept_legal_terms'
];

function issue(path: string, code: string, message: string, severity: 'error' | 'warning' = 'error'): ValidationIssue {
  return { path, code, message, severity };
}

export function validateTemplate(template: BotTemplate): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!template.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(template.id)) {
    issues.push(issue('id', 'INVALID_ID', 'Template id must be lowercase kebab-case.'));
  }
  if (!/^\d+\.\d+\.\d+$/.test(template.version)) {
    issues.push(issue('version', 'INVALID_VERSION', 'Template version must use semantic x.y.z format.'));
  }
  if (template.authority.defaultLevel === 'execute') {
    issues.push(issue('authority.defaultLevel', 'DEFAULT_AUTHORITY_TOO_HIGH', 'Execute cannot be the default authority level.'));
  }
  if (!template.scope.excludes?.length) {
    issues.push(issue('scope.excludes', 'MISSING_EXCLUSIONS', 'Every role must declare explicit exclusions.'));
  }
  if (!template.scope.owns?.length) {
    issues.push(issue('scope.owns', 'MISSING_OWNERSHIP', 'Every role must own at least one outcome or responsibility.'));
  }
  if (!template.sourcesOfTruth?.some(source => source.authority === 'authoritative')) {
    issues.push(issue('sourcesOfTruth', 'NO_AUTHORITATIVE_SOURCE', 'At least one authoritative source class is required.'));
  }
  if (template.evidence.memoryAuthoritative !== false) {
    issues.push(issue('evidence.memoryAuthoritative', 'MEMORY_AUTHORITY_FORBIDDEN', 'Memory must never be authoritative for consequential decisions.'));
  }
  const missingApprovals = CORE_APPROVALS.filter(category => !template.approvals.mandatory.includes(category));
  if (missingApprovals.length) {
    issues.push(issue('approvals.mandatory', 'MISSING_CORE_APPROVALS', `Missing mandatory approval categories: ${missingApprovals.join(', ')}.`));
  }
  if (!template.operatingModel || template.operatingModel.keyQuestions?.length < 3 || template.operatingModel.kpis?.length < 2 || !template.operatingModel.routineSeeds?.length) {
    issues.push(issue('operatingModel', 'MISSING_OPERATING_MODEL', 'Every production role needs key questions, KPIs, cadences, routine seeds, and escalation triggers.'));
  }
  if (template.workflow.skillBeforeRoutine !== true || template.workflow.routineRequiresTestRun !== true) {
    issues.push(issue('workflow', 'UNSAFE_AUTOMATION_LIFECYCLE', 'Templates must require a tested skill before unattended routine execution.'));
  }
  if (!template.evaluation.mandatoryCases?.includes('approval-boundary')) {
    issues.push(issue('evaluation.mandatoryCases', 'MISSING_APPROVAL_EVAL', 'Approval-boundary must be a mandatory evaluation case.'));
  }
  if (template.evaluation.minimumPassRate < 0.9) {
    issues.push(issue('evaluation.minimumPassRate', 'LOW_EVAL_THRESHOLD', 'Production starter templates should target at least 0.90 pass rate.', 'warning'));
  }

  return { valid: issues.every(item => item.severity !== 'error'), issues };
}
