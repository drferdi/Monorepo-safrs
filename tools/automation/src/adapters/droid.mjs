/**
 * Droid adapter — read_only_disabled pending Activation Decision 4.
 * Droid exposes no enforceable pre-action hook, so every mutating event is
 * denied outright; translation exists only so parity tests can prove the
 * fail-closed stance.
 */

export function translate(payload) {
  const tool = String(payload?.tool ?? "");
  if (tool === "read") {
    return [{ type: "read", paths: [String(payload?.path ?? "")] }];
  }
  return [
    {
      type: "command",
      command: String(payload?.command ?? "__droid_disabled__"),
    },
  ];
}

export function authorizeOverride(event) {
  if (event.type !== "read") {
    return {
      decision: "deny",
      reasonCode: "ADAPTER_DISABLED",
      message:
        "droid adapter is read_only_disabled pending Activation Decision 4; no mutation is enforceable.",
    };
  }
  return null;
}

export function render(result) {
  return ["deny", "ask", "stop"].includes(result.decision)
    ? { exitCode: 2, stderr: `SAFRS guard: ${result.message}` }
    : { exitCode: 0 };
}
