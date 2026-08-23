import { spawn } from "node:child_process";
import path from "node:path";

const inheritedAllowlist = new Set([
  "COMSPEC",
  "LANG",
  "LC_ALL",
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "WINDIR",
]);
const outputLimit = 4096;

function boundedAppend(current, chunk) {
  if (current.length >= outputLimit) return current;
  return `${current}${chunk}`.slice(0, outputLimit);
}

function environmentValue(environment, expectedName) {
  const entry = Object.entries(environment).find(
    ([name, value]) =>
      name.toUpperCase() === expectedName && typeof value === "string",
  );
  return entry?.[1];
}

function isWithin(candidate, boundary) {
  const relative = path.relative(boundary, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function sanitizedPath(inherited, forbiddenRoots) {
  const raw = environmentValue(inherited, "PATH") ?? "";
  const roots = forbiddenRoots.map((root) => path.resolve(root));
  const entries = [path.dirname(process.execPath), ...raw.split(path.delimiter)]
    .filter(Boolean)
    .filter((entry) => path.isAbsolute(entry))
    .map((entry) => path.normalize(entry))
    .filter(
      (entry) => !/(?:^|[\\/])(?:node_modules|\.pnpm)(?:[\\/]|$)/iu.test(entry),
    )
    .filter(
      (entry) => !roots.some((root) => isWithin(path.resolve(entry), root)),
    );
  const seen = new Set();
  return entries
    .filter((entry) => {
      const identity =
        process.platform === "win32" ? entry.toLowerCase() : entry;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .join(path.delimiter);
}

export function createSanitizedEnvironment(
  owned = {},
  inherited = process.env,
  isolatedHome,
  { forbiddenRoots = [] } = {},
) {
  const environment = {};
  for (const name of inheritedAllowlist) {
    if (name === "PATH") continue;
    const value = environmentValue(inherited, name);
    if (value !== undefined) environment[name] = value;
  }
  environment.PATH = sanitizedPath(inherited, forbiddenRoots);
  if (isolatedHome) {
    environment.HOME = isolatedHome;
    environment.USERPROFILE = isolatedHome;
    environment.XDG_CACHE_HOME = `${isolatedHome}/.cache`;
    environment.XDG_CONFIG_HOME = `${isolatedHome}/.config`;
    environment.TEMP = `${isolatedHome}/tmp`;
    environment.TMP = `${isolatedHome}/tmp`;
    environment.TMPDIR = `${isolatedHome}/tmp`;
  }
  environment.CI = "1";
  environment.NO_COLOR = "1";
  for (const [name, value] of Object.entries(owned)) {
    if (typeof value !== "string")
      throw new TypeError(`Owned environment ${name} must be a string.`);
    environment[name] = value;
  }
  return environment;
}

function assertDirectProgram(program) {
  if (/\.(?:bat|cmd)$/iu.test(program)) {
    throw new Error(
      `Batch programs are not supported without a shell: ${program}`,
    );
  }
}

export function startManagedProcess(program, args, options) {
  assertDirectProgram(program);
  return spawn(program, args, {
    cwd: options.cwd,
    env: options.env,
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    child.once("exit", onExit);
  });
}

function killPosixGroup(child, signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function taskkill(pid, environment) {
  await new Promise((resolve) => {
    const child = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      env: environment,
      shell: false,
      stdio: "ignore",
      windowsHide: true,
    });
    const timer = setTimeout(() => {
      child.kill();
      resolve();
    }, 3000);
    child.once("error", () => {
      clearTimeout(timer);
      resolve();
    });
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function stopManagedProcess(child, environment) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    if (child.pid) await taskkill(child.pid, environment);
  } else {
    killPosixGroup(child, "SIGTERM");
  }
  if (await waitForExit(child, 1500)) return;
  if (process.platform === "win32") {
    if (child.pid) await taskkill(child.pid, environment);
  } else {
    killPosixGroup(child, "SIGKILL");
  }
  if (!(await waitForExit(child, 1500))) {
    throw new Error("Process tree did not stop within the cleanup timeout.");
  }
}

export async function runCommand(program, args, options) {
  const child = startManagedProcess(program, args, options);
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout = boundedAppend(stdout, chunk.toString("utf8"));
  });
  child.stderr.on("data", (chunk) => {
    stderr = boundedAppend(stderr, chunk.toString("utf8"));
  });

  let timeout;
  const completion = new Promise((resolve) => {
    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.once("error", (error) =>
      settle({ exitCode: null, error, stdout, stderr }),
    );
    child.once("close", (exitCode, signal) =>
      settle({ exitCode, signal, stdout, stderr }),
    );
    timeout = setTimeout(
      () => settle({ timedOut: true, stdout, stderr }),
      options.timeoutMs,
    );
  });
  const result = await completion;
  clearTimeout(timeout);
  if (result.timedOut) {
    await stopManagedProcess(child, options.env);
    return { ...result, exitCode: null, stdout, stderr };
  }
  return { ...result, stdout, stderr };
}

export function boundedOutput(result) {
  const pieces = [];
  if (result.stdout?.trim()) pieces.push(`stdout: ${result.stdout.trim()}`);
  if (result.stderr?.trim()) pieces.push(`stderr: ${result.stderr.trim()}`);
  if (result.error) pieces.push(`spawn: ${result.error.message}`);
  return pieces.join("\n");
}
