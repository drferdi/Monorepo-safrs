import { spawn } from "node:child_process";

export function runProcess(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    // Windows resolves package-manager shims (pnpm.cmd) only through the shell.
    const useShell = process.platform === "win32";
    const child = spawn(command, args, { stdio: "inherit", env, shell: useShell });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}
