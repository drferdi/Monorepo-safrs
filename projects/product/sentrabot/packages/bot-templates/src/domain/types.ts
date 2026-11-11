export type AuthorityLevel = 'observe' | 'prepare' | 'propose' | 'execute';
export type PolicyEffect = 'ALLOW' | 'REQUIRE_APPROVAL' | 'DENY';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceFreshness = 'current' | 'time_bound' | 'best_effort';

export type ConsequentialCategory =
  | 'external_communication'
  | 'publish'
  | 'purchase'
  | 'funds_transfer'
  | 'delete_or_overwrite'
  | 'permission_change'
  | 'production_change'
  | 'accept_legal_terms'
  | 'patient_facing_action'
  | 'clinical_action'
  | 'regulatory_submission'
  | 'employment_decision'
  | 'security_sensitive_change';

export interface Identity {
  title: string;
  shortTitle: string;
  icon: string;
  category: string;
  featured?: boolean;
}

export interface Mission {
  primaryOutcome: string;
  successSignals: string[];
}

export interface ScopeDefinition {
  owns: string[];
  excludes: string[];
}

export interface SourceDefinition {
  name: string;
  authority: 'authoritative' | 'supporting' | 'contextual';
  freshness: EvidenceFreshness;
  notes?: string;
}

export interface AuthorityPolicy {
  defaultLevel: AuthorityLevel;
  observe: string[];
  prepare: string[];
  propose: string[];
  execute: string[];
  denied: string[];
}

export interface ApprovalPolicy {
  mandatory: ConsequentialCategory[];
  additional: string[];
  neverAutoApprove: string[];
}

export interface EvidencePolicy {
  citationsRequiredFor: string[];
  staleData: 'block' | 'disclose_and_continue' | 'escalate';
  conflictingSources: 'escalate' | 'prefer_authoritative_and_disclose';
  memoryAuthoritative: false;
}

export interface OutputField {
  id: string;
  label: string;
  required: boolean;
}

export interface OutputContract {
  format: 'structured_brief' | 'memo' | 'register' | 'mixed';
  fields: OutputField[];
}

export interface RiskProfile {
  inherent: RiskLevel;
  regulatedDomain: boolean;
  personalData: 'none' | 'standard' | 'sensitive';
  humanOversight: 'standard' | 'enhanced' | 'mandatory';
}

export interface WorkflowPolicy {
  skillBeforeRoutine: true;
  routineRequiresTestRun: true;
  noDataBehavior: string;
  partialCompletionBehavior: string;
}


export interface RoutineSeed {
  name: string;
  trigger: string;
  output: string;
  approvalBoundary: 'prepare_only' | 'approval_gated_execute';
}

export interface OperatingModel {
  keyQuestions: string[];
  kpis: string[];
  cadences: { daily: string[]; weekly: string[]; monthly: string[] };
  routineSeeds: RoutineSeed[];
  escalationTriggers: string[];
}

export interface EvaluationManifest {
  suites: string[];
  minimumPassRate: number;
  mandatoryCases: string[];
}

export interface BotTemplate {
  schemaVersion: '1.0';
  id: string;
  version: string;
  locale: string;
  identity: Identity;
  mission: Mission;
  scope: ScopeDefinition;
  sourcesOfTruth: SourceDefinition[];
  authority: AuthorityPolicy;
  approvals: ApprovalPolicy;
  evidence: EvidencePolicy;
  output: OutputContract;
  risk: RiskProfile;
  workflow: WorkflowPolicy;
  operatingModel: OperatingModel;
  evaluation: EvaluationManifest;
  tags: string[];
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ActionRequest {
  capability: string;
  requestedLevel: AuthorityLevel;
  category?: ConsequentialCategory;
  irreversible?: boolean;
  externalEffect?: boolean;
  regulated?: boolean;
}

export interface PolicyDecision {
  effect: PolicyEffect;
  reason: string;
  approvalCategory?: ConsequentialCategory;
}

export interface PromptLayer {
  id: string;
  priority: number;
  content: string;
  safetyBoundary?: boolean;
}
