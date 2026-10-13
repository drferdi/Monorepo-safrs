import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBreaker,
  applyConsume,
  budgetSnapshot,
  emptyLedger,
  initTaskBudget,
} from "../src/budgets.mjs";
import { authorize } from "../src/guard.mjs";

const SENSITIVE = {
  patterns: ["packages/**", ".safrs/**"],
  verification_control_patterns: [".safrs/**", "tools/safrs/**"],
};

test("command verdicts: force-push deny, lease allowed, destructive db asks, autonomy deny", () => {
  assert.equal(
    authorize({ type: "command", command: "git push origin main --force" })
      .decision,
    "deny",
  );
  assert.equal(
    authorize({
      type: "command",
      command: "git push origin main --force-with-lease",
    }).decision,
    "allow",
  );
  for (const command of [
    "pnpm exec prisma migrate reset",
    "dropdb production",
    "pnpm db:reset",
  ]) {
    const verdict = authorize({ type: "command", command });
    assert.equal(verdict.decision, "ask", command);
    assert.equal(verdict.reasonCode, "DB_DESTRUCTIVE", command);
  }
  assert.equal(
    authorize({
      type: "command",
      command: 'droid exec --auto high "task"',
    }).decision,
    "deny",
  );
});

test("command verdicts: hard reset and PR merge ask, safe variants allowed", () => {
  for (const [command, reasonCode] of [
    ["git reset --hard HEAD~1", "GIT_RESET_HARD"],
    ["rtk git reset --hard origin/main", "GIT_RESET_HARD"],
    ["gh pr merge 42 --squash", "PR_MERGE"],
    ["rtk gh pr merge --auto", "PR_MERGE"],
    ["git.exe reset --hard HEAD", "GIT_RESET_HARD"],
    ['git -C "D:/DEV/my repo" reset --hard', "GIT_RESET_HARD"],
    ["gh.exe pr merge 42", "PR_MERGE"],
  ]) {
    const verdict = authorize({ type: "command", command });
    assert.equal(verdict.decision, "ask", command);
    assert.equal(verdict.reasonCode, reasonCode, command);
  }
  for (const command of [
    "git reset --soft HEAD~1",
    "git reset HEAD file.txt",
    "gh pr view 42",
    "git.exe -C D:/DEV/monorepo diff --stat",
  ]) {
    assert.equal(
      authorize({ type: "command", command }).decision,
      "allow",
      command,
    );
  }
});

test("command verdicts: merges and main fast-forwards ask, merge plumbing allowed", () => {
  for (const [command, reasonCode] of [
    ["git merge feat/x", "MERGE"],
    ["rtk git merge --no-ff main", "MERGE"],
    ["git pull origin main", "MERGE"],
    ["git fetch -q . feat/x:main", "MAIN_REF_UPDATE"],
    ["git push . feat/x:refs/heads/main", "MAIN_REF_UPDATE"],
    ["git branch -f main feat/x", "MAIN_REF_UPDATE"],
    ["git update-ref refs/heads/main abc123", "MAIN_REF_UPDATE"],
    ["git.exe merge feat/x", "MERGE"],
    ["git -C D:/DEV/monorepo merge feat/x", "MERGE"],
    ["git --no-pager -c core.editor=true pull", "MERGE"],
    ["git.exe fetch . feat/x:main", "MAIN_REF_UPDATE"],
    ["git checkout -B main feat/x", "MAIN_REF_UPDATE"],
    ["git switch -C main feat/x", "MAIN_REF_UPDATE"],
  ]) {
    const verdict = authorize({ type: "command", command });
    assert.equal(verdict.decision, "ask", command);
    assert.equal(verdict.reasonCode, reasonCode, command);
  }
  for (const command of [
    "git merge --abort",
    "git merge --continue",
    "git merge-base main HEAD",
    "git merge-tree --write-tree main feat/x",
    "git fetch -q . feat/x:feat/y",
    "git.exe merge-base main HEAD",
    "git -C D:/DEV/monorepo merge --abort",
    "git -C D:/DEV/monorepo log --merges",
    "git switch main",
  ]) {
    assert.equal(
      authorize({ type: "command", command }).decision,
      "allow",
      command,
    );
  }
});

test("publication authority cannot be self-granted or git hooks bypassed", () => {
  const blocked = [
    "git push --no-verify origin feature",
    "git config core.hooksPath /dev/null",
    "git -c core.hooksPath=/dev/null push origin feature",
  ];
  for (const command of blocked) {
    const verdict = authorize({ type: "command", command });
    assert.equal(verdict.decision, "deny", command);
  }
});

test("credential commands: read/print deny, bare mention asks, templates allowed", () => {
  assert.equal(
    authorize({ type: "command", command: "cat .env" }).decision,
    "deny",
  );
  assert.equal(
    authorize({ type: "command", command: "Get-Content secrets.json" })
      .decision,
    "deny",
  );
  assert.equal(
    authorize({ type: "command", command: "echo done > .env.production" })
      .decision,
    "ask",
  );
  assert.equal(
    authorize({ type: "command", command: "cat .env.example" }).decision,
    "allow",
  );
});

test("write verdicts: credential deny, template allow, escape deny, scope enforcement", () => {
  assert.equal(
    authorize({ type: "write", paths: [".env"] }, { sensitivePaths: SENSITIVE })
      .decision,
    "deny",
  );
  assert.equal(
    authorize(
      { type: "write", paths: [".env.example"] },
      { sensitivePaths: SENSITIVE },
    ).decision,
    "allow",
  );
  assert.equal(
    authorize(
      { type: "write", paths: ["../outside.txt"] },
      { sensitivePaths: SENSITIVE },
    ).decision,
    "deny",
  );
  const contract = { write_scopes: ["docs/"] };
  assert.equal(
    authorize(
      { type: "write", paths: ["docs/note.md"] },
      { sensitivePaths: SENSITIVE, contract },
    ).decision,
    "allow",
  );
  assert.equal(
    authorize(
      { type: "write", paths: ["src/index.ts"] },
      { sensitivePaths: SENSITIVE, contract },
    ).reasonCode,
    "OUT_OF_SCOPE",
  );
});

test("Codex cannot modify its own enforcement boundary", () => {
  const protectedPaths = [
    ".codex/config.toml",
    ".codex/hooks.json",
    ".codex/hooks/guard-tool-use.mjs",
    ".husky/pre-push",
    "tools/automation/src/guard.mjs",
    "tools/automation/src/adapters/codex.mjs",
  ];
  for (const target of protectedPaths) {
    const verdict = authorize(
      { type: "write", paths: [target] },
      { sensitivePaths: SENSITIVE },
    );
    assert.equal(verdict.decision, "deny", target);
    assert.equal(verdict.reasonCode, "SELF_GUARD_MODIFICATION", target);
  }
});

test("verification/sensitive writes stay allowed but carry R2 context", () => {
  const verification = authorize(
    { type: "write", paths: [".safrs/policy.json"] },
    { sensitivePaths: SENSITIVE },
  );
  assert.equal(verification.decision, "allow");
  assert.equal(verification.reasonCode, "VERIFICATION_R2");
  assert.match(verification.additionalContext, /Verification controls/u);

  const sensitive = authorize(
    { type: "write", paths: ["packages/api/src/app.ts"] },
    { sensitivePaths: SENSITIVE },
  );
  assert.equal(sensitive.reasonCode, "SENSITIVE_R2");
});

test("budget ledger: exhaustion trips the breaker and children cannot reset it", () => {
  let ledger = initTaskBudget(emptyLedger(), "TASK-20260813-B", {
    tool_calls: 2,
    spend: "unmetered",
  });
  let outcome = applyConsume(ledger, "TASK-20260813-B", "tool_calls");
  assert.equal(outcome.allowed, true);
  assert.equal(outcome.remaining, 1);
  ledger = outcome.ledger;
  ledger = applyConsume(ledger, "TASK-20260813-B", "tool_calls").ledger;
  outcome = applyConsume(ledger, "TASK-20260813-B", "tool_calls");
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.stopped, true);
  ledger = outcome.ledger;

  // Child agents share the task-wide ledger: still stopped.
  const child = applyConsume(ledger, "TASK-20260813-B", "tool_calls");
  assert.equal(child.stopped, true);

  const snapshot = budgetSnapshot(ledger, "TASK-20260813-B");
  assert.equal(snapshot.stopped, true);
  assert.equal(snapshot.remaining.spend, "unmetered");

  assert.equal(
    applyConsume(ledger, "TASK-20260813-B", "network_requests").reason,
    "budget tool_calls exhausted (3/2)",
  );
});

test("unknown dimensions and uninitialized tasks fail closed; breaker stops the guard", () => {
  const ledger = initTaskBudget(emptyLedger(), "TASK-20260813-C", {
    tool_calls: 5,
  });
  assert.equal(
    applyConsume(ledger, "TASK-20260813-C", "unknown_dim").allowed,
    false,
  );
  assert.equal(
    applyConsume(ledger, "TASK-20260813-X", "tool_calls").allowed,
    false,
  );

  const tripped = applyBreaker(ledger, "TASK-20260813-C", "secret detected");
  const verdict = authorize(
    { type: "command", command: "echo hello" },
    { budget: budgetSnapshot(tripped, "TASK-20260813-C") },
  );
  assert.equal(verdict.decision, "stop");
  assert.equal(verdict.reasonCode, "BUDGET_BREAKER");
});
