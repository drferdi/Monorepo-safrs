import { spawn } from "node:child_process";
import { once } from "node:events";

export const packageManagerCommand =
  process.platform === "win32" ? "pnpm.cmd" : "pnpm";

export function startManagedProcess(command, argumentsList = [], options = {}) {
  const windowsBatch =
    process.platform === "win32" && /\.(?:cmd|bat)$/iu.test(command);
  const executable = windowsBatch
    ? (process.env.ComSpec ?? "cmd.exe")
    : command;
  const argumentsForExecutable = windowsBatch
    ? ["/d", "/s", "/c", command, ...argumentsList]
    : argumentsList;
  return spawn(executable, argumentsForExecutable, {
    ...options,
    shell: false,
    windowsHide: true,
  });
}

export async function runCommand(command, argumentsList = [], options = {}) {
  return new Promise((resolve) => {
    const child = startManagedProcess(command, argumentsList, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      resolve({ exitCode: 1, stdout, stderr: error.message });
    });
    child.once("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}

export async function stopManagedProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = once(child, "exit");
  if (process.platform === "win32" && child.pid) {
    await runCommand("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    child.kill("SIGTERM");
  }
  await exited;
}

export function installSignalCleanup(cleanup, processObject = process) {
  let handled = false;
  const handler = async (signal) => {
    if (handled) {
      return;
    }
    handled = true;
    await cleanup();
    processObject.exitCode = signal === "SIGINT" ? 130 : 143;
  };

  processObject.on("SIGINT", handler);
  processObject.on("SIGTERM", handler);

  return () => {
    processObject.off("SIGINT", handler);
    processObject.off("SIGTERM", handler);
  };
}
