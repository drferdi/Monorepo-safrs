const test = require('node:test');
const assert = require('node:assert/strict');
const { decideAction } = require('../dist/src/policy/approval-engine.js');

function template() {
  return {
    authority: {
      defaultLevel:'prepare', observe:['read','search'], prepare:['analyze','draft'], propose:['prepare_action'], execute:['update_internal_record'], denied:['bypass_approval','delete_audit_log']
    },
    approvals: {
      mandatory:['external_communication','purchase','funds_transfer','delete_or_overwrite','permission_change','production_change','accept_legal_terms'],
      additional:['submit_regulatory_filing'],
      neverAutoApprove:['funds_transfer','accept_legal_terms']
    }
  };
}

test('DENY takes precedence for explicitly denied capabilities', () => {
  const result = decideAction(template(), {capability:'delete_audit_log',requestedLevel:'execute'});
  assert.equal(result.effect, 'DENY');
});

test('mandatory consequential category requires approval even when capability is executable', () => {
  const result = decideAction(template(), {capability:'update_internal_record',requestedLevel:'execute',category:'production_change'});
  assert.equal(result.effect, 'REQUIRE_APPROVAL');
  assert.equal(result.approvalCategory, 'production_change');
});

test('prepare-level analysis is allowed by default', () => {
  const result = decideAction(template(), {capability:'analyze',requestedLevel:'prepare'});
  assert.equal(result.effect, 'ALLOW');
});

test('execute request is denied when capability is not explicitly executable', () => {
  const result = decideAction(template(), {capability:'send_email',requestedLevel:'execute'});
  assert.equal(result.effect, 'DENY');
});

test('explicit low-risk execute capability can be allowed', () => {
  const result = decideAction(template(), {capability:'update_internal_record',requestedLevel:'execute'});
  assert.equal(result.effect, 'ALLOW');
});
