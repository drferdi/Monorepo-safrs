#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalize, writeForm } from "./canonical-json.mjs";
import { compileTaskContract, loadCompileContext } from "./contracts.mjs";
import { verifyManifest } from "./evidence.mjs";
import { GATES, runGate } from "./gates.mjs";
import {
  nextEvent,
  parseLedgerComment,
  reconcileLease,
  replayState,
  verifyEventChain,
} from "./leases.mjs";
import { evaluatePublication } from "./publisher.mjs";

/**
 * `saf` entry point. Phase 2: contract compilation. Phase 3: lease chain
 * tooling plus the authority-apply step executed only inside the serialized
 * safrs-task-control workflow.
 */

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

function usage() {
  console.log(
    [
      "Usage:",
      "  node tools/automation/src/cli.mjs contract compile <input.json> [--write <output.json>]",
      "  node tools/automation/src/cli.mjs lease verify <events.ndjson>",
      "  node tools/automation/src/cli.mjs lease replay <events.ndjson>",
      "  node tools/automation/src/cli.mjs lease reconcile <events.ndjson> <local.json>",
      "  node tools/automation/src/cli.mjs lease authority-apply   (workflow only, env-driven)",
      "  node tools/automation/src/cli.mjs gate <gate-id|--all>",
      "  node tools/automation/src/cli.mjs evidence verify <manifest.json>",
      "  node tools/automation/src/cli.mjs publish evaluate <pull-request.json> <evidence.json> [platform.json]",
    ].join("\n"),
  );
  return 2;
}

function controlDirectory() {
  try {
    const raw = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    const common = resolve(repositoryRoot, raw);
    return resolve(common, "safrs-control-plane");
  } catch {
    return null;
  }
}

function gateCommand(argument) {
  const options = {
    root: repositoryRoot,
    controlDirectory: controlDirectory(),
  };
  const ids = argument === "--all" ? GATES : [argument];
  let failed = false;
  const results = [];
  for (const id of ids) {
    const result = runGate(id, options);
    results.push({ check_id: id, ...result });
    if (result.verdict !== "PASS") {
      failed = true;
    }
  }
  console.log(
    JSON.stringify(results.length === 1 ? results[0] : results, null, 2),
  );
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    for (const result of results) {
      appendFileSync(
        summary,
        `- \`${result.check_id}\`: **${result.verdict}** — ${result.reason}\n`,
        "utf8",
      );
    }
  }
  return failed ? 1 : 0;
}

function readChain(path) {
  return readFileSync(resolve(path), "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function contractCompile(inputPath, rest) {
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const context = loadCompileContext(repositoryRoot);
  const { contract, contractDigest } = compileTaskContract(input, context);
  if (rest.length === 0) {
    console.log(JSON.stringify(contract, null, 2));
    return 0;
  }
  if (rest.length !== 2 || rest[0] !== "--write" || !rest[1]) {
    return usage();
  }
  writeFileSync(resolve(rest[1]), writeForm(contract), "utf8");
  console.log(`${contractDigest}  ${rest[1]}`);
  return 0;
}

/* ------------------------ remote ledger (gh api) ------------------------ */

const LEDGER_LABEL = "safrs-lease";

function gh(args, input) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    input,
    env: process.env,
  });
}

function findLedgerIssue(repo, taskId) {
  const title = `SAFRS-LEASE: ${taskId}`;
  const issues = JSON.parse(
    gh([
      "api",
      `repos/${repo}/issues?labels=${LEDGER_LABEL}&state=all&per_page=100`,
    ]),
  );
  return issues.find((issue) => issue.title === title) ?? null;
}

function readLedgerChain(repo, issueNumber) {
  const comments = JSON.parse(
    gh(["api", `repos/${repo}/issues/${issueNumber}/comments?per_page=100`]),
  );
  return comments
    .map((comment) => parseLedgerComment(comment.body))
    .filter(Boolean);
}

function authorityApply() {
  const repo = process.env.GH_REPO;
  const action = process.env.SAFRS_LEASE_ACTION;
  const taskId = process.env.SAFRS_TASK_ID;
  const payload = JSON.parse(process.env.SAFRS_LEASE_PAYLOAD ?? "{}");
  const runUrl = process.env.SAFRS_AUTHORITY_RUN_URL ?? null;
  if (!repo || !action || !taskId) {
    console.error(
      "authority-apply requires GH_REPO, SAFRS_LEASE_ACTION, SAFRS_TASK_ID",
    );
    return 2;
  }
  if (!/^TASK-[0-9]{8}-[A-Z0-9-]+$/u.test(taskId)) {
    console.error(`invalid task id: ${taskId}`);
    return 1;
  }

  let issue = findLedgerIssue(repo, taskId);
  if (!issue && action !== "CLAIM") {
    console.error(
      `DENY: no ledger issue for ${taskId}; only CLAIM may create one`,
    );
    return 1;
  }
  if (!issue) {
    issue = JSON.parse(
      gh([
        "api",
        `repos/${repo}/issues`,
        "-f",
        `title=SAFRS-LEASE: ${taskId}`,
        "-f",
        "body=Append-only SAFRS lease ledger. Every comment is one canonical LeaseEventV1. Do not edit or delete comments.",
        "-f",
        `labels[]=${LEDGER_LABEL}`,
      ]),
    );
  }

  const chain = readLedgerChain(repo, issue.number);
  const request = { action, task_id: taskId, ...payload };
  const outcome = nextEvent(chain, request, {
    occurred_at: new Date().toISOString().replace(/\.\d{3}Z$/u, "Z"),
    authority_run_url: runUrl,
  });

  if (outcome.denied) {
    console.error(`DENY: ${outcome.denied}`);
    return 1;
  }
  gh([
    "api",
    `repos/${repo}/issues/${issue.number}/comments`,
    "-f",
    `body=${canonicalize(outcome.event)}`,
  ]);
  console.log(
    `GRANT ${action} ${taskId} sequence=${outcome.event.sequence} fencing_token=${outcome.event.fencing_token}`,
  );
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(
      summary,
      `GRANT \`${action}\` for \`${taskId}\`: sequence ${outcome.event.sequence}, fencing token ${outcome.event.fencing_token}\n`,
      "utf8",
    );
  }
  return 0;
}

/* --------------------------------- main --------------------------------- */

function main(argv) {
  const [domain, action, ...rest] = argv;
  if (domain === "contract" && action === "compile" && rest[0]) {
    return contractCompile(rest[0], rest.slice(1));
  }
  if (domain === "lease") {
    if (action === "authority-apply" && rest.length === 0) {
      return authorityApply();
    }
    if (action === "verify" && rest.length === 1) {
      const verdict = verifyEventChain(readChain(rest[0]));
      console.log(JSON.stringify(verdict, null, 2));
      return verdict.valid ? 0 : 1;
    }
    if (action === "replay" && rest.length === 1) {
      console.log(JSON.stringify(replayState(readChain(rest[0])), null, 2));
      return 0;
    }
    if (action === "reconcile" && rest.length === 2) {
      const local = JSON.parse(readFileSync(resolve(rest[1]), "utf8"));
      const verdict = reconcileLease(
        local,
        readChain(rest[0]),
        new Date().toISOString(),
      );
      console.log(JSON.stringify(verdict, null, 2));
      return verdict.decision === "allow" ? 0 : 1;
    }
  }
  if (domain === "gate" && action && rest.length === 0) {
    return gateCommand(action);
  }
  if (domain === "evidence" && action === "verify" && rest.length === 1) {
    const manifest = JSON.parse(readFileSync(resolve(rest[0]), "utf8"));
    const verdict = verifyManifest(manifest);
    console.log(JSON.stringify(verdict, null, 2));
    return verdict.valid ? 0 : 1;
  }
  if (domain === "publish" && action === "evaluate" && rest.length >= 2) {
    const pullRequest = JSON.parse(readFileSync(resolve(rest[0]), "utf8"));
    const evidence = JSON.parse(readFileSync(resolve(rest[1]), "utf8"));
    const platform = rest[2]
      ? JSON.parse(readFileSync(resolve(rest[2]), "utf8"))
      : null;
    const verdict = evaluatePublication(pullRequest, evidence, {
      platform,
      now: new Date().toISOString(),
      approvals: pullRequest.approvals ?? [],
      authorizedReviewers: pullRequest.authorized_reviewers ?? [],
    });
    console.log(JSON.stringify(verdict, null, 2));
    return verdict.eligible ? 0 : 1;
  }
  return usage();
}

process.exitCode = main(process.argv.slice(2));
