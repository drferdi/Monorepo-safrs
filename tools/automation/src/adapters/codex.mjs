import path from "node:path";

/** Codex PreToolUse payload → guard events. Thin translator, zero policy. */

function patchPaths(command) {
  return [
    ...command.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gmu),
  ].map((match) => match[1].trim().replaceAll("\\", "/"));
}

export function repositoryRelative(candidate, root) {
  const relative = path.relative(root, path.resolve(root, candidate));
  return relative.split(path.sep).join("/");
}

export function translate(payload, root) {
  const toolName = String(payload?.tool_name ?? "");
  const command = String(payload?.tool_input?.command ?? "");
  if (toolName === "Bash") {
    return [{ type: "command", command }];
  }
  if (toolName === "apply_patch") {
    return [
      {
        type: "write",
        paths: patchPaths(command).map((target) =>
          repositoryRelative(target, root),
        ),
      },
    ];
  }
  return [];
}

/** Map a guard result to the Codex hook protocol (exit code + streams). */
export function render(result) {
  if (
    result.decision === "deny" ||
    result.decision === "ask" ||
    result.decision === "stop"
  ) {
    return { exitCode: 2, stderr: `SAFRS guard: ${result.message}` };
  }
  if (result.additionalContext) {
    return {
      exitCode: 0,
      stdout: JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: result.additionalContext,
        },
      }),
    };
  }
  return { exitCode: 0 };
}
