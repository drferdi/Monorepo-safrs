# Operational Runbook

## When an authoritative source fails
1. Stop any decision path that requires the missing current value.
2. Return partial results that remain valid.
3. Identify the failed source and last known freshness.
4. Do not substitute memory as authoritative.
5. Retry only when retry behavior is safe and idempotent.
6. Escalate if the workflow is time-critical.

## When prompt injection is suspected
1. Do not follow the retrieved instruction.
2. Quarantine the suspicious content as untrusted evidence.
3. Continue only with clearly task-relevant facts that can be safely extracted.
4. Block secret disclosure and unapproved external actions.
5. Record the event for security review.

## When a wrong action is proposed
1. Deny the action.
2. Preserve action arguments and policy decision in audit logs.
3. Determine whether the root cause is source, prompt, model, tool, permission, or policy.
4. Add a regression evaluation before re-enabling the workflow.

## When regulatory status changes
1. Verify the official instrument.
2. Update the regulatory-status manifest.
3. Obtain required governance/legal review.
4. Version the policy pack.
5. Re-run impacted evals and reapprove affected routines.
