import type { ActionRequest, ApprovalPolicy, AuthorityPolicy, PolicyDecision } from '../domain/types';

interface PolicyTemplateSubset {
  authority: AuthorityPolicy;
  approvals: ApprovalPolicy;
}

function includesCapability(list: string[], capability: string): boolean {
  return list.includes(capability);
}

export function decideAction(template: PolicyTemplateSubset, action: ActionRequest): PolicyDecision {
  const { authority, approvals } = template;

  if (includesCapability(authority.denied, action.capability)) {
    return { effect: 'DENY', reason: `Capability ${action.capability} is explicitly denied.` };
  }

  if (action.category && approvals.mandatory.includes(action.category)) {
    return {
      effect: 'REQUIRE_APPROVAL',
      reason: `Category ${action.category} is configured as a mandatory approval boundary.`,
      approvalCategory: action.category
    };
  }

  if (action.irreversible || action.regulated || action.externalEffect) {
    return {
      effect: 'REQUIRE_APPROVAL',
      reason: 'Irreversible, regulated, or externally consequential actions require explicit approval.'
    };
  }

  if (approvals.additional.includes(action.capability)) {
    return { effect: 'REQUIRE_APPROVAL', reason: `Capability ${action.capability} requires additional approval.` };
  }

  const capabilitiesByLevel: Record<ActionRequest['requestedLevel'], string[]> = {
    observe: authority.observe,
    prepare: authority.prepare,
    propose: authority.propose,
    execute: authority.execute
  };

  if (!includesCapability(capabilitiesByLevel[action.requestedLevel], action.capability)) {
    return {
      effect: 'DENY',
      reason: `Capability ${action.capability} is not granted at ${action.requestedLevel} level.`
    };
  }

  return { effect: 'ALLOW', reason: `Capability ${action.capability} is explicitly granted at ${action.requestedLevel} level.` };
}
