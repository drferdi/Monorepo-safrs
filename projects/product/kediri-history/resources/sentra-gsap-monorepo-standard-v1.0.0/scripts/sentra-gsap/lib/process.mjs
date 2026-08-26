import { spawnSync } from 'node:child_process';

export function runCommand(command, cwd) {
  const started = Date.now();
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return {
    command,
    code: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    durationMs: Date.now() - started,
  };
}
