import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyApproval } from "./approvals.mjs";
import { compileTaskContract, loadCompileContext } from "./contracts.mjs";
import { verifyManifest } from "./evidence.mjs";
import { verifyEventChain } from "./leases.mjs";
import { compareRisk } from "./risk.mjs";

/**
 * Stable PR gate verdicts. Each gate validates the artifacts that exist in
 * the change set; when a gate's artifacts are genuinely absent (a
 * human-authored PR carries no run evidence, for example) it reports
 * "not_applicable" and passes. When artifacts exist but are invalid,
 * incomplete, or internally inconsistent, the gate fails closed.
 *
 * The artifact-producing phases (7 for runs, 6 for platform attestation)
 * turn the currently-empty gates into enforcing ones without any change
 * here: the same code starts finding artifacts to validate.
 */

export const GATES = [
  "safrs.contract",
  "safrs.lease",
  "safrs.risk",
  "safrs.budgets",
  "safrs.verification",
  "safrs.review",
  "safrs.evidence",
  "safrs.platform",
];

function readJsonDirectory(root, relative) {
  const directory = join(root, relative);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      name: `${relative}/${file}`,
      data: JSON.parse(readFileSync(join(directory, file), "utf8")),
    }));
}

function pass(reason, checked = 0) {
  return { verdict: "PASS", reason, checked };
}

function fail(reason, errors = []) {
  return { verdict: "FAIL", reason, errors };
}

function notApplicable(reason) {
  return { verdict: "PASS", reason, state: "not_applicable", checked: 0 };
}

function contractGate(root) {
  const stored = [
    ...readJsonDirectory(root, "tests/fixtures/automation/contracts"),
    ...readJsonDirectory(root, ".safrs/contracts"),
  ];
  if (stored.length === 0) {
    return notApplicable("no stored task contracts in this change set");
  }
  const context = loadCompileContext(root);
  const errors = [];
  for (const entry of stored) {
    const { contract_digest, ...withoutDigest } = entry.data;
    try {
      const recompiled = compileTaskContract(withoutDigest, context);
      if (recompiled.contractDigest !== contract_digest) {
        errors.push(`${entry.name}: contract digest is not reproducible`);
      }
    } catch (error) {
      errors.push(`${entry.name}: ${error.message}`);
    }
  }
  return errors.length > 0
    ? fail("stored contracts failed recompilation", errors)
    : pass(
        "all stored contracts recompile to their recorded digest",
        stored.length,
      );
}

function leaseGate(_root, controlDirectory) {
  const ledger = controlDirectory
    ? join(controlDirectory, "lease-events.ndjson")
    : null;
  if (!ledger || !existsSync(ledger)) {
    return notApplicable("no local lease ledger present");
  }
  const byTask = new Map();
  for (const line of readFileSync(ledger, "utf8").split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    const event = JSON.parse(line);
    const chain = byTask.get(event.task_id) ?? [];
    chain.push(event);
    byTask.set(event.task_id, chain);
  }
  const errors = [];
  for (const [taskId, chain] of byTask) {
    const verdict = verifyEventChain(chain);
    if (!verdict.valid) {
      errors.push(`${taskId}: ${verdict.errors[0]}`);
    }
  }
  return errors.length > 0
    ? fail("lease chains failed verification", errors)
    : pass("every lease chain verifies", byTask.size);
}

function riskGate(root) {
  const stored = [
    ...readJsonDirectory(root, "tests/fixtures/automation/contracts"),
    ...readJsonDirectory(root, ".safrs/contracts"),
  ];
  if (stored.length === 0) {
    return notApplicable("no contracts to classify");
  }
  const errors = [];
  for (const entry of stored) {
    const contract = entry.data;
    if (compareRisk(contract.effective_risk, contract.computed_risk) < 0) {
      errors.push(`${entry.name}: effective risk is below computed risk`);
    }
    if (compareRisk(contract.effective_risk, contract.declared_risk) < 0) {
      errors.push(`${entry.name}: effective risk is below declared risk`);
    }
    if (
      contract.effective_risk !== "R0" &&
      (contract.risk_reasons ?? []).length === 0
    ) {
      errors.push(`${entry.name}: elevated risk without reasons`);
    }
  }
  return errors.length > 0
    ? fail("risk monotonicity violated", errors)
    : pass("risk is monotonic and explained", stored.length);
}

function budgetsGate(_root, controlDirectory) {
  const ledgerPath = controlDirectory
    ? join(controlDirectory, "budget-ledger.json")
    : null;
  if (!ledgerPath || !existsSync(ledgerPath)) {
    return notApplicable("no budget ledger present");
  }
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  const errors = [];
  for (const [taskId, task] of Object.entries(ledger.tasks ?? {})) {
    if (task.stopped) {
      errors.push(`${taskId}: budget breaker is tripped (${task.reason})`);
    }
    for (const [dimension, used] of Object.entries(task.counters ?? {})) {
      const limit = task.limits?.[dimension];
      if (limit !== "unmetered" && typeof limit === "number" && used > limit) {
        errors.push(`${taskId}: ${dimension} exceeded (${used}/${limit})`);
      }
    }
  }
  return errors.length > 0
    ? fail("budget envelope violated", errors)
    : pass("all budgets are within their envelope");
}

function verificationGate() {
  // Deterministic checks live in the SAFRS Governance workflow; this gate
  // exists so publication can require a stable named verdict for them.
  return pass("delegated to the SAFRS Governance workflow");
}

function reviewGate(root) {
  const approvals = readJsonDirectory(root, ".safrs/approvals");
  if (approvals.length === 0) {
    return notApplicable("no approval records in this change set");
  }
  const errors = [];
  for (const entry of approvals) {
    const approval = entry.data;
    const verdict = verifyApproval(approval, {
      task_id: approval.task_id,
      contract_digest: approval.contract_digest,
      head_sha: approval.subject_sha,
      diff_digest: approval.diff_digest,
      author_identity: approval.author_identity,
      authorized_reviewers: [approval.reviewer_identity],
      now: new Date().toISOString(),
      operation_digest: approval.operation_digest,
      target_environment: approval.target_environment,
      idempotency_key: approval.idempotency_key,
    });
    if (!verdict.valid) {
      errors.push(`${entry.name}: ${verdict.reason}`);
    }
  }
  return errors.length > 0
    ? fail("approval records are not self-consistent", errors)
    : pass("approval records are well formed", approvals.length);
}

function evidenceGate(root) {
  const manifests = readJsonDirectory(root, ".safrs/evidence");
  if (manifests.length === 0) {
    return notApplicable("no evidence manifests in this change set");
  }
  const errors = [];
  for (const entry of manifests) {
    const verdict = verifyManifest(entry.data);
    if (!verdict.valid) {
      errors.push(`${entry.name}: ${verdict.errors[0]}`);
    }
  }
  return errors.length > 0
    ? fail("evidence manifests failed verification", errors)
    : pass("evidence manifests verify and are redacted", manifests.length);
}

function platformGate(root, now) {
  const attestationPath = join(root, ".safrs/platform-attestation.json");
  if (!existsSync(attestationPath)) {
    return notApplicable(
      "no platform attestation yet (produced by the platform audit phase)",
    );
  }
  const attestation = JSON.parse(readFileSync(attestationPath, "utf8"));
  const errors = [];
  if (Date.parse(now) > Date.parse(attestation.expires_at)) {
    errors.push("platform attestation expired");
  }
  if (attestation.force_push_blocked !== true) {
    errors.push("force push is not blocked");
  }
  if (attestation.code_owner_review !== true) {
    errors.push("code-owner review is not required");
  }
  if ((attestation.bypass_actors ?? []).length > 0) {
    errors.push(
      `bypass actors present: ${attestation.bypass_actors.join(", ")}`,
    );
  }
  return errors.length > 0
    ? fail("platform state drifted from desired controls", errors)
    : pass("platform attestation is fresh and matches desired controls");
}

export function runGate(gateId, options) {
  const { root, controlDirectory, now = new Date().toISOString() } = options;
  switch (gateId) {
    case "safrs.contract":
      return contractGate(root);
    case "safrs.lease":
      return leaseGate(root, controlDirectory);
    case "safrs.risk":
      return riskGate(root);
    case "safrs.budgets":
      return budgetsGate(root, controlDirectory);
    case "safrs.verification":
      return verificationGate();
    case "safrs.review":
      return reviewGate(root);
    case "safrs.evidence":
      return evidenceGate(root);
    case "safrs.platform":
      return platformGate(root, now);
    default:
      return fail(`unknown gate: ${gateId}`);
  }
}
