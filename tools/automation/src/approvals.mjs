/**
 * Approval plane. An approval is data bound to exact content, never a
 * standing permission: task, contract digest, subject SHA, diff digest,
 * reviewer authority, and expiry must all still match at the moment of use.
 * Every failure path returns invalid — there is no "probably fine".
 */

const R2_KINDS = new Set([
  "R2_CODE_OWNER",
  "R2_INDEPENDENT",
  "VERIFICATION_INTEGRITY",
]);

function invalid(reason) {
  return { valid: false, reason };
}

export function verifyApproval(approval, subject) {
  if (!approval || typeof approval !== "object") {
    return invalid("no approval record");
  }
  if (approval.task_id !== subject.task_id) {
    return invalid(
      `task mismatch: approval ${approval.task_id} vs subject ${subject.task_id}`,
    );
  }
  if (approval.contract_digest !== subject.contract_digest) {
    return invalid("contract digest changed since the approval was issued");
  }
  if (approval.subject_sha !== subject.head_sha) {
    return invalid(
      "stale head: the approval was issued for a different commit",
    );
  }
  if (approval.revoked_at) {
    return invalid(`approval was revoked at ${approval.revoked_at}`);
  }
  if (Date.parse(subject.now) > Date.parse(approval.expires_at)) {
    return invalid(`approval expired at ${approval.expires_at}`);
  }
  if (approval.reviewer_identity === approval.author_identity) {
    return invalid("self-review is never a qualifying approval");
  }
  if (approval.reviewer_identity === subject.author_identity) {
    return invalid("self-review: reviewer authored the subject change");
  }
  const authorized = subject.authorized_reviewers ?? [];
  if (!authorized.includes(approval.reviewer_identity)) {
    return invalid(`unknown reviewer authority: ${approval.reviewer_identity}`);
  }

  if (R2_KINDS.has(approval.kind)) {
    if (!approval.diff_digest) {
      return invalid("R2 approval requires a diff digest binding");
    }
    if (approval.diff_digest !== subject.diff_digest) {
      return invalid("diff digest changed since the approval was issued");
    }
    return { valid: true, reason: "" };
  }

  if (approval.kind === "R3_EXECUTION") {
    for (const field of [
      "operation_digest",
      "target_environment",
      "idempotency_key",
    ]) {
      if (!approval[field]) {
        return invalid(`R3 approval requires a ${field} binding`);
      }
      if (subject[field] === undefined) {
        return invalid(`subject is missing ${field} for R3 revalidation`);
      }
      if (approval[field] !== subject[field]) {
        return invalid(
          `${field} drift: approval ${approval[field]} vs subject ${subject[field]}`,
        );
      }
    }
    return { valid: true, reason: "" };
  }

  return invalid(`unknown approval kind: ${approval.kind}`);
}

/**
 * Normalize GitHub reviews into ApprovalRecordV1 candidates. Only current,
 * approving, non-dismissed reviews on the exact head survive.
 */
export function normalizeGitHubReview(reviews, context) {
  const expiresInHours = context.expires_in_hours ?? 24;
  return (reviews ?? [])
    .filter(
      (review) =>
        review.state === "APPROVED" && review.commit_id === context.head_sha,
    )
    .map((review) => ({
      schema_version: 1,
      approval_id: `APR-GH-${review.id}`,
      kind: "R2_CODE_OWNER",
      task_id: context.task_id,
      contract_digest: context.contract_digest,
      subject_sha: review.commit_id,
      diff_digest: context.diff_digest,
      operation_digest: null,
      target_environment: null,
      idempotency_key: null,
      reviewer_identity: review.user?.login ?? "",
      reviewer_authority: "code-owner",
      author_identity: context.author_identity,
      issued_at: review.submitted_at,
      expires_at: new Date(
        Date.parse(review.submitted_at) + expiresInHours * 3_600_000,
      )
        .toISOString()
        .replace(/\.\d{3}Z$/u, "Z"),
      source_event_url: review.html_url,
      source_event_id: `review-${review.id}`,
      revoked_at: null,
    }));
}

/** Does any approval in the set qualify for this exact subject? */
export function findQualifyingApproval(approvals, subject) {
  for (const approval of approvals ?? []) {
    const verdict = verifyApproval(approval, subject);
    if (verdict.valid) {
      return { approval, verdict };
    }
  }
  return { approval: null, verdict: invalid("no qualifying approval") };
}
