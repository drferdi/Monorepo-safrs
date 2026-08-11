#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  findOverlapConflicts,
  MUTATION_ACTIVE,
  nowIso,
  publicTask,
  redactPath,
  redactText,
  validateRegistry,
} from "../../task/src/ownership.mjs";
import {
  readSharedRegistry,
  resolveControlPlanePaths,
} from "../../task/src/storage.mjs";

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const controlPlanePaths = resolveControlPlanePaths(repositoryRoot);
const registryPath = controlPlanePaths.registryPath;
const inventoryPath = join(repositoryRoot, ".safrs", "tool-inventory.json");

function git(argumentsList) {
  const result = spawnSync("git", argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function loadRegistrySafe() {
  try {
    const data = readSharedRegistry(controlPlanePaths);
    validateRegistry(data, { repositoryRoot });
    return { ok: true, error: null, registry: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      registry: null,
    };
  }
}

function gitSummary() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = git(["rev-parse", "HEAD"]);
  const changedCommands = [
    ["diff", "--name-only", "HEAD"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  const changedResults = changedCommands.map((argumentsList) =>
    git(argumentsList),
  );
  if (!branch.ok || !head.ok || changedResults.some((result) => !result.ok)) {
    return {
      branch: "unknown",
      head: "unknown",
      dirty: true,
      dirty_count: null,
      sample_paths: [],
      available: false,
    };
  }
  const paths = new Set();
  for (const result of changedResults) {
    for (const path of result.stdout.split(/\r?\n/u).filter(Boolean)) {
      paths.add(path.replaceAll("\\", "/"));
    }
  }
  const sortedPaths = [...paths].sort();
  const sample = sortedPaths.slice(0, 12).map((path) => redactPath(path));
  return {
    branch: branch.stdout.trim(),
    head: head.stdout.trim(),
    dirty: sortedPaths.length > 0,
    dirty_count: sortedPaths.length,
    sample_paths: sample,
    available: true,
  };
}

function runGovernanceLive() {
  const isWindows = process.platform === "win32";
  const command = isWindows ? "powershell" : "bash";
  const args = isWindows
    ? ["-ExecutionPolicy", "Bypass", "-File", "scripts/safrs-verify.ps1"]
    : ["scripts/safrs-verify.sh"];
  const before = existsSync(registryPath)
    ? statSync(registryPath).mtimeMs
    : null;
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 60_000,
  });
  const after = existsSync(registryPath)
    ? statSync(registryPath).mtimeMs
    : null;
  if (before != null && after != null && before !== after) {
    // Status must remain read-only relative to the registry.
    return {
      governance: "unknown",
      failed_checks: ["status-detected-registry-mtime-change"],
      detail: "governance probe unexpectedly modified the registry",
    };
  }
  if (result.error) {
    return {
      governance: "unknown",
      failed_checks: [],
      detail: result.error.message,
    };
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const failed = [];
  for (const match of output.matchAll(
    /SAFRS check failed:\s+(tools\/safrs\/[\w./-]+\.py|tests\/[\w./-]+\.py)/gu,
  )) {
    if (!failed.includes(match[1])) {
      failed.push(match[1]);
    }
  }
  if (
    /SAFRS task ownership failed:/u.test(output) &&
    !failed.includes("tools/safrs/check_task_ownership.py")
  ) {
    failed.push("tools/safrs/check_task_ownership.py");
  }
  if (
    /SAFRS_VERIFICATION_INTEGRITY_REVIEW=required/u.test(output) &&
    !failed.includes("tools/safrs/check_sensitive_changes.py")
  ) {
    failed.push("tools/safrs/check_sensitive_changes.py");
  }
  if (result.status === 0) {
    return { governance: "PASS", failed_checks: [], detail: "" };
  }
  if (failed.length === 0) {
    failed.push("safrs-verify");
  }
  return {
    governance: "FAIL",
    failed_checks: failed,
    detail: redactText(output).slice(0, 500),
  };
}

function unknownToolWarnings(registry) {
  const warnings = [];
  if (!existsSync(inventoryPath) || !registry) {
    return warnings;
  }
  let inventoryIds = new Set();
  try {
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
    inventoryIds = new Set((inventory.tools ?? []).map((tool) => tool.id));
  } catch {
    return warnings;
  }
  for (const task of registry.tasks) {
    for (const toolId of task.allowed_tools ?? []) {
      if (!inventoryIds.has(toolId)) {
        warnings.push(
          `task ${task.id}: allowed_tools id not in tool-inventory: ${toolId}`,
        );
      }
    }
  }
  return warnings;
}

function nextAction({ status, ownership, verification, registryError }) {
  if (registryError) {
    return "Fix the shared task registry (schema/path/overlap), then re-run pnpm status.";
  }
  if (!ownership.ok) {
    return "Resolve mutation-active ownership overlap with pnpm task state/close, then re-run pnpm governance.";
  }
  if (verification.governance === "FAIL") {
    const check = verification.failed_checks[0] ?? "governance";
    return `Investigate failing governance check (${check}), then re-run pnpm governance.`;
  }
  if (verification.governance === "unknown") {
    return "Re-run pnpm governance when Python/verify tooling is available; treat current verification as unknown.";
  }
  if (status === "WARN") {
    return "Review status warnings (unknown allowed_tools), then continue the highest-risk active task.";
  }
  const active = (ownership.active_tasks ?? [])[0];
  if (active) {
    return `Continue task ${active.id} (${active.state}, ${active.risk}) within its declared scope_prefixes.`;
  }
  return "No active mutation tasks. Claim work with pnpm task claim before editing shared scopes.";
}

function humanNextAction(report) {
  if (report.registry_error) {
    return "Perbaiki registry task bersama, lalu jalankan kembali pnpm status.";
  }
  if (!report.ownership.ok) {
    return "Selesaikan konflik kepemilikan dengan pnpm task state atau close, lalu jalankan pnpm governance.";
  }
  if (report.verification.governance === "FAIL") {
    const check = report.verification.failed_checks[0] ?? "governance";
    return `Periksa gate governance yang gagal (${check}), lalu jalankan kembali pnpm governance.`;
  }
  if (report.verification.governance === "unknown") {
    return "Jalankan kembali pnpm governance saat Python dan tooling verifikasi tersedia; status saat ini belum diketahui.";
  }
  if (report.status === "WARN") {
    return "Periksa peringatan status, lalu lanjutkan task aktif dengan risiko tertinggi.";
  }
  const active = report.tasks.find((task) => MUTATION_ACTIVE.has(task.state));
  if (active) {
    return `Lanjutkan ${active.id} (${active.state}, ${active.risk}) hanya dalam scope yang telah diklaim.`;
  }
  return "Belum ada pekerjaan mutasi aktif. Buat claim dengan pnpm task claim sebelum mengedit file.";
}

function buildReport() {
  const observed_at = nowIso();
  const git = gitSummary();
  const loaded = loadRegistrySafe();
  const verification = runGovernanceLive();
  const warnings = [];

  let ownership = {
    ok: false,
    conflicts: [],
    active_tasks: [],
  };
  let tasks = [];
  const registryError = loaded.error;

  if (loaded.ok) {
    tasks = loaded.registry.tasks.map(publicTask);
    const conflicts = findOverlapConflicts(loaded.registry.tasks);
    ownership = {
      ok: conflicts.length === 0,
      conflicts,
      active_tasks: loaded.registry.tasks
        .filter((task) => MUTATION_ACTIVE.has(task.state))
        .map(publicTask),
    };
    warnings.push(...unknownToolWarnings(loaded.registry));
  }

  let status = "PASS";
  if (!loaded.ok || !ownership.ok || verification.governance === "FAIL") {
    status = "FAIL";
  } else if (warnings.length > 0 || verification.governance === "unknown") {
    status = "WARN";
  }

  const report = {
    status,
    observed_at,
    git,
    tasks,
    ownership: {
      ok: ownership.ok,
      conflicts: ownership.conflicts,
    },
    verification: {
      governance: verification.governance,
      failed_checks: verification.failed_checks,
    },
    platform: { state: "not_in_scope" },
    next_action: nextAction({
      status,
      ownership,
      verification,
      registryError,
    }),
    warnings,
  };
  if (registryError) {
    report.registry_error = redactText(registryError);
  }
  return report;
}

function renderHuman(report) {
  const lines = [];
  lines.push(`SAFRS STATUS: ${report.status}`);
  lines.push("");
  lines.push("Kerja aktif:");
  const active = report.tasks.filter((task) => MUTATION_ACTIVE.has(task.state));
  if (active.length === 0) {
    lines.push("- (tidak ada)");
  } else {
    for (const task of active) {
      lines.push(
        `- ${task.id} | ${task.owner_label} | ${task.state} | ${task.risk} | ${task.scope_prefixes.join(", ")}`,
      );
    }
  }
  lines.push("");
  lines.push("Repositori:");
  lines.push(
    `- branch ${report.git.branch} | HEAD ${report.git.head.slice(0, 12)} | dirty: ${report.git.dirty_count ?? "unknown"} paths | konflik ownership: ${report.ownership.ok ? "tidak" : "ya"}`,
  );
  if (report.registry_error) {
    lines.push(`- registry: GAGAL — ${report.registry_error}`);
  }
  lines.push("");
  lines.push("Verifikasi:");
  lines.push(`- observed_at ${report.observed_at}`);
  lines.push(`- governance: ${report.verification.governance} (live)`);
  if (report.verification.failed_checks.length > 0) {
    lines.push(
      `- failed_checks: ${report.verification.failed_checks.join(", ")}`,
    );
  }
  lines.push("");
  lines.push("Platform:");
  lines.push("- not_in_scope");
  lines.push("");
  if (report.warnings.length > 0) {
    lines.push("Peringatan:");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }
  lines.push("Langkah berikutnya:");
  lines.push(`- ${humanNextAction(report)}`);
  return redactText(lines.join("\n"));
}

function main(argv) {
  const json = argv.includes("--json");
  const report = buildReport();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderHuman(report));
  }
  return report.status === "FAIL" ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
