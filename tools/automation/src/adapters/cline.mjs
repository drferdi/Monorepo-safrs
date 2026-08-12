/** Cline hook payload → guard events (Node bridge invoked by the sh hook). */

export function translate(payload) {
  const tool = String(payload?.tool ?? payload?.tool_name ?? "");
  const params = payload?.params ?? payload?.tool_input ?? {};
  if (tool === "execute_command" || tool === "Bash") {
    return [{ type: "command", command: String(params.command ?? "") }];
  }
  if (tool === "write_to_file" || tool === "apply_diff") {
    const target = params.path ?? params.file_path;
    return target
      ? [{ type: "write", paths: [String(target).replaceAll("\\", "/")] }]
      : [];
  }
  if (tool === "read_file") {
    const target = params.path ?? params.file_path;
    return target
      ? [{ type: "read", paths: [String(target).replaceAll("\\", "/")] }]
      : [];
  }
  return [];
}

/** Cline protocol mirrors exit-code blocking. */
export function render(result) {
  if (["deny", "ask", "stop"].includes(result.decision)) {
    return { exitCode: 2, stderr: `SAFRS guard: ${result.message}` };
  }
  return { exitCode: 0 };
}
