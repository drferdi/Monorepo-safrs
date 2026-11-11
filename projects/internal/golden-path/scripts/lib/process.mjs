import { spawn } from "node:child_process";

export const packageManagerCommand =
  process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const sensitiveEnvironmentName =
  /(?:TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|AUTH)/iu;

function containsCredentialedUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.username || parsed.password);
  } catch {
    return false;
  }
}

export function createAllowlistedEnvironment(
  canonicalEnvironment,
  inheritedEnvironment = process.env,
) {
  const inherited = Object.fromEntries(
    Object.entries(inheritedEnvironment).filter(
      ([name, value]) =>
        typeof value === "string" &&
        !sensitiveEnvironmentName.test(name) &&
        !containsCredentialedUrl(value),
    ),
  );
  return { ...inherited, ...canonicalEnvironment };
}

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
    detached: options.detached ?? process.platform !== "win32",
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

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    child.once("exit", onExit);
  });
}

function terminatePosixProcessGroup(child, signal) {
  if (!child.pid) {
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }
}

export async function stopManagedProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    await runCommand("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    terminatePosixProcessGroup(child, "SIGTERM");
  }
  if (await waitForExit(child, 1000)) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    await runCommand("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    terminatePosixProcessGroup(child, "SIGKILL");
  }
  if (!(await waitForExit(child, 1000))) {
    throw new Error("Process tree did not stop in time.");
  }
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
