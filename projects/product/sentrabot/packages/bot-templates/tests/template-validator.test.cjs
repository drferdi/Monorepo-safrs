const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTemplate } = require('../dist/src/validation/template-validator.js');

function baseTemplate() {
  return {
    schemaVersion: '1.0', id: 'executive-chief-of-staff', version: '1.0.0', locale: 'id-ID',
    identity: { title:'Executive Chief of Staff', shortTitle:'Executive', icon:'target', category:'leadership' },
    mission: { primaryOutcome:'Protect executive attention and drive commitments to closure.', successSignals:['decisions surfaced','commitments tracked'] },
    scope: { owns:['priority triage'], excludes:['financial transfers'] },
    sourcesOfTruth: [{name:'approved enterprise systems', authority:'authoritative', freshness:'current'}],
    authority: { defaultLevel:'prepare', observe:['read'], prepare:['analyze','draft'], propose:['prepare_action'], execute:[], denied:['bypass_approval'] },
    approvals: { mandatory:['external_communication','purchase','funds_transfer','delete_or_overwrite','permission_change','production_change','accept_legal_terms'], additional:[], neverAutoApprove:['funds_transfer'] },
    evidence: { citationsRequiredFor:['consequential_claims'], staleData:'escalate', conflictingSources:'prefer_authoritative_and_disclose', memoryAuthoritative:false },
    output: { format:'structured_brief', fields:[{id:'executive_summary',label:'Executive summary',required:true}] },
    risk: { inherent:'medium', regulatedDomain:false, personalData:'standard', humanOversight:'standard' },
    workflow: { skillBeforeRoutine:true, routineRequiresTestRun:true, noDataBehavior:'report failure', partialCompletionBehavior:'report partial completion' },
    operatingModel: { keyQuestions:['what changed?','what needs a decision?','what is at risk?'], kpis:['decision latency','commitment closure'], cadences:{daily:['exceptions'],weekly:['operating review'],monthly:['trend review']}, routineSeeds:[{name:'Daily brief',trigger:'weekday 08:00 local',output:'exception brief',approvalBoundary:'prepare_only'}], escalationTriggers:['material source conflict','out-of-scope consequential action'] },
    evaluation: { suites:['core'], minimumPassRate:0.95, mandatoryCases:['approval-boundary'] },
    tags:['leadership']
  };
}

test('accepts a production-safe template', () => {
  const result = validateTemplate(baseTemplate());
  assert.equal(result.valid, true);
  assert.equal(result.issues.filter(i => i.severity === 'error').length, 0);
});

test('rejects execute as the default authority', () => {
  const input = baseTemplate();
  input.authority.defaultLevel = 'execute';
  const result = validateTemplate(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(i => i.code === 'DEFAULT_AUTHORITY_TOO_HIGH'));
});

test('requires explicit exclusions and authoritative sources', () => {
  const input = baseTemplate();
  input.scope.excludes = [];
  input.sourcesOfTruth = [{name:'memory', authority:'contextual', freshness:'best_effort'}];
  const result = validateTemplate(input);
  assert.ok(result.issues.some(i => i.code === 'MISSING_EXCLUSIONS'));
  assert.ok(result.issues.some(i => i.code === 'NO_AUTHORITATIVE_SOURCE'));
});

test('requires memory to remain non-authoritative and consequential approval gates', () => {
  const input = baseTemplate();
  input.evidence.memoryAuthoritative = true;
  input.approvals.mandatory = ['external_communication'];
  const result = validateTemplate(input);
  assert.ok(result.issues.some(i => i.code === 'MEMORY_AUTHORITY_FORBIDDEN'));
  assert.ok(result.issues.some(i => i.code === 'MISSING_CORE_APPROVALS'));
});

test('requires an explicit operating model with key questions, KPIs, and routine seeds', () => {
  const input = baseTemplate();
  delete input.operatingModel;
  const result = validateTemplate(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(i => i.code === 'MISSING_OPERATING_MODEL'));
});
