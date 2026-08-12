/** Cursor hooks → guard events. Shell + read variants share one translator. */

export function translate(payload) {
  if (typeof payload?.command === "string") {
    return [{ type: "command", command: payload.command }];
  }
  const target = payload?.file_path ?? payload?.path ?? null;
  if (typeof target === "string" && target) {
    return [{ type: "read", paths: [target.replaceAll("\\", "/")] }];
  }
  return [];
}

/** Cursor protocol: JSON {permission, user_message, agent_message}. */
export function render(result) {
  if (result.decision === "deny" || result.decision === "stop") {
    return {
      permission: "deny",
      user_message: `Blocked by SAFRS guard (${result.reasonCode}).`,
      agent_message: result.message,
    };
  }
  if (result.decision === "ask") {
    return {
      permission: "ask",
      user_message: `Confirmation required (${result.reasonCode}).`,
      agent_message: result.message,
    };
  }
  return { permission: "allow", user_message: "", agent_message: "" };
}
