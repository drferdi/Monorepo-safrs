import os from "node:os";
import path from "node:path";

/** Claude Code PreToolUse payload → guard events. */

function repositoryRelative(target, root) {
  const absolute = path.resolve(root, target);
  const relative = path.relative(root, absolute);
  return relative.split(path.sep).join("/");
}

/**
 * Plan mode writes its plan to `<Claude config dir>/plans/<name>.md`, which is
 * outside every repository, so the outside-repository deny broke plan mode.
 * Only a direct `.md` child of that folder is exempt; anything nested or of
 * another type still reaches the guard.
 */
function isPlanFile(target, root) {
  const plans = path.join(
    process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"),
    "plans",
  );
  const relative = path.relative(plans, path.resolve(root, target));
  return (
    path.dirname(relative) === "." &&
    path.extname(relative).toLowerCase() === ".md"
  );
}

export function translate(payload, root) {
  const toolName = String(payload?.tool_name ?? "");
  const input = payload?.tool_input ?? {};
  if (toolName === "Bash" || toolName === "PowerShell") {
    return [{ type: "command", command: String(input.command ?? "") }];
  }
  const target = input.file_path ?? input.notebook_path ?? input.path ?? null;
  if (!target) {
    return [];
  }
  const relative = repositoryRelative(String(target), root);
  if (toolName === "Read") {
    return [{ type: "read", paths: [relative] }];
  }
  if (["Edit", "Write", "NotebookEdit"].includes(toolName)) {
    if (isPlanFile(String(target), root)) {
      return [];
    }
    return [{ type: "write", paths: [relative] }];
  }
  return [];
}

/**
 * Claude hook protocol: exit 2 blocks with stderr; exit 0 allows. An "ask"
 * verdict becomes Claude Code's permission prompt, so the human confirms the
 * call (verified 2026-10-12: honored in default and bypassPermissions modes).
 */
export function render(result) {
  if (result.decision === "ask") {
    return {
      exitCode: 0,
      stdout: JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: `SAFRS guard: ${result.message}`,
        },
      }),
    };
  }
  if (["deny", "stop"].includes(result.decision)) {
    return { exitCode: 2, stderr: `SAFRS guard: ${result.message}` };
  }
  if (result.additionalContext) {
    return { exitCode: 0, stderr: `SAFRS notice: ${result.additionalContext}` };
  }
  return { exitCode: 0 };
}
