import { findQualifyingApproval } from "./approvals.mjs";

/**
 * Publication eligibility. The publisher identity may do exactly one thing:
 * request GitHub auto-merge for an exact, fully verified head. It cannot
 * merge, push, approve, bypass rules, or deploy — this module therefore
 * never returns a "merge" action, only "enable_auto_merge".
 *
 * Every gate is evaluated; the verdict lists all missing gates so an
 * operator sees the whole picture rather than one error at a time.
 */

export const REQUIRED_CHECKS = [
  "safrs.contract",
  "safrs.lease",
  "safrs.risk",
  "safrs.budgets",
  "safrs.verification",
  "safrs.review",
  "safrs.evidence",
  "safrs.platform",
];

export function evaluatePublication(pullRequest, evidence, context = {}) {
  const missingGates = [];
  const now = context.now;
  const risk = evidence?.effective_risk ?? "unknown";

  if (!evidence) {
    return {
      eligible: false,
      risk,
      missingGates: ["evidence: no manifest supplied"],
      headSha: pullRequest?.head_sha ?? null,
      action: "enable_auto_merge",
    };
  }

  // Exact-head binding: a new commit invalidates everything computed before.
  if (evidence.head_sha !== pullRequest.head_sha) {
    missingGates.push(
      `head mismatch: evidence ${evidence.head_sha} vs pull request ${pullRequest.head_sha}`,
    );
  }
  if (
    pullRequest.diff_digest &&
    evidence.diff_digest !== pullRequest.diff_digest
  ) {
    missingGates.push("diff digest mismatch between evidence and pull request");
  }

  const verdicts = new Map(
    (evidence.check_verdicts ?? []).map((entry) => [entry.check_id, entry]),
  );
  for (const checkId of REQUIRED_CHECKS) {
    const verdict = verdicts.get(checkId);
    if (!verdict) {
      missingGates.push(`missing required check: ${checkId}`);
    } else if (verdict.verdict !== "PASS") {
      missingGates.push(`failing required check: ${checkId}`);
    }
  }

  const platform = context.platform;
  if (!platform) {
    missingGates.push("platform attestation missing");
  } else {
    if (Date.parse(now) > Date.parse(platform.expires_at)) {
      missingGates.push("platform attestation expired");
    }
    if (platform.force_push_blocked !== true) {
      missingGates.push("platform drift: force push is not blocked");
    }
    if (platform.code_owner_review !== true) {
      missingGates.push("platform drift: code-owner review is not required");
    }
  }

  if (risk === "R2" || risk === "R3") {
    const subject = {
      task_id: evidence.task_id,
      contract_digest: evidence.contract_digest,
      head_sha: pullRequest.head_sha,
      diff_digest: evidence.diff_digest,
      author_identity: pullRequest.author_identity,
      authorized_reviewers: context.authorizedReviewers ?? [],
      now,
    };
    const { approval, verdict } = findQualifyingApproval(
      context.approvals ?? [],
      subject,
    );
    if (!approval) {
      missingGates.push(`approval required for ${risk}: ${verdict.reason}`);
    } else if (!(evidence.approval_ids ?? []).includes(approval.approval_id)) {
      missingGates.push(
        "approval is not recorded in the evidence manifest approval_ids",
      );
    }
  }

  // An R3 operation is never published through this path; only its code is.
  if (evidence.execution) {
    missingGates.push(
      "R3 operation evidence present: consequential execution never publishes through the publisher",
    );
  }

  return {
    eligible: missingGates.length === 0,
    risk,
    missingGates,
    headSha: pullRequest.head_sha,
    action: "enable_auto_merge",
  };
}
