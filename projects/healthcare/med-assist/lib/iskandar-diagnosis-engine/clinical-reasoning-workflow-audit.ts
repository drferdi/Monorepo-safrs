import type {
  ClinicalReasoningWorkflowAuditEvent,
  ClinicalReasoningWorkflowResult,
  ClinicalReasoningWorkflowStatus,
} from './clinical-reasoning-workflow';
import type { TherapyReasoningPackStatus } from './clinical-reasoning-therapy';

const STORAGE_KEY = 'sentra:clinical-reasoning:workflow-audit';
const DEFAULT_MAX_RECORDS = 100;
const AUDIT_SCHEMA_VERSION = 1;

export interface ClinicalReasoningWorkflowAuditStageRecord {
  sequence: number;
  stage: ClinicalReasoningWorkflowAuditEvent['stage'];
  status: ClinicalReasoningWorkflowAuditEvent['status'];
  summary: string;
  sourceRefs: string[];
}

export interface ClinicalReasoningWorkflowTherapyAuditSummary {
  status: TherapyReasoningPackStatus;
  automationLevel: 'review_only';
  autoSubmit: false;
  requiresPhysicianOrder: true;
  actionIds: string[];
}

export interface ClinicalReasoningWorkflowAuditRecord {
  id: string;
  schemaVersion: number;
  createdAt: string;
  encounterHash: string;
  workflowStatus: ClinicalReasoningWorkflowStatus;
  selectedWorkingDiagnosisId: string | null;
  selectedWorkingDiagnosisName: string | null;
  reviewQueueCandidateIds: string[];
  mustNotMissCandidateIds: string[];
  stageTrail: ClinicalReasoningWorkflowAuditStageRecord[];
  therapySummary: ClinicalReasoningWorkflowTherapyAuditSummary;
}

interface ClinicalReasoningWorkflowAuditStoragePayload {
  schemaVersion: number;
  updatedAt: string;
  records: ClinicalReasoningWorkflowAuditRecord[];
}

export interface ClinicalReasoningWorkflowAuditStorage {
  getItem(key: string): Promise<ClinicalReasoningWorkflowAuditStoragePayload | null>;
  setItem(key: string, value: ClinicalReasoningWorkflowAuditStoragePayload): Promise<void>;
}

export interface PersistClinicalReasoningWorkflowAuditInput {
  workflow: ClinicalReasoningWorkflowResult;
  encounterId: string;
  storage?: ClinicalReasoningWorkflowAuditStorage;
  maxRecords?: number;
  now?: () => string;
  idFactory?: () => string;
}

export interface ListClinicalReasoningWorkflowAuditRecordsInput {
  storage?: ClinicalReasoningWorkflowAuditStorage;
}

export function createMemoryClinicalWorkflowAuditStorage(): ClinicalReasoningWorkflowAuditStorage {
  const values = new Map<string, ClinicalReasoningWorkflowAuditStoragePayload>();

  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

function getDefaultStorage(): ClinicalReasoningWorkflowAuditStorage {
  return {
    async getItem(key) {
      if (typeof browser === 'undefined') return null;
      const result = await browser.storage.local.get(key);
      return (result[key] as ClinicalReasoningWorkflowAuditStoragePayload | undefined) ?? null;
    },
    async setItem(key, value) {
      if (typeof browser === 'undefined') return;
      await browser.storage.local.set({ [key]: value });
    },
  };
}

function hashDeidentified(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `wf-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function createAuditRecord({
  workflow,
  encounterId,
  now,
  idFactory,
}: Required<Pick<PersistClinicalReasoningWorkflowAuditInput, 'workflow' | 'encounterId' | 'now' | 'idFactory'>>): ClinicalReasoningWorkflowAuditRecord {
  const selected = workflow.arbiterResult.selectedWorkingDiagnosis;

  return {
    id: idFactory(),
    schemaVersion: AUDIT_SCHEMA_VERSION,
    createdAt: now(),
    encounterHash: hashDeidentified(encounterId),
    workflowStatus: workflow.workflowStatus,
    selectedWorkingDiagnosisId: selected?.id ?? null,
    selectedWorkingDiagnosisName: selected?.name ?? null,
    reviewQueueCandidateIds: workflow.arbiterResult.reviewQueue.map((candidate) => candidate.id),
    mustNotMissCandidateIds: workflow.arbiterResult.mustNotMissCandidates.map(
      (candidate) => candidate.id
    ),
    stageTrail: workflow.auditTrail.map((event) => ({
      sequence: event.sequence,
      stage: event.stage,
      status: event.status,
      summary: event.summary,
      sourceRefs: [...event.sourceRefs],
    })),
    therapySummary: {
      status: workflow.therapyReasoningPack.status,
      automationLevel: workflow.therapyReasoningPack.automationLevel,
      autoSubmit: workflow.therapyReasoningPack.autoSubmit,
      requiresPhysicianOrder: workflow.therapyReasoningPack.requiresPhysicianOrder,
      actionIds: workflow.therapyReasoningPack.actions.map((action) => action.id),
    },
  };
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `workflow-audit-${Date.now().toString(36)}`;
}

export async function persistClinicalReasoningWorkflowAudit({
  workflow,
  encounterId,
  storage = getDefaultStorage(),
  maxRecords = DEFAULT_MAX_RECORDS,
  now = () => new Date().toISOString(),
  idFactory = randomId,
}: PersistClinicalReasoningWorkflowAuditInput): Promise<ClinicalReasoningWorkflowAuditRecord> {
  const record = createAuditRecord({ workflow, encounterId, now, idFactory });
  const existing = await storage.getItem(STORAGE_KEY);
  const records = [record, ...(existing?.records ?? [])].slice(0, maxRecords);

  await storage.setItem(STORAGE_KEY, {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    updatedAt: now(),
    records,
  });

  return record;
}

export async function listClinicalReasoningWorkflowAuditRecords({
  storage = getDefaultStorage(),
}: ListClinicalReasoningWorkflowAuditRecordsInput = {}): Promise<
  ClinicalReasoningWorkflowAuditRecord[]
> {
  const existing = await storage.getItem(STORAGE_KEY);
  return existing?.records ?? [];
}
