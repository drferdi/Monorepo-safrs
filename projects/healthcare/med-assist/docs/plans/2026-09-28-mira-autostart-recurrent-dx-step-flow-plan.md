# MIRA Auto-Start, Recurrent Diagnosis and Step-Flow Diagnosis Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MIRA comes up on its own while Assist is on and is the default engine; diagnoses recorded twice or more in the last year are offered first and become primary on the doctor's tap; the diagnosis page shows one step at a time.

**Architecture:** A Python native-messaging host in the MIRA repository starts the uvicorn service and ties its life to the Chrome browser process; the extension's background asks the host to `ensure` the service, publishes a status key only on change, prefetches the MIRA step from the Trajectory stage and serves it from an in-memory cache. A pure module derives recurrent-diagnosis candidates from the IndexedDB visit store; the diagnosis page reads them through one hook and merges them into the candidate list. The page itself becomes a step flow (safety strip, receipts, active step, ghosts) built from small step components over an extended view model.

**Tech Stack:** WXT (Manifest V3), React 19, TypeScript, Vitest + Testing Library (jsdom), Python 3.12 + pytest (host), PowerShell (install script).

**Spec:** `docs/specs/2026-09-28-mira-autostart-recurrent-dx-step-flow-design.md` (commit 40f3b80c).

## Global Constraints

- Capsule root: `D:\DEV\monorepo\projects\healthcare\med-assist`. MIRA repository: `D:\DEV\gafferverse\mira-system` (new files only under `assist/host/`; never touch `src/**`, never open `src/.env`, no push there).
- R3 paths untouched except the one new file Chief approved: `lib/clinical/recurrent-diagnosis.ts` (+ its test). No edit to `lib/emergency-detector/**`, `lib/iskandar-diagnosis-engine/**`, `public/data/penyakit.json`.
- Protected files untouched: `entrypoints/sidepanel/main.tsx`, `components/clinical/TTVInferenceUI.tsx`, `SentraAssistPanel.tsx`, `ApprovedSentraAssistApp.tsx`. `entrypoints/sidepanel/style.css` is append-only.
- Gates (capsule root): `node scripts/pnpm.mjs run lint`, `run typecheck`, `run test`, `run build`. Single test: `node scripts/pnpm.mjs exec vitest run <path>`. Host tests: `src\.venv\Scripts\python.exe -m pytest assist/host/tests` from the MIRA repository root. Run token-guard for every task that changes a `.tsx` or `.css`, safrs-auditor before every commit.
- Commits: `git add` explicit paths only, local only, no push, no PR. Every changed or removed assertion is named in the commit message. Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- No live model call in any test. No patient data; synthetic values only. Code, comments and docs in English; UI copy in Indonesian as the spec states it.
- One storage write per state change (never per poll): the side panel re-renders on every `storage.onChanged`.
- Diagnosis is never auto-selected; the doctor taps.

## Review Focus

1. Payload built by the workbench (prefetch) and by `ClinicalDifferential` (getSuggestions) must hash equal for the same patient, or the prefetch is never used. Test in Task 6: the two builders produce the same `DiagnosisRequestContext` for the same inputs.
2. A prefetch that finishes after the patient changed must not be shown for the new patient. Test in Task 6: `getSuggestions` with a different hash ignores the done entry.
3. Service worker restarts: a second host instance must not spawn a second uvicorn. Test in Task 1: `ensure` with healthz up never calls spawn.
4. Danger signs with no triage result must still be visible on the new page. Test in Task 12: the strip renders with red flags only.
5. A recurrent candidate whose ICD the engine also proposes must appear once. Test in Task 9: merge yields one card with `history.engineAgrees === true`.

## File Structure

MIRA repository (`assist/host/`):
- `sentra_mira_host.py` — native messaging framing, `Supervisor` (ensure/spawn/shutdown), parent-process watch, `main()`.
- `sentra_mira_host.bat` — launcher Chrome runs (venv Python + script).
- `install_host.ps1`, `uninstall_host.ps1` — host manifest + HKCU registry values.
- `tests/test_host.py`, `tests/__init__.py`.

Capsule:
- `lib/diagnosis-engine/mira-notice.ts` (+test) — error code → Indonesian notice.
- `lib/diagnosis-engine/mira-supervisor.ts` (+test) — `ensureMira`, `publishMiraStatus`, `MiraStatus`.
- `lib/diagnosis-engine/request-context.ts` (+test) — `buildDiagnosisRequestContext`, `hashDiagnosisContext`.
- `lib/diagnosis-engine/mira-prefetch.ts` (+test) — prefetch map, `runMiraPrefetch`, `peekPrefetch`.
- `lib/diagnosis-engine/run-diagnosis.ts` — exports `stepWithTimeout`; reads the prefetch map; reason-specific notice; `engine_pending`.
- `lib/diagnosis-engine/case-state.ts` (+ `case-state.test.ts`) — `knownConditions` from `recurrent_diagnoses`.
- `lib/clinical/recurrent-diagnosis.ts` (+test) — pure candidate derivation.
- `components/clinical/diagnosis/useRecurrentDiagnoses.ts` (+test) — hook over the visit store.
- `components/sidepanel/MiraStatusDot.tsx` (+test) — header dot.
- `components/sidepanel/SidePanelHeader.tsx` — mounts the dot, sends `miraEnsure` once.
- `components/sidepanel/ClinicalReasoningWorkbench.tsx` — sends `prefetchDiagnosis`.
- `components/clinical/ClinicalDifferential.tsx` — recurrent merge, audit on select, re-request on prefetch-ready, renders `DiagnosisStepFlow`.
- `components/clinical/diagnosis/diagnosisViewModel.ts` — `history` on candidates, `steps`.
- `components/clinical/diagnosis/diagnosisSteps.ts` (+test) — `resolveDiagnosisSteps`, `resolveActiveStep`.
- `components/clinical/diagnosis/diagnosisPageProps.ts` — `DiagnosisPageProps` (was `DiagnosisWorkspaceProps`).
- `components/clinical/diagnosis/SafetyStrip.tsx`, `StepReceipt.tsx`, `steps/FindingStep.tsx`, `steps/DiagnosisStep.tsx`, `steps/TherapyStep.tsx`, `steps/RmeStep.tsx`, `DiagnosisStepFlow.tsx` (+tests).
- Deleted: `DiagnosisWorkspace.tsx`, `DiagnosisWorkspace.test.tsx`, `DiagnosisProgressStepper.tsx`, `StagedSection.tsx`, `TherapyReviewPanel.tsx`.
- `utils/messaging.ts`, `entrypoints/background.ts`, `wxt.config.ts`, `types/api.ts`, `.env.example`, `docs/adr/ADR-005…`, `.agents/DECISIONS.md`, `.agents/HANDOFF.md`, `entrypoints/sidepanel/style.css` (append).

---

## Part 1 — MIRA starts with Assist

### Task 1: Native messaging host (Python)

**Files:**
- Create: `D:\DEV\gafferverse\mira-system\assist\host\__init__.py` (empty)
- Create: `D:\DEV\gafferverse\mira-system\assist\host\sentra_mira_host.py`
- Create: `D:\DEV\gafferverse\mira-system\assist\host\tests\__init__.py` (empty)
- Test: `D:\DEV\gafferverse\mira-system\assist\host\tests\test_host.py`

**Interfaces:**
- Produces: stdin/stdout protocol `{"cmd":"ensure"}` → `{"status":"running"|"starting"|"failed","port":8787,"pid"?:int,"reason"?:str}`; `Supervisor(repo_root, healthy, spawn)` with `.ensure()` and `.shutdown()`.

- [ ] **Step 1: Write the failing tests**

```python
# assist/host/tests/test_host.py
import io
import json
import struct

from host import sentra_mira_host as host


class FakeChild:
    def __init__(self, pid=4242):
        self.pid = pid
        self.terminated = False
        self.exited = False

    def poll(self):
        return 0 if self.exited else None

    def terminate(self):
        self.terminated = True
        self.exited = True

    def wait(self, timeout=None):
        return 0


def frame(obj):
    data = json.dumps(obj).encode("utf-8")
    return struct.pack("<I", len(data)) + data


def test_read_and_write_message_round_trip():
    out = io.BytesIO()
    host.write_message(out, {"cmd": "ensure"})
    assert host.read_message(io.BytesIO(out.getvalue())) == {"cmd": "ensure"}
    assert host.read_message(io.BytesIO(b"")) is None


def test_ensure_answers_running_without_spawning_when_healthy():
    spawned = []
    sup = host.Supervisor("C:/repo", healthy=lambda: True, spawn=lambda root: spawned.append(root))
    assert sup.ensure() == {"status": "running", "port": host.PORT}
    assert spawned == []


def test_ensure_spawns_once_and_answers_starting():
    child = FakeChild()
    calls = []

    def spawn(root):
        calls.append(root)
        return child

    sup = host.Supervisor("C:/repo", healthy=lambda: False, spawn=spawn)
    assert sup.ensure() == {"status": "starting", "port": host.PORT, "pid": 4242}
    assert sup.ensure() == {"status": "starting", "port": host.PORT, "pid": 4242}
    assert calls == ["C:/repo"]


def test_ensure_reports_spawn_failure():
    def spawn(root):
        raise OSError("python.exe not found")

    sup = host.Supervisor("C:/repo", healthy=lambda: False, spawn=spawn)
    assert sup.ensure() == {"status": "failed", "reason": "python.exe not found"}


def test_shutdown_terminates_only_an_owned_child():
    child = FakeChild()
    sup = host.Supervisor("C:/repo", healthy=lambda: False, spawn=lambda root: child)
    sup.ensure()
    sup.shutdown()
    assert child.terminated is True
    other = host.Supervisor("C:/repo", healthy=lambda: True, spawn=lambda root: FakeChild())
    other.ensure()
    other.shutdown()  # owns nothing; must not raise


def test_serve_handles_ensure_then_eof_and_waits_for_parent_before_shutdown():
    child = FakeChild()
    sup = host.Supervisor("C:/repo", healthy=lambda: False, spawn=lambda root: child)
    stdin = io.BytesIO(frame({"cmd": "ensure"}) + frame({"cmd": "bogus"}))
    stdout = io.BytesIO()
    waited = []
    host.serve(sup, stdin, stdout, wait_for_parent_exit=lambda: waited.append(True))
    replies = []
    buf = io.BytesIO(stdout.getvalue())
    while (msg := host.read_message(buf)) is not None:
        replies.append(msg)
    assert replies[0]["status"] == "starting"
    assert replies[1] == {"status": "failed", "reason": "unknown command"}
    assert waited == [True]
    assert child.terminated is True


def test_serve_exits_at_eof_without_waiting_when_it_owns_nothing():
    sup = host.Supervisor("C:/repo", healthy=lambda: True, spawn=lambda root: FakeChild())
    waited = []
    host.serve(sup, io.BytesIO(frame({"cmd": "ensure"})), io.BytesIO(), wait_for_parent_exit=lambda: waited.append(True))
    assert waited == []
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (MIRA repository root): `src\.venv\Scripts\python.exe -m pytest assist/host/tests -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'host'` (add `assist` to the path through a `conftest.py`, see step 3).

- [ ] **Step 3: Write the host**

```python
# assist/host/tests/conftest.py
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
```

```python
# assist/host/sentra_mira_host.py
"""Chrome native messaging host that keeps the MIRA reasoning service running while the
browser is open. Registered as ``com.sentra.mira`` by ``install_host.ps1``.

Protocol (length-prefixed JSON on stdin/stdout, Chrome's native messaging format):
    {"cmd": "ensure"} -> {"status": "running"|"starting"|"failed", "port": 8787, ...}

The service is NOT tied to the messaging port: a Manifest V3 service worker may be suspended,
which closes the port. The host that spawned uvicorn keeps running after EOF, waits for its
parent Chrome process to exit, then terminates the service. A host that found the service
already healthy exits at EOF and never touches it.
"""

from __future__ import annotations

import ctypes
import json
import os
import struct
import subprocess
import sys
import urllib.request

PORT = 8787
HEALTH_URL = f"http://127.0.0.1:{PORT}/healthz"
SYNCHRONIZE = 0x00100000
WAIT_OBJECT_0 = 0x00000000
WAIT_FAILED = 0xFFFFFFFF
INFINITE = 0xFFFFFFFF


def read_message(stream):
    raw_len = stream.read(4)
    if len(raw_len) < 4:
        return None
    (length,) = struct.unpack("<I", raw_len)
    return json.loads(stream.read(length).decode("utf-8"))


def write_message(stream, obj) -> None:
    data = json.dumps(obj).encode("utf-8")
    stream.write(struct.pack("<I", len(data)))
    stream.write(data)
    stream.flush()


def is_healthy(url: str = HEALTH_URL, timeout: float = 1.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except Exception:
        return False


def spawn_service(repo_root: str):
    python = os.path.join(repo_root, "src", ".venv", "Scripts", "python.exe")
    env = dict(os.environ, MIRA_SERVICE_ENV="development")
    return subprocess.Popen(
        [python, "-m", "uvicorn", "--factory", "service.app:create_app",
         "--app-dir", "assist", "--host", "127.0.0.1", "--port", str(PORT)],
        cwd=repo_root,
        env=env,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def wait_for_parent_exit(pid: int | None = None) -> None:
    """Block until the parent (Chrome browser) process exits. Windows only.

    HANDLE is pointer-sized: without explicit restype/argtypes ctypes truncates it on 64-bit
    and WaitForSingleObject fails at once, which would kill the service as soon as the
    service worker suspends.
    """
    import time

    pid = os.getppid() if pid is None else pid
    kernel32 = ctypes.windll.kernel32
    kernel32.OpenProcess.restype = ctypes.c_void_p
    kernel32.OpenProcess.argtypes = [ctypes.c_uint, ctypes.c_int, ctypes.c_uint]
    kernel32.WaitForSingleObject.restype = ctypes.c_uint
    kernel32.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint]
    kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
    handle = kernel32.OpenProcess(SYNCHRONIZE, False, pid)
    if not handle:
        return
    try:
        if kernel32.WaitForSingleObject(handle, INFINITE) == WAIT_FAILED:
            # Fall back to polling: the parent is gone when OpenProcess returns NULL.
            while kernel32.OpenProcess(SYNCHRONIZE, False, pid):
                time.sleep(5)
    finally:
        kernel32.CloseHandle(handle)


class Supervisor:
    def __init__(self, repo_root: str, healthy=is_healthy, spawn=spawn_service):
        self.repo_root = repo_root
        self.healthy = healthy
        self.spawn = spawn
        self.child = None

    def owns_child(self) -> bool:
        return self.child is not None and self.child.poll() is None

    def ensure(self) -> dict:
        if self.healthy():
            return {"status": "running", "port": PORT}
        if self.owns_child():
            return {"status": "starting", "port": PORT, "pid": self.child.pid}
        try:
            self.child = self.spawn(self.repo_root)
        except OSError as exc:
            return {"status": "failed", "reason": str(exc)}
        return {"status": "starting", "port": PORT, "pid": self.child.pid}

    def shutdown(self) -> None:
        if self.owns_child():
            self.child.terminate()
            try:
                self.child.wait(timeout=10)
            except Exception:
                pass


def handle(supervisor: Supervisor, message) -> dict:
    if isinstance(message, dict) and message.get("cmd") == "ensure":
        return supervisor.ensure()
    return {"status": "failed", "reason": "unknown command"}


def serve(supervisor: Supervisor, stdin, stdout, wait_for_parent_exit=wait_for_parent_exit) -> None:
    while True:
        message = read_message(stdin)
        if message is None:
            break
        write_message(stdout, handle(supervisor, message))
    if supervisor.owns_child():
        wait_for_parent_exit()
        supervisor.shutdown()


def main() -> None:
    if sys.platform == "win32":
        # Chrome frames are binary; the CRT must not translate 0x0A/0x0D inside a length prefix.
        import msvcrt

        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    serve(Supervisor(repo_root), sys.stdin.buffer, sys.stdout.buffer)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `src\.venv\Scripts\python.exe -m pytest assist/host/tests -q`
Expected: 7 passed. (Binary stdio and the parent wait are Windows runtime behaviour, not unit-tested; they are part of Chief's live check in Task 16.)

- [ ] **Step 5: Commit (MIRA repository, local only)**

```bash
cd /d/DEV/gafferverse/mira-system && git add assist/host/__init__.py assist/host/sentra_mira_host.py assist/host/tests/__init__.py assist/host/tests/conftest.py assist/host/tests/test_host.py && git commit -m "feat(host): native messaging host that keeps the MIRA service alive while Chrome runs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Host launcher and install scripts

**Files:**
- Create: `assist/host/sentra_mira_host.bat`, `assist/host/install_host.ps1`, `assist/host/uninstall_host.ps1`
- Modify: `assist/service/README.md` (new section "Auto-start from Med Assist")

**Interfaces:**
- Produces: host name `com.sentra.mira`; manifest at `assist/host/com.sentra.mira.json` (generated, gitignored); registry values under `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.sentra.mira` and `HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.sentra.mira`.

- [ ] **Step 1: Write the launcher**

```bat
@echo off
rem Launched by Chrome for the native messaging host com.sentra.mira.
set "ROOT=%~dp0..\.."
"%ROOT%\src\.venv\Scripts\python.exe" "%~dp0sentra_mira_host.py"
```

- [ ] **Step 2: Write the install script (with `-DryRun`)**

```powershell
# assist/host/install_host.ps1
# Register the Sentra MIRA native messaging host for the current Windows user.
#   powershell -ExecutionPolicy Bypass -File assist\host\install_host.ps1 -ExtensionId <id>
# The extension id is shown at chrome://extensions (Developer mode). Re-runnable.
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$HostName = "com.sentra.mira"
$HostDir = $PSScriptRoot
$ManifestPath = Join-Path $HostDir "$HostName.json"
$manifest = [ordered]@{
  name            = $HostName
  description     = "Starts the MIRA reasoning service for Sentra Med Assist"
  path            = (Join-Path $HostDir "sentra_mira_host.bat")
  type            = "stdio"
  allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json
$keys = @(
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName",
  "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
)
if ($DryRun) {
  Write-Host "Would write $ManifestPath:`n$manifest"
  $keys | ForEach-Object { Write-Host "Would set (Default) of $_ = $ManifestPath" }
  exit 0
}
Set-Content -Path $ManifestPath -Value $manifest -Encoding UTF8
foreach ($key in $keys) {
  New-Item -Path $key -Force | Out-Null
  Set-ItemProperty -Path $key -Name "(Default)" -Value $ManifestPath
}
Write-Host "Registered $HostName for extension $ExtensionId. Reload the extension."
```

```powershell
# assist/host/uninstall_host.ps1
$ErrorActionPreference = "Stop"
$HostName = "com.sentra.mira"
foreach ($key in @("HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName",
                   "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName")) {
  if (Test-Path $key) { Remove-Item -Path $key -Recurse -Force }
}
Remove-Item -Path (Join-Path $PSScriptRoot "$HostName.json") -ErrorAction SilentlyContinue
Write-Host "Unregistered $HostName."
```

- [ ] **Step 3: Verify the dry run and add the generated manifest to the ignore list**

Run: `powershell -ExecutionPolicy Bypass -File assist/host/install_host.ps1 -ExtensionId abcdefghijklmnopabcdefghijklmnop -DryRun`
Expected: prints the manifest JSON with `"type": "stdio"` and two "Would set" lines, exit 0. Then append `assist/host/com.sentra.mira.json` to `assist/.gitignore` (create the file if absent; never touch the root `.gitignore`).

- [ ] **Step 4: Document in the service README**

Append a section "Auto-start from Med Assist": one paragraph (host purpose, install command, uninstall command, that the service stops when Chrome exits, and that the extension id changes when the unpacked build folder moves).

- [ ] **Step 5: Commit**

```bash
cd /d/DEV/gafferverse/mira-system && git add assist/host/sentra_mira_host.bat assist/host/install_host.ps1 assist/host/uninstall_host.ps1 assist/.gitignore assist/service/README.md && git commit -m "feat(host): launcher and install scripts for the com.sentra.mira native messaging host

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Reason-specific engine notice

**Files:**
- Create: `lib/diagnosis-engine/mira-notice.ts`
- Test: `lib/diagnosis-engine/mira-notice.test.ts`
- Modify: `lib/diagnosis-engine/run-diagnosis.ts` (the `engine_notice` branch; keep `MIRA_UNAVAILABLE_NOTICE` exported)

**Interfaces:**
- Produces: `miraNoticeFor(code: string | undefined): string`; `MiraStatusState` reused by Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// lib/diagnosis-engine/mira-notice.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { miraNoticeFor } from './mira-notice';

describe('miraNoticeFor', () => {
  it.each([
    ['NOT_INSTALLED', 'MIRA belum terpasang'],
    ['STARTING', 'MIRA sedang menyala'],
    ['NETWORK_ERROR', 'MIRA mati'],
    ['NOT_CONFIGURED', 'MIRA mati'],
    ['BUDGET_EXHAUSTED', 'MIRA: batas biaya harian'],
    ['TIMEOUT', 'MIRA: waktu habis'],
    ['MODEL_OUTPUT_INVALID', 'MIRA: hasil tidak valid'],
    ['CONTRACT_MISMATCH', 'MIRA: hasil tidak valid'],
    ['PII_DETECTED', 'MIRA: data pasien ditolak (PII)'],
    ['PII_BLOCKED', 'MIRA: data pasien ditolak (PII)'],
  ])('maps %s', (code, notice) => {
    expect(miraNoticeFor(code)).toBe(notice);
  });

  it('falls back to the generic notice with the code, and without a code', () => {
    expect(miraNoticeFor('HTTP_503')).toBe('MIRA tidak tersedia (HTTP_503)');
    expect(miraNoticeFor(undefined)).toBe('MIRA tidak tersedia');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/mira-notice.test.ts`
Expected: FAIL, cannot resolve `./mira-notice`.

- [ ] **Step 3: Implement**

```ts
// lib/diagnosis-engine/mira-notice.ts
/**
 * Indonesian notice for the side panel when MIRA did not answer, keyed by the engine result's
 * `error.code` (client codes from `mira-engine.ts`, service codes from the reasoning service)
 * or by the supervisor state (`NOT_INSTALLED`, `STARTING`).
 *
 * @module lib/diagnosis-engine/mira-notice
 */

export const MIRA_UNAVAILABLE_NOTICE = 'MIRA tidak tersedia';

const NOTICES: Record<string, string> = {
  NOT_INSTALLED: 'MIRA belum terpasang',
  STARTING: 'MIRA sedang menyala',
  NETWORK_ERROR: 'MIRA mati',
  NOT_CONFIGURED: 'MIRA mati',
  BUDGET_EXHAUSTED: 'MIRA: batas biaya harian',
  STEP_BUDGET_EXCEEDED: 'MIRA: batas biaya harian',
  TIMEOUT: 'MIRA: waktu habis',
  MODEL_OUTPUT_INVALID: 'MIRA: hasil tidak valid',
  CONTRACT_MISMATCH: 'MIRA: hasil tidak valid',
  PII_DETECTED: 'MIRA: data pasien ditolak (PII)',
  PII_BLOCKED: 'MIRA: data pasien ditolak (PII)',
};

export function miraNoticeFor(code: string | undefined): string {
  if (!code) return MIRA_UNAVAILABLE_NOTICE;
  return NOTICES[code] ?? `${MIRA_UNAVAILABLE_NOTICE} (${code})`;
}
```

In `run-diagnosis.ts`: `import { MIRA_UNAVAILABLE_NOTICE, miraNoticeFor } from './mira-notice';`, delete the local `export const MIRA_UNAVAILABLE_NOTICE = …` and add `export { MIRA_UNAVAILABLE_NOTICE };` so existing imports keep working. Replace the last branch:

```ts
        : { ...response.data, engine_notice: miraNoticeFor(result.status === 'ok' ? undefined : result.error?.code) },
```

(An `ok` result with an empty differential keeps the generic notice.)

- [ ] **Step 4: Run the affected tests**

Run: `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/mira-notice.test.ts lib/diagnosis-engine/mira-engine.test.ts lib/diagnosis-engine/safety-independence.test.ts`
Expected: PASS. If a `mira-engine.test.ts` assertion expected the bare `MIRA tidak tersedia` for a specific code (e.g. TIMEOUT), change that expectation to the mapped notice and name it in the commit message.

- [ ] **Step 5: Commit**

```bash
git add lib/diagnosis-engine/mira-notice.ts lib/diagnosis-engine/mira-notice.test.ts lib/diagnosis-engine/run-diagnosis.ts lib/diagnosis-engine/mira-engine.test.ts && git commit -m "feat(med-assist): say why MIRA did not answer instead of a single unavailable notice

<name any changed assertion here>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: MIRA supervisor in the background (`miraEnsure`)

**Files:**
- Create: `lib/diagnosis-engine/mira-supervisor.ts`
- Test: `lib/diagnosis-engine/mira-supervisor.test.ts`
- Modify: `wxt.config.ts` (permissions), `utils/messaging.ts` (`miraEnsure` in `ProtocolMap` and `PROTOCOL_MESSAGE_NAMES`), `entrypoints/background.ts` (handler next to `getSuggestions`)

**Interfaces:**
- Produces:
  ```ts
  export type MiraStatusState = 'not-installed' | 'starting' | 'ready' | 'down' | 'failed';
  export interface MiraStatus { state: MiraStatusState; reason?: string; checkedAt: string }
  export const MIRA_STATUS_STORAGE_KEY = 'sentra:mira-status';
  export const MIRA_HOST_NAME = 'com.sentra.mira';
  export function ensureMira(deps?): Promise<MiraStatus>;
  export function publishMiraStatus(next: MiraStatus, deps?): Promise<boolean>; // true when written
  export function resetMiraStatusMemory(): void; // tests
  ```
- Message: `miraEnsure(data: undefined): Promise<MiraStatus>`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/diagnosis-engine/mira-supervisor.test.ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MIRA_STATUS_STORAGE_KEY,
  ensureMira,
  publishMiraStatus,
  resetMiraStatusMemory,
  type MiraStatus,
} from './mira-supervisor';

const items: Record<string, unknown> = {};
const writes: Array<Record<string, unknown>> = [];

function fakeBrowser(port: { reply?: unknown; error?: string }) {
  return {
    storage: {
      local: {
        get: async (key: string) => (key in items ? { [key]: items[key] } : {}),
        set: async (values: Record<string, unknown>) => {
          writes.push(values);
          Object.assign(items, values);
        },
      },
    },
    runtime: {
      connectNative: (name: string) => {
        if (port.error) throw new Error(port.error);
        const listeners: Array<(msg: unknown) => void> = [];
        return {
          name,
          onMessage: { addListener: (fn: (msg: unknown) => void) => listeners.push(fn) },
          onDisconnect: { addListener: () => undefined },
          postMessage: () => queueMicrotask(() => listeners.forEach((fn) => fn(port.reply))),
          disconnect: () => undefined,
        };
      },
    },
  };
}

describe('mira-supervisor', () => {
  beforeEach(() => {
    for (const key of Object.keys(items)) delete items[key];
    writes.length = 0;
    resetMiraStatusMemory();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('publishes a status only when state or reason changes', async () => {
    vi.stubGlobal('browser', fakeBrowser({}));
    const ready: MiraStatus = { state: 'ready', checkedAt: 't1' };
    expect(await publishMiraStatus(ready)).toBe(true);
    expect(await publishMiraStatus({ ...ready, checkedAt: 't2' })).toBe(false);
    expect(await publishMiraStatus({ state: 'down', reason: 'x', checkedAt: 't3' })).toBe(true);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual({ [MIRA_STATUS_STORAGE_KEY]: ready });
  });

  it('maps a missing host to not-installed and publishes it', async () => {
    vi.stubGlobal('browser', fakeBrowser({ error: 'Specified native messaging host not found.' }));
    const status = await ensureMira({ health: async () => false, pollMs: 1, maxWaitMs: 5 });
    expect(status.state).toBe('not-installed');
    expect(items[MIRA_STATUS_STORAGE_KEY]).toMatchObject({ state: 'not-installed' });
  });

  it('returns ready once healthz answers, with one starting and one ready write', async () => {
    vi.stubGlobal('browser', fakeBrowser({ reply: { status: 'starting', port: 8787, pid: 1 } }));
    let calls = 0;
    const status = await ensureMira({ health: async () => ++calls >= 3, pollMs: 1, maxWaitMs: 100 });
    expect(status.state).toBe('ready');
    expect(writes.map((w) => (w[MIRA_STATUS_STORAGE_KEY] as MiraStatus).state)).toEqual(['starting', 'ready']);
  });

  it('returns down when the service never answers within the wait', async () => {
    vi.stubGlobal('browser', fakeBrowser({ reply: { status: 'starting', port: 8787, pid: 1 } }));
    const status = await ensureMira({ health: async () => false, pollMs: 1, maxWaitMs: 5 });
    expect(status.state).toBe('down');
  });

  it('returns failed with the host reason', async () => {
    vi.stubGlobal('browser', fakeBrowser({ reply: { status: 'failed', reason: 'venv missing' } }));
    const status = await ensureMira({ health: async () => false, pollMs: 1, maxWaitMs: 5 });
    expect(status).toMatchObject({ state: 'failed', reason: 'venv missing' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/mira-supervisor.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// lib/diagnosis-engine/mira-supervisor.ts
/**
 * Asks the native messaging host `com.sentra.mira` to start the MIRA reasoning service and
 * publishes the service status to `storage.local` — only when the status changes, because the
 * side panel re-renders on every `storage.onChanged` event.
 *
 * @module lib/diagnosis-engine/mira-supervisor
 */

export type MiraStatusState = 'not-installed' | 'starting' | 'ready' | 'down' | 'failed';

export interface MiraStatus {
  state: MiraStatusState;
  reason?: string;
  checkedAt: string;
}

export const MIRA_STATUS_STORAGE_KEY = 'sentra:mira-status';
export const MIRA_HOST_NAME = 'com.sentra.mira';
const DEFAULT_POLL_MS = 500;
const DEFAULT_MAX_WAIT_MS = 30_000;

type HostReply =
  | { status: 'running' | 'starting'; port: number; pid?: number }
  | { status: 'failed'; reason: string };

let lastPublished: { state: MiraStatusState; reason?: string } | null = null;

export function resetMiraStatusMemory(): void {
  lastPublished = null;
}

export async function publishMiraStatus(next: MiraStatus): Promise<boolean> {
  if (lastPublished === null) {
    try {
      const raw = await browser.storage.local.get(MIRA_STATUS_STORAGE_KEY);
      const stored = raw[MIRA_STATUS_STORAGE_KEY] as MiraStatus | undefined;
      if (stored) lastPublished = { state: stored.state, reason: stored.reason };
    } catch {
      // fall through: treat as never published
    }
  }
  if (lastPublished && lastPublished.state === next.state && lastPublished.reason === next.reason) {
    return false;
  }
  await browser.storage.local.set({ [MIRA_STATUS_STORAGE_KEY]: next });
  lastPublished = { state: next.state, reason: next.reason };
  return true;
}

function askHost(): Promise<HostReply> {
  return new Promise((resolve, reject) => {
    const port = browser.runtime.connectNative(MIRA_HOST_NAME);
    let settled = false;
    port.onMessage.addListener((message: unknown) => {
      settled = true;
      port.disconnect();
      resolve(message as HostReply);
    });
    port.onDisconnect.addListener(() => {
      if (!settled) reject(new Error(browser.runtime.lastError?.message ?? 'host disconnected'));
    });
    port.postMessage({ cmd: 'ensure' });
  });
}

async function defaultHealth(): Promise<boolean> {
  const base = import.meta.env.VITE_MIRA_SERVICE_URL?.trim().replace(/\/+$/, '');
  if (!base) return false;
  try {
    const response = await fetch(`${base}/healthz`, { credentials: 'omit' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureMira(
  deps: { health?: () => Promise<boolean>; pollMs?: number; maxWaitMs?: number } = {}
): Promise<MiraStatus> {
  const health = deps.health ?? defaultHealth;
  const pollMs = deps.pollMs ?? DEFAULT_POLL_MS;
  const maxWaitMs = deps.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const stamp = () => new Date().toISOString();

  if (await health()) {
    const ready: MiraStatus = { state: 'ready', checkedAt: stamp() };
    await publishMiraStatus(ready);
    return ready;
  }

  let reply: HostReply;
  try {
    reply = await askHost();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status: MiraStatus = /not found/i.test(message)
      ? { state: 'not-installed', checkedAt: stamp() }
      : { state: 'failed', reason: message, checkedAt: stamp() };
    await publishMiraStatus(status);
    return status;
  }
  if (reply.status === 'failed') {
    const status: MiraStatus = { state: 'failed', reason: reply.reason, checkedAt: stamp() };
    await publishMiraStatus(status);
    return status;
  }

  await publishMiraStatus({ state: 'starting', checkedAt: stamp() });
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await health()) {
      const ready: MiraStatus = { state: 'ready', checkedAt: stamp() };
      await publishMiraStatus(ready);
      return ready;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  const down: MiraStatus = { state: 'down', reason: 'no healthz answer', checkedAt: stamp() };
  await publishMiraStatus(down);
  return down;
}
```

`wxt.config.ts`: add `'nativeMessaging'` after `'offscreen'` in `permissions`.

`utils/messaging.ts`: in `ProtocolMap` under "CDSS Engine Status" add `miraEnsure(data: undefined): Promise<MiraStatus>;` (import the type from `@/lib/diagnosis-engine/mira-supervisor`), and add `'miraEnsure'` to `PROTOCOL_MESSAGE_NAMES`.

`entrypoints/background.ts` (after the `initializeCDSS` handler): 

```ts
  // Panel → Worker: make sure the MIRA service is up (native messaging host com.sentra.mira)
  onMessage('miraEnsure', async () => ensureMira());
```
with `import { ensureMira } from '@/lib/diagnosis-engine/mira-supervisor';`.

- [ ] **Step 4: Run tests, typecheck**

Run: `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/mira-supervisor.test.ts utils/messaging.test.ts` then `node scripts/pnpm.mjs run typecheck`, `run build` and `run run:check` (the manifest gained a permission)
Expected: PASS, exit 0 for all (if `utils/messaging.test.ts` pins the message-name list, add `miraEnsure` there and name it in the commit).

- [ ] **Step 5: Commit**

```bash
git add lib/diagnosis-engine/mira-supervisor.ts lib/diagnosis-engine/mira-supervisor.test.ts wxt.config.ts utils/messaging.ts entrypoints/background.ts && git commit -m "feat(med-assist): ask the native host to start MIRA and publish its status on change

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Header status dot and the `miraEnsure` trigger

**Files:**
- Create: `components/sidepanel/MiraStatusDot.tsx`
- Test: `components/sidepanel/MiraStatusDot.test.tsx`
- Modify: `components/sidepanel/SidePanelHeader.tsx` (mount the dot next to `ThemeToggle`, send `miraEnsure` once on mount), `components/sidepanel/SidePanelHeader.test.tsx` (mock `@/utils/messaging`), `entrypoints/sidepanel/style.css` (append `.mira-status-dot*`)

- [ ] **Step 1: Write the failing test**

```tsx
// components/sidepanel/MiraStatusDot.test.tsx
import { render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiraStatusDot } from './MiraStatusDot';

import { MIRA_STATUS_STORAGE_KEY } from '@/lib/diagnosis-engine/mira-supervisor';

type Listener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;
const items: Record<string, unknown> = {};
const listeners: Listener[] = [];

describe('MiraStatusDot', () => {
  beforeEach(() => {
    for (const key of Object.keys(items)) delete items[key];
    listeners.length = 0;
    vi.stubGlobal('browser', {
      storage: {
        local: { get: async (key: string) => (key in items ? { [key]: items[key] } : {}) },
        onChanged: {
          addListener: (fn: Listener) => listeners.push(fn),
          removeListener: (fn: Listener) => listeners.splice(listeners.indexOf(fn), 1),
        },
      },
    });
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'mira');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('renders nothing in legacy mode', () => {
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'legacy');
    const { container } = render(<MiraStatusDot />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the stored state and follows storage changes', async () => {
    items[MIRA_STATUS_STORAGE_KEY] = { state: 'starting', checkedAt: 't' };
    render(<MiraStatusDot />);
    await waitFor(() => expect(screen.getByTitle('MIRA sedang menyala')).toHaveAttribute('data-state', 'starting'));
    act(() => listeners.forEach((fn) => fn({ [MIRA_STATUS_STORAGE_KEY]: { newValue: { state: 'ready', checkedAt: 't' } } }, 'local')));
    expect(screen.getByTitle('MIRA siap')).toHaveAttribute('data-state', 'ready');
  });

  it('names the install step when the host is missing', async () => {
    items[MIRA_STATUS_STORAGE_KEY] = { state: 'not-installed', checkedAt: 't' };
    render(<MiraStatusDot />);
    await waitFor(() => expect(screen.getByTitle('MIRA belum terpasang · jalankan install_host.ps1')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/pnpm.mjs exec vitest run components/sidepanel/MiraStatusDot.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```tsx
// components/sidepanel/MiraStatusDot.tsx
/** Small dot in the header showing whether the MIRA reasoning service is reachable. */
import React, { useEffect, useState } from 'react';

import { MIRA_STATUS_STORAGE_KEY, type MiraStatus } from '@/lib/diagnosis-engine/mira-supervisor';
import { getDiagnosisEngineConfig } from '@/lib/iskandar-diagnosis-engine/feature-flags';

const TITLES: Record<MiraStatus['state'], string> = {
  ready: 'MIRA siap',
  starting: 'MIRA sedang menyala',
  down: 'MIRA mati',
  failed: 'MIRA gagal menyala',
  'not-installed': 'MIRA belum terpasang · jalankan install_host.ps1',
};

export const MiraStatusDot: React.FC = () => {
  const enabled = getDiagnosisEngineConfig().diagnosisEngine !== 'legacy';
  const [status, setStatus] = useState<MiraStatus | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    browser.storage.local
      .get(MIRA_STATUS_STORAGE_KEY)
      .then((raw) => {
        if (active) setStatus((raw[MIRA_STATUS_STORAGE_KEY] as MiraStatus | undefined) ?? null);
      })
      .catch(() => undefined);
    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local' || !(MIRA_STATUS_STORAGE_KEY in changes)) return;
      setStatus((changes[MIRA_STATUS_STORAGE_KEY].newValue as MiraStatus | undefined) ?? null);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, [enabled]);

  if (!enabled || !status) return null;
  const title = status.reason ? `${TITLES[status.state]} · ${status.reason}` : TITLES[status.state];
  return <span className="mira-status-dot" data-state={status.state} title={title} aria-label={title} role="status" />;
};
```

`SidePanelHeader.tsx`: import `MiraStatusDot`, `sendMessage` and `getDiagnosisEngineConfig`; add

```tsx
  useEffect(() => {
    if (getDiagnosisEngineConfig().diagnosisEngine === 'legacy') return;
    sendMessage('miraEnsure', undefined).catch(() => undefined);
  }, []);
```
(so a legacy or dev build never attempts native messaging nor writes a `not-installed` status)
and render `<MiraStatusDot />` inside the `absolute left-0 top-0` div after `<ThemeToggle />`. In `SidePanelHeader.test.tsx` add at the top `vi.mock('@/utils/messaging', () => ({ sendMessage: vi.fn(async () => ({ state: 'ready', checkedAt: 't' })) }));` and two tests: "asks the background to ensure MIRA once on mount" (with `vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'mira')`) asserting `sendMessage` called once with `('miraEnsure', undefined)` across a rerender, and "does not ask in legacy mode" asserting no call.

Append to `style.css`:

```css
/* ── MIRA status dot in the header (2026-09-28) ── */
.mira-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 6px;
  border-radius: var(--radius-chip);
  background: var(--text-muted);
  vertical-align: middle;
}
.mira-status-dot[data-state='ready'] { background: var(--sentra-safe); }
.mira-status-dot[data-state='starting'] { background: var(--sentra-warning); }
.mira-status-dot[data-state='down'],
.mira-status-dot[data-state='failed'] { background: var(--sentra-danger); }
```
(Use the danger/warning token names that already exist in `style.css`; check with `grep -n "sentra-danger\|sentra-warning\|sentra-safe" entrypoints/sidepanel/style.css | head -3` and substitute the real names.)

- [ ] **Step 4: Run tests and token-guard**

Run: `node scripts/pnpm.mjs exec vitest run components/sidepanel/MiraStatusDot.test.tsx components/sidepanel/SidePanelHeader.test.tsx`; then the token-guard agent on `MiraStatusDot.tsx`, `SidePanelHeader.tsx`, `style.css`.
Expected: PASS; token-guard PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sidepanel/MiraStatusDot.tsx components/sidepanel/MiraStatusDot.test.tsx components/sidepanel/SidePanelHeader.tsx components/sidepanel/SidePanelHeader.test.tsx entrypoints/sidepanel/style.css && git commit -m "feat(med-assist): show MIRA status in the header and ensure the service when the panel opens

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: Prefetch MIRA from the Trajectory stage

**Files:**
- Create: `lib/diagnosis-engine/request-context.ts`, `lib/diagnosis-engine/prefetch-store.ts` (the map only: `peekPrefetch`, `rememberPrefetch`, `resetPrefetchMemory`, `MIRA_PREFETCH_READY_KEY`, `PrefetchEntry`; no imports), `lib/diagnosis-engine/mira-prefetch.ts` (`runMiraPrefetch`, re-exports the store)
- Test: `lib/diagnosis-engine/request-context.test.ts`, `lib/diagnosis-engine/mira-prefetch.test.ts`
- Modify: `types/api.ts` (`engine_pending`, `recurrent_diagnoses`), `lib/diagnosis-engine/run-diagnosis.ts` (export `stepWithTimeout`; consult the prefetch map), `utils/messaging.ts` (`prefetchDiagnosis`), `entrypoints/background.ts` (handler), `components/sidepanel/ClinicalReasoningWorkbench.tsx` (send prefetch), `components/clinical/ClinicalDifferential.tsx` (build the context through the shared builder; re-request once on `sentra:mira-prefetch-ready`)

**Interfaces:**
- Produces:
  ```ts
  // request-context.ts (pure)
  export interface DiagnosisContextSource { keluhanUtama: string; keluhanTambahan: string; patientAge: number; patientGender: 'L' | 'P'; vitals: { sbp?: number; dbp?: number; hr?: number; rr?: number; temp?: number }; recurrent: Array<{ icd: string; name: string }> }
  export function buildDiagnosisRequestContext(source: DiagnosisContextSource): DiagnosisRequestContext;
  export function hashDiagnosisContext(context: DiagnosisRequestContext): string; // FNV-1a hex
  // mira-prefetch.ts (background)
  export const MIRA_PREFETCH_READY_KEY = 'sentra:mira-prefetch-ready';
  export type PrefetchEntry = { status: 'pending' } | { status: 'done'; result: EngineResult };
  export function peekPrefetch(hash: string): PrefetchEntry | undefined;
  export function runMiraPrefetch(encounter: Encounter, context: DiagnosisRequestContext, deps?): Promise<{ started: boolean; hash: string }>;
  export function resetPrefetchMemory(): void;
  ```
- `types/api.ts`: `CDSSResponse.engine_pending?: boolean`; `DiagnosisRequestContext.recurrent_diagnoses?: Array<{ icd: string; name: string }>`.
- Message: `prefetchDiagnosis(context: DiagnosisRequestContext): Promise<{ started: boolean; hash: string }>`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/diagnosis-engine/request-context.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildDiagnosisRequestContext, hashDiagnosisContext } from './request-context';

const source = {
  keluhanUtama: 'nyeri kepala',
  keluhanTambahan: '',
  patientAge: 54,
  patientGender: 'L' as const,
  vitals: { sbp: 168, dbp: 102, hr: 88, rr: 0, temp: 36.7 },
  recurrent: [{ icd: 'I10', name: 'Hipertensi esensial' }],
};

describe('request-context', () => {
  it('builds the same context from equal inputs and drops zero vitals', () => {
    const a = buildDiagnosisRequestContext(source);
    const b = buildDiagnosisRequestContext({ ...source, vitals: { ...source.vitals } });
    expect(a).toEqual(b);
    expect(a.vital_signs).toEqual({ systolic: 168, diastolic: 102, heart_rate: 88, temperature: 36.7 });
    expect(a.patient_gender).toBe('M');
    expect(a.recurrent_diagnoses).toEqual([{ icd: 'I10', name: 'Hipertensi esensial' }]);
  });

  it('hashes equal contexts equally and different ones differently', () => {
    const a = hashDiagnosisContext(buildDiagnosisRequestContext(source));
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(hashDiagnosisContext(buildDiagnosisRequestContext(source))).toBe(a);
    expect(hashDiagnosisContext(buildDiagnosisRequestContext({ ...source, keluhanUtama: 'batuk' }))).not.toBe(a);
  });

  it('hashes independently of key order', () => {
    const ctx = buildDiagnosisRequestContext(source);
    const reordered = JSON.parse(JSON.stringify({ patient_age: ctx.patient_age, ...ctx }));
    expect(hashDiagnosisContext(reordered)).toBe(hashDiagnosisContext(ctx));
  });
});
```

```ts
// lib/diagnosis-engine/mira-prefetch.test.ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { createUnavailableResult } from './engine-result';
import { MIRA_PREFETCH_READY_KEY, peekPrefetch, resetPrefetchMemory, runMiraPrefetch } from './mira-prefetch';
import { hashDiagnosisContext } from './request-context';
import { runDiagnosisSuggestions } from './run-diagnosis';
import { installLegacyRuntime } from './testing/legacy-runtime';
import type { DiagnosisEngine, EngineResult } from './types';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));

const CASE = GOLDEN_CASES.find((c) => c.id === 'appendicitis-like')!;
const writes: Array<Record<string, unknown>> = [];

function okResult(): EngineResult {
  return {
    ...createUnavailableResult({ engineId: 'mira', version: 'fake', code: 'X', message: 'x', latencyMs: 1, traceId: 't' }),
    status: 'ok',
    unfilled: [],
    error: undefined,
    differential: { likely: [{ icd10: 'K35.8', label: 'Acute appendicitis', confidenceTier: 'high' }], alternatives: [], cannotMiss: [] },
  };
}

function engine(step: () => Promise<EngineResult>): DiagnosisEngine {
  return { id: 'mira', version: 'fake', step };
}

describe('mira-prefetch', () => {
  beforeEach(async () => {
    await installLegacyRuntime();
    resetPrefetchMemory();
    writes.length = 0;
    vi.stubGlobal('browser', { storage: { local: { set: async (v: Record<string, unknown>) => void writes.push(v) } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('runs one step per hash and writes the ready key once', async () => {
    let steps = 0;
    const deps = { engine: engine(async () => (steps++, okResult())), timeoutMs: 100 };
    const first = await runMiraPrefetch(CASE.encounter, CASE.context, deps);
    const second = await runMiraPrefetch(CASE.encounter, CASE.context, deps);
    expect(first.started).toBe(true);
    expect(second.started).toBe(false);
    expect(steps).toBe(1);
    expect(peekPrefetch(first.hash)).toMatchObject({ status: 'done' });
    expect(writes).toEqual([{ [MIRA_PREFETCH_READY_KEY]: { hash: first.hash, at: expect.any(String) } }]);
  });

  it('serves a done prefetch to getSuggestions without a new step', async () => {
    let steps = 0;
    const active = engine(async () => (steps++, okResult()));
    await runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 100 });
    const response = await runDiagnosisSuggestions(CASE.encounter, CASE.context, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(steps).toBe(1);
    expect(response.data?.diagnosis_suggestions[0]?.icd_x).toBe('K35.8');
    expect(response.data?.engine_pending).toBeUndefined();
  });

  it('answers legacy with a pending notice while the prefetch is running', async () => {
    let release: () => void = () => undefined;
    const active = engine(() => new Promise((resolve) => { release = () => resolve(okResult()); }));
    const started = runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 1000 });
    const response = await runDiagnosisSuggestions(CASE.encounter, CASE.context, { mode: 'mira', engines: { legacy: (await import('./registry')).getLegacyEngine(), active } });
    expect(response.data?.engine_pending).toBe(true);
    expect(response.data?.engine_notice).toBe('Menunggu MIRA…');
    release();
    await started;
  });

  it('ignores a done entry for a different context hash', async () => {
    const active = engine(async () => okResult());
    await runMiraPrefetch(CASE.encounter, CASE.context, { engine: active, timeoutMs: 100 });
    const other = { ...CASE.context, keluhan_utama: 'batuk lama' };
    expect(peekPrefetch(hashDiagnosisContext(other))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/request-context.test.ts lib/diagnosis-engine/mira-prefetch.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the pure builder and hash**

```ts
// lib/diagnosis-engine/request-context.ts
/**
 * One builder for the diagnosis request the side panel sends, used by the Trajectory stage
 * (prefetch) and the diagnosis page (getSuggestions) so both produce the same payload and hash.
 *
 * @module lib/diagnosis-engine/request-context
 */
import type { DiagnosisRequestContext } from '@/types/api';

export interface DiagnosisContextSource {
  keluhanUtama: string;
  keluhanTambahan: string;
  patientAge: number;
  patientGender: 'L' | 'P';
  vitals: { sbp?: number; dbp?: number; hr?: number; rr?: number; temp?: number };
  recurrent: Array<{ icd: string; name: string }>;
}

const positive = (value: number | undefined) => (value && value > 0 ? value : undefined);

export function buildDiagnosisRequestContext(source: DiagnosisContextSource): DiagnosisRequestContext {
  const vital_signs: DiagnosisRequestContext['vital_signs'] = {};
  const systolic = positive(source.vitals.sbp);
  const diastolic = positive(source.vitals.dbp);
  const heart_rate = positive(source.vitals.hr);
  const respiratory_rate = positive(source.vitals.rr);
  const temperature = positive(source.vitals.temp);
  if (systolic) vital_signs.systolic = systolic;
  if (diastolic) vital_signs.diastolic = diastolic;
  if (heart_rate) vital_signs.heart_rate = heart_rate;
  if (respiratory_rate) vital_signs.respiratory_rate = respiratory_rate;
  if (temperature) vital_signs.temperature = temperature;
  return {
    keluhan_utama: source.keluhanUtama.trim(),
    keluhan_tambahan: source.keluhanTambahan.trim(),
    patient_age: source.patientAge > 0 ? source.patientAge : 0,
    patient_gender: source.patientGender === 'P' ? 'F' : 'M',
    vital_signs,
    recurrent_diagnoses: source.recurrent.map((item) => ({ icd: item.icd, name: item.name })),
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** FNV-1a 32-bit over the canonical JSON: stable, synchronous, no crypto dependency. */
export function hashDiagnosisContext(context: DiagnosisRequestContext): string {
  const text = canonical(context);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
```

- [ ] **Step 4: Implement the prefetch map and wire run-diagnosis**

```ts
// lib/diagnosis-engine/mira-prefetch.ts
/**
 * Runs the MIRA step ahead of the diagnosis page (from the Trajectory stage) and keeps the
 * result in memory by request hash. One live step per hash per service-worker lifetime.
 *
 * @module lib/diagnosis-engine/mira-prefetch
 */
import { encounterToCaseState } from './case-state';
import { getActiveDiagnosisEngine } from './registry';
import { hashDiagnosisContext } from './request-context';
import { CANDIDATE_TIMEOUT_MS, recordCandidateRun, stepWithTimeout } from './run-diagnosis';
import type { DiagnosisEngine, EngineResult } from './types';

import type { DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';

import { MIRA_PREFETCH_READY_KEY, peekPrefetch, rememberPrefetch as remember } from './prefetch-store';

export { MIRA_PREFETCH_READY_KEY, peekPrefetch, resetPrefetchMemory, type PrefetchEntry } from './prefetch-store';
// prefetch-store.ts holds exactly the block that used to live here: the 20-entry Map,
// `peekPrefetch`, `rememberPrefetch` (delete + set + evict oldest) and `resetPrefetchMemory`.

export async function runMiraPrefetch(
  encounter: Encounter,
  context: DiagnosisRequestContext,
  deps: { engine?: DiagnosisEngine; timeoutMs?: number } = {}
): Promise<{ started: boolean; hash: string }> {
  const hash = hashDiagnosisContext(context);
  if (entries.has(hash)) return { started: false, hash };
  remember(hash, { status: 'pending' });
  const engine = deps.engine ?? getActiveDiagnosisEngine('mira');
  const result = await stepWithTimeout(engine, encounterToCaseState(encounter, context), deps.timeoutMs ?? CANDIDATE_TIMEOUT_MS);
  await recordCandidateRun(result, engine);
  remember(hash, { status: 'done', result });
  try {
    await browser.storage.local.set({ [MIRA_PREFETCH_READY_KEY]: { hash, at: new Date().toISOString() } });
  } catch {
    // the page will fall back to a normal request
  }
  return { started: true, hash };
}
```

`run-diagnosis.ts`: `export` both `stepWithTimeout` and `recordCandidateRun`; import `peekPrefetch` from `./prefetch-store` (not from `mira-prefetch`, so there is no import cycle) and `hashDiagnosisContext` from `./request-context`. Replace the tail of `runDiagnosisSuggestions` for `mira` mode:

```ts
  const candidate = options.engines?.active ?? getActiveDiagnosisEngine('mira');
  const prefetched = mode === 'mira' ? peekPrefetch(hashDiagnosisContext(context)) : undefined;

  if (prefetched?.status === 'pending') {
    const response = await physicianResponse;
    if (!response.success || !response.data) return response;
    return { ...response, data: { ...response.data, engine_notice: 'Menunggu MIRA…', engine_pending: true } };
  }

  const candidateRun =
    prefetched?.status === 'done'
      ? Promise.resolve(prefetched.result)
      : stepWithTimeout(candidate, encounterToCaseState(encounter, context), options.candidateTimeoutMs ?? CANDIDATE_TIMEOUT_MS)
          .then(async (result) => { await recordCandidateRun(result, candidate); return result; });
  if (mode === 'shadow') return physicianResponse;
  // … unchanged from here (Promise.all, suggestions, notice)
```

`types/api.ts`: add `engine_pending?: boolean;` after `engine_notice` and `recurrent_diagnoses?: Array<{ icd: string; name: string }>;` at the end of `DiagnosisRequestContext`.

`utils/messaging.ts`: `prefetchDiagnosis(context: DiagnosisRequestContext): Promise<{ started: boolean; hash: string }>;` + name in the list.

`entrypoints/background.ts`, next to `miraEnsure`:

```ts
  // Panel (Trajectory stage) → Worker: run the MIRA step ahead of the diagnosis page
  onMessage('prefetchDiagnosis', async (message) => {
    const context = message.data as DiagnosisRequestContext;
    const encounter = await getEncounter().catch(() => null);
    if (!encounter || !context.keluhan_utama || getDiagnosisEngineConfig().diagnosisEngine !== 'mira') {
      return { started: false, hash: hashDiagnosisContext(context) };
    }
    return runMiraPrefetch(encounter, context);
  });
```

- [ ] **Step 5: Send the prefetch from the workbench and re-request from the diagnosis page**

`ClinicalReasoningWorkbench.tsx`: add props-free logic — compute `const recurrent = useRecurrentDiagnoses(patient.rm)` (Task 9 provides the hook; until then pass `[]` and add the hook in Task 9) and

```ts
  const requestContext = useMemo(
    () => buildDiagnosisRequestContext({ keluhanUtama, keluhanTambahan, patientAge: patient.age, patientGender: patient.gender, vitals: trajectoryVitals, recurrent }),
    [keluhanUtama, keluhanTambahan, patient.age, patient.gender, trajectoryVitals, recurrent]
  );
  useEffect(() => {
    if (!requestContext.keluhan_utama || requestContext.keluhan_utama === '-' || !patient.rm) return;
    const timer = setTimeout(() => { sendMessage('prefetchDiagnosis', requestContext).catch(() => undefined); }, 2000);
    return () => clearTimeout(timer);
  }, [requestContext, patient.rm]);
```

`ClinicalDifferential.tsx`: split `fetchDifferential` into the existing reset block plus an inner `loadSuggestions()` that only sets `suggestions`, `errorMsg`, `processingTimeMs` and `phase`; the initial path calls both, the prefetch re-request calls only `loadSuggestions()` so a diagnosis the doctor already tapped survives. In `loadSuggestions`, build the payload with `buildDiagnosisRequestContext({ keluhanUtama, keluhanTambahan: keluhanTambahan || '', patientAge, patientGender, vitals, recurrent: recurrentForRequest })` (where `recurrentForRequest` is `[]` until Task 9) and keep the hash in a ref. After a response with `engine_pending`, register a `browser.storage.onChanged` listener that, when `changes[MIRA_PREFETCH_READY_KEY]?.newValue?.hash` equals the ref, removes itself and calls `fetchDifferential()` again (only once; the second answer has no `engine_pending`). Remove the listener in the effect cleanup.

Add a test in `components/clinical/ClinicalDifferential.final-page.test.tsx` (it already mocks `sendMessage`): "re-requests once when the prefetch for the same hash becomes ready" — first `getSuggestions` reply carries `engine_pending: true`, fire the stubbed `browser.storage.onChanged` listener with the matching hash, assert `getSuggestions` was sent twice, the list shows the second reply's suggestion, and a candidate selected between the two replies is still selected (`aria-pressed="true"` or the workspace's `data-diagnosis-selected-count="1"`).

- [ ] **Step 6: Run tests, typecheck**

Run: `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine components/clinical/ClinicalDifferential.final-page.test.tsx components/sidepanel/ClinicalReasoningWorkbench.diagnosis-review-wiring.test.tsx` then `node scripts/pnpm.mjs run typecheck`
Expected: PASS, exit 0 (the workbench wiring test must mock `@/utils/messaging` if it does not already).

- [ ] **Step 7: Commit**

```bash
git add lib/diagnosis-engine/request-context.ts lib/diagnosis-engine/request-context.test.ts lib/diagnosis-engine/prefetch-store.ts lib/diagnosis-engine/mira-prefetch.ts lib/diagnosis-engine/mira-prefetch.test.ts lib/diagnosis-engine/run-diagnosis.ts types/api.ts utils/messaging.ts entrypoints/background.ts components/sidepanel/ClinicalReasoningWorkbench.tsx components/clinical/ClinicalDifferential.tsx components/clinical/ClinicalDifferential.final-page.test.tsx && git commit -m "feat(med-assist): prefetch the MIRA step from the Trajectory stage and serve it to the diagnosis page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: MIRA as the production default; ADR and docs

**Files:**
- Modify: `wxt.config.ts` (vite `define`), `.env.example`, `docs/adr/ADR-005-pluggable-diagnosis-engine-mira-candidate.md`, `.agents/DECISIONS.md`
- Test: `lib/iskandar-diagnosis-engine/feature-flags.test.ts` (unchanged expectations: unset stays `legacy` in Vitest)

- [ ] **Step 1: Define the production default**

In `wxt.config.ts` `vite: () => ({ … })` add:

```ts
    define:
      process.env.NODE_ENV === 'production' && !process.env.SENTRA_DIAGNOSIS_ENGINE
        ? { 'import.meta.env.SENTRA_DIAGNOSIS_ENGINE': JSON.stringify('mira') }
        : {},
```
Verify the assumption before relying on it: WXT is expected to load `.env.production.local` into `process.env` before the `vite()` function runs. Put a temporary `console.log('engine env', process.env.SENTRA_DIAGNOSIS_ENGINE)` in the function, run `node scripts/pnpm.mjs run build` once, and remove it. If it prints `undefined` although `.env.production.local` sets the variable, read it explicitly instead: `const env = loadEnv(configEnv.mode, process.cwd(), ['SENTRA_'])` (from `vite`; the `vite` option receives `configEnv`) and use `env.SENTRA_DIAGNOSIS_ENGINE`.

- [ ] **Step 2: Verify**

Run: `node scripts/pnpm.mjs exec vitest run lib/iskandar-diagnosis-engine/feature-flags.test.ts` (PASS, unchanged). Then, with `SENTRA_DIAGNOSIS_ENGINE` temporarily commented out in `.env.production.local` (restore it afterwards), `node scripts/pnpm.mjs run build` (exit 0) and `grep -c "SENTRA_DIAGNOSIS_ENGINE" .output/chrome-mv3-dev/background.js` → 0 (the define inlined the literal).

- [ ] **Step 3: Docs**

- `.env.example`: change the `SENTRA_DIAGNOSIS_ENGINE` comment to say the production build defaults to `mira` when unset and Vitest/dev default to `legacy`; add three lines under the MIRA block: the `nativeMessaging` permission, `install_host.ps1 -ExtensionId <id>` in the MIRA repository, and that the service stops when Chrome exits.
- ADR-005: `- **Status**: Accepted (2026-09-28)`; replace the bold "Proposed…" line under `## Status` with "Accepted on 2026-09-28: Chief made `mira` the production default. The safety layer is unchanged. ADR-004's rule "penyakit.json wins" is superseded for the differential only." Rename `## Decision (proposed)` to `## Decision`.
- `.agents/DECISIONS.md`: two entries at the top (newest first): "MIRA starts with Assist through a native messaging host; mira is the production default" (decision, rationale, evidence: tests in Tasks 1, 4, 6) and "‘MIRA tidak tersedia’ on 2026-09-28 was the service not running" (cause, resolved by the host).

- [ ] **Step 4: Commit**

```bash
git add wxt.config.ts .env.example docs/adr/ADR-005-pluggable-diagnosis-engine-mira-candidate.md .agents/DECISIONS.md && git commit -m "feat(med-assist): default the production build to the MIRA engine and accept ADR-005

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

## Part 2 — Recurrent diagnosis from the record

### Task 8: Pure module `lib/clinical/recurrent-diagnosis.ts` (new R3 file, approved)

**Files:**
- Create: `lib/clinical/recurrent-diagnosis.ts`
- Test: `lib/clinical/recurrent-diagnosis.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type RecurrentLabel = 'Kronis' | 'Berulang';
  export interface RecurrentDiagnosisCandidate { icd: string; name: string; count: number; visitsConsidered: number; lastSeen: string; label: RecurrentLabel }
  export const CHRONIC_ICD_ROOTS: readonly string[];
  export function normalizeRecurrentIcd(value: string | undefined): string;
  export function findRecurrentDiagnoses(visits: VisitRecord[], today: Date, options?: { minCount?: number; windowMonths?: number; currentEncounterId?: string }): RecurrentDiagnosisCandidate[];
  ```

- [ ] **Step 1: Write the failing test**

```ts
// lib/clinical/recurrent-diagnosis.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { findRecurrentDiagnoses, normalizeRecurrentIcd } from './recurrent-diagnosis';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const TODAY = new Date('2026-09-28T00:00:00.000Z');

function visit(timestamp: string, icd?: string, nama = 'Dx', encounter_id = `e-${timestamp}`): VisitRecord {
  return {
    patient_id: 'RM-SYN-1',
    encounter_id,
    timestamp,
    vitals: { sbp: 120, dbp: 80, hr: 80, rr: 18, temp: 36.5, glucose: 0 },
    keluhan_utama: 'kontrol',
    diagnosa: icd ? { icd_x: icd, nama } : undefined,
    source: 'scrape',
  } as VisitRecord;
}

describe('findRecurrentDiagnoses', () => {
  it('needs at least two visits with the same ICD inside 12 months', () => {
    expect(findRecurrentDiagnoses([visit('2026-08-01', 'I10', 'Hipertensi')], TODAY)).toEqual([]);
    const result = findRecurrentDiagnoses([visit('2026-08-01', 'I10', 'Hipertensi'), visit('2026-05-01', 'I10', 'Hipertensi')], TODAY);
    expect(result).toEqual([
      { icd: 'I10', name: 'Hipertensi', count: 2, visitsConsidered: 2, lastSeen: '2026-08-01', label: 'Kronis' },
    ]);
  });

  it('ignores visits older than the window and visits without an ICD', () => {
    const result = findRecurrentDiagnoses(
      [visit('2026-08-01', 'J06.9', 'ISPA'), visit('2025-09-27', 'J06.9', 'ISPA'), visit('2026-07-01')],
      TODAY
    );
    expect(result).toEqual([]);
  });

  it('normalises ICD spelling and labels non-chronic codes Berulang', () => {
    const result = findRecurrentDiagnoses([visit('2026-08-01', 'j06.9 ', 'ISPA'), visit('2026-06-01', 'J06.9', 'ISPA')], TODAY);
    expect(result[0]).toMatchObject({ icd: 'J06.9', label: 'Berulang', count: 2 });
    expect(normalizeRecurrentIcd(' e11.9 ')).toBe('E11.9');
  });

  it('orders Kronis first, then by count, then by recency', () => {
    const visits = [
      visit('2026-09-01', 'J06.9', 'ISPA'), visit('2026-08-01', 'J06.9', 'ISPA'), visit('2026-07-01', 'J06.9', 'ISPA'),
      visit('2026-06-01', 'I10', 'Hipertensi'), visit('2026-05-01', 'I10', 'Hipertensi'),
      visit('2026-04-01', 'K30', 'Dispepsia'), visit('2026-03-01', 'K30', 'Dispepsia'),
    ];
    expect(findRecurrentDiagnoses(visits, TODAY).map((c) => c.icd)).toEqual(['I10', 'J06.9', 'K30']);
  });

  it('excludes the current encounter from the count', () => {
    const visits = [visit('2026-09-28', 'I10', 'Hipertensi', 'current'), visit('2026-05-01', 'I10', 'Hipertensi')];
    expect(findRecurrentDiagnoses(visits, TODAY, { currentEncounterId: 'current' })).toEqual([]);
  });

  it('uses the most recent name for the ICD', () => {
    const result = findRecurrentDiagnoses([visit('2026-08-01', 'I10', 'Hipertensi esensial'), visit('2026-05-01', 'I10', 'HT')], TODAY);
    expect(result[0].name).toBe('Hipertensi esensial');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/pnpm.mjs exec vitest run lib/clinical/recurrent-diagnosis.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// lib/clinical/recurrent-diagnosis.ts
/**
 * Recurrent diagnoses from the patient's visit record: the same ICD recorded at least twice
 * in the last twelve months. Chronic codes (list below, Chief may edit it) are labelled
 * "Kronis", everything else "Berulang". Pure: no I/O, no engine calls, no selection.
 *
 * @module lib/clinical/recurrent-diagnosis
 */
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

export type RecurrentLabel = 'Kronis' | 'Berulang';

export interface RecurrentDiagnosisCandidate {
  icd: string;
  name: string;
  count: number;
  visitsConsidered: number;
  lastSeen: string;
  label: RecurrentLabel;
}

/** Three-character ICD-10 roots Chief treats as chronic conditions. */
export const CHRONIC_ICD_ROOTS: readonly string[] = [
  'I10', 'I11', 'I12', 'I13', 'I15', // hipertensi
  'E10', 'E11', 'E12', 'E13', 'E14', // diabetes
  'E78', // dislipidemia
  'I25', // PJK
  'I50', // gagal jantung
  'J44', // PPOK
  'J45', // asma
  'N18', // PGK
  'G40', // epilepsi
  'F20', // skizofrenia
  'E03', 'E05', // tiroid
  'M06', // artritis reumatoid
];

export function normalizeRecurrentIcd(value: string | undefined): string {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

function labelFor(icd: string): RecurrentLabel {
  return CHRONIC_ICD_ROOTS.includes(icd.slice(0, 3)) ? 'Kronis' : 'Berulang';
}

export function findRecurrentDiagnoses(
  visits: VisitRecord[],
  today: Date,
  options: { minCount?: number; windowMonths?: number; currentEncounterId?: string } = {}
): RecurrentDiagnosisCandidate[] {
  const minCount = options.minCount ?? 2;
  const windowStart = new Date(today);
  windowStart.setMonth(windowStart.getMonth() - (options.windowMonths ?? 12));

  const inWindow = visits
    .filter((visit) => visit.encounter_id !== options.currentEncounterId)
    .filter((visit) => {
      const at = new Date(visit.timestamp).getTime();
      return Number.isFinite(at) && at >= windowStart.getTime() && at <= today.getTime();
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const groups = new Map<string, { name: string; count: number; lastSeen: string }>();
  for (const visit of inWindow) {
    const icd = normalizeRecurrentIcd(visit.diagnosa?.icd_x);
    if (!icd) continue;
    const existing = groups.get(icd);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(icd, { name: (visit.diagnosa?.nama ?? '').trim() || icd, count: 1, lastSeen: visit.timestamp });
    }
  }

  const rank = (label: RecurrentLabel) => (label === 'Kronis' ? 0 : 1);
  return [...groups.entries()]
    .filter(([, group]) => group.count >= minCount)
    .map(([icd, group]) => ({ icd, name: group.name, count: group.count, visitsConsidered: inWindow.length, lastSeen: group.lastSeen, label: labelFor(icd) }))
    .sort((a, b) => rank(a.label) - rank(b.label) || b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node scripts/pnpm.mjs exec vitest run lib/clinical/recurrent-diagnosis.test.ts`
Expected: 6 passed. Also run `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/safety-independence.test.ts` (the structural test must not see a new import into the diagnosis pipeline; this module imports only a type).

- [ ] **Step 5: Commit**

```bash
git add lib/clinical/recurrent-diagnosis.ts lib/clinical/recurrent-diagnosis.test.ts && git commit -m "feat(med-assist): derive recurrent diagnoses (>=2 in 12 months, Kronis or Berulang) from the visit record

Chief approved this new file under lib/clinical on 2026-09-28.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: Hook, candidate merge, audit on select

**Files:**
- Create: `components/clinical/diagnosis/useRecurrentDiagnoses.ts`
- Test: `components/clinical/diagnosis/useRecurrentDiagnoses.test.tsx`, `components/clinical/ClinicalDifferential.helpers.test.ts` (extend), `components/clinical/diagnosis/diagnosisViewModel.test.ts` (extend)
- Modify: `components/clinical/diagnosis/diagnosisViewModel.ts` (`history` on candidates), `components/clinical/ClinicalImpressionPanel.tsx` (`history?` on `ClinicalImpressionViewItem`), `components/clinical/ClinicalDifferential.tsx` (merge, base-suggestion rule, audit), `components/sidepanel/ClinicalReasoningWorkbench.tsx` (use the hook for the prefetch payload), `lib/iskandar-diagnosis-engine/audit-logger.ts` is R3 — do NOT edit it; pass history through the existing `metadata` field of `auditLogger.log` instead (see step 3)

**Interfaces:**
- Produces:
  ```ts
  export function useRecurrentDiagnoses(patientRM: string, deps?: { load?: (rm: string) => Promise<VisitRecord[]>; today?: () => Date }): RecurrentDiagnosisCandidate[];
  // diagnosisViewModel.ts
  export interface DiagnosisHistoryView { label: 'Kronis' | 'Berulang'; count: number; visitsConsidered: number; lastSeen: string; engineAgrees: boolean; engineSource: 'mira' | 'legacy' | null }
  // DiagnosisCandidateViewModelInput / DiagnosisCandidateView gain `history?: DiagnosisHistoryView`
  // ClinicalDifferential.tsx (exported helpers)
  export function buildRecurrentSuggestion(candidate: RecurrentDiagnosisCandidate): DiagnosisSuggestion; // rank 0, confidence 0.9 Kronis / 0.6 Berulang, engine_tag = label
  export function resolveBaseSuggestions(suggestions: DiagnosisSuggestion[], hasRecurrent: boolean, fallback: () => DiagnosisSuggestion[]): DiagnosisSuggestion[];
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// components/clinical/diagnosis/useRecurrentDiagnoses.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRecurrentDiagnoses } from './useRecurrentDiagnoses';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const visits = [
  { patient_id: 'RM-SYN-1', encounter_id: 'a', timestamp: '2026-08-01', vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }, keluhan_utama: '', diagnosa: { icd_x: 'I10', nama: 'Hipertensi' }, source: 'scrape' },
  { patient_id: 'RM-SYN-1', encounter_id: 'b', timestamp: '2026-05-01', vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }, keluhan_utama: '', diagnosa: { icd_x: 'I10', nama: 'Hipertensi' }, source: 'scrape' },
] as VisitRecord[];

describe('useRecurrentDiagnoses', () => {
  it('loads the store once per RM and keeps a stable array identity across re-renders', async () => {
    const calls: string[] = [];
    const load = async (rm: string) => (calls.push(rm), visits);
    const today = () => new Date('2026-09-28');
    const { result, rerender } = renderHook(({ rm }) => useRecurrentDiagnoses(rm, { load, today }), { initialProps: { rm: 'RM-SYN-1' } });
    await waitFor(() => expect(result.current).toHaveLength(1));
    const first = result.current;
    rerender({ rm: 'RM-SYN-1' });
    expect(result.current).toBe(first);
    expect(calls).toEqual(['RM-SYN-1']);
  });

  it('returns an empty list for an empty RM or a failing store', async () => {
    const { result } = renderHook(() => useRecurrentDiagnoses('', { load: async () => { throw new Error('no db'); } }));
    expect(result.current).toEqual([]);
  });
});
```

In `ClinicalDifferential.helpers.test.ts` add:

```ts
describe('recurrent suggestions', () => {
  it('builds a suggestion tagged with the history label', () => {
    const s = buildRecurrentSuggestion({ icd: 'I10', name: 'Hipertensi', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', label: 'Kronis' });
    expect(s).toMatchObject({ rank: 0, icd_x: 'I10', nama: 'Hipertensi', confidence: 0.9, engine_tag: 'Kronis' });
    expect(buildRecurrentSuggestion({ icd: 'J06.9', name: 'ISPA', count: 2, visitsConsidered: 4, lastSeen: '2026-08-12', label: 'Berulang' }).confidence).toBe(0.6);
  });

  it('does not use the UI fallback list when history candidates exist', () => {
    const fallback = () => [{ rank: 1, icd_x: 'R69', nama: 'x', confidence: 0.1, rationale: '' }];
    expect(resolveBaseSuggestions([], true, fallback)).toEqual([]);
    expect(resolveBaseSuggestions([], false, fallback)).toHaveLength(1);
  });
});
```

In `diagnosisViewModel.test.ts` add:

```ts
  it('carries the history line on candidates and marks engine agreement', () => {
    const input = makeInput(); // the file's existing fixture builder
    input.candidates[0].history = { label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: true, engineSource: 'mira' };
    const view = createDiagnosisPageViewModel(input);
    expect(view.candidates[0].history).toEqual({ label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: true, engineSource: 'mira' });
    expect(view.candidates[1]?.history).toBeUndefined();
  });
```
(Use the fixture builder that file already has; if it builds the input inline, copy that inline object.)

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/useRecurrentDiagnoses.test.tsx components/clinical/ClinicalDifferential.helpers.test.ts components/clinical/diagnosis/diagnosisViewModel.test.ts`
Expected: FAIL (module not found; helpers not exported; `history` dropped by the view model).

- [ ] **Step 3: Implement**

```ts
// components/clinical/diagnosis/useRecurrentDiagnoses.ts
import { useEffect, useState } from 'react';

import { findRecurrentDiagnoses, type RecurrentDiagnosisCandidate } from '@/lib/clinical/recurrent-diagnosis';
import { getPatientVisits, type VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const EMPTY: RecurrentDiagnosisCandidate[] = [];
const VISITS_TO_READ = 12;

/** Recurrent diagnoses for the patient, read once per RM from the IndexedDB visit store. */
export function useRecurrentDiagnoses(
  patientRM: string,
  deps: { load?: (rm: string) => Promise<VisitRecord[]>; today?: () => Date } = {}
): RecurrentDiagnosisCandidate[] {
  const [candidates, setCandidates] = useState<RecurrentDiagnosisCandidate[]>(EMPTY);
  const load = deps.load ?? ((rm: string) => getPatientVisits(rm, VISITS_TO_READ));
  const today = deps.today ?? (() => new Date());

  useEffect(() => {
    const rm = patientRM.trim();
    if (!rm) {
      setCandidates(EMPTY);
      return;
    }
    let active = true;
    load(rm)
      .then((visits) => {
        if (!active) return;
        const next = findRecurrentDiagnoses(visits, today());
        setCandidates(next.length > 0 ? next : EMPTY);
      })
      .catch(() => {
        if (active) setCandidates(EMPTY);
      });
    return () => {
      active = false;
    };
    // deps.load / deps.today are test seams; the RM is the only runtime input.
  }, [patientRM]);

  return candidates;
}
```
(If `react-hooks/exhaustive-deps` flags `load`/`today`, hold them in `useRef` and read `.current` inside the effect; never add a lint suppression comment.)

`diagnosisViewModel.ts`: add `export interface DiagnosisHistoryView { label: 'Kronis' | 'Berulang'; count: number; visitsConsidered: number; lastSeen: string; engineAgrees: boolean; engineSource: 'mira' | 'legacy' | null }`, add `history?: DiagnosisHistoryView` to `DiagnosisCandidateViewModelInput` and `DiagnosisCandidateView`, and copy it in `buildCandidateViews` (`history: candidate.history ? { ...candidate.history } : undefined`).

`ClinicalImpressionPanel.tsx`: add `history?: DiagnosisHistoryView;` to `ClinicalImpressionViewItem` (import the type).

`ClinicalDifferential.tsx`:
- `const recurrent = useRecurrentDiagnoses(patientRM);` and `const recurrentByIcd = useMemo(() => new Map(recurrent.map((c) => [c.icd, c])), [recurrent]);`
- Export `buildRecurrentSuggestion` (rank 0, `confidence: label === 'Kronis' ? 0.9 : 0.6`, `rationale: 'Tercatat <count> kali dalam 12 bulan terakhir.'`, `engine_tag: label`, `red_flags: []`, `recommended_actions: []`) and `resolveBaseSuggestions`.
- In `normalizedSuggestions`: `const baseSuggestions = resolveBaseSuggestions(Array.isArray(suggestions) ? suggestions : [], recurrent.length > 0, () => buildUiFallbackDiagnoses(keluhanUtama, vitals));` and, before the loop over `sanitizedBaseSuggestions`, seed `mergedByIcd` with `buildRecurrentSuggestion(c)` for each recurrent candidate (after the chronic seeding, skipping ICDs already seeded). When a base suggestion matches a seeded recurrent ICD, keep the engine's `rationale` and `engine_tag` but the max confidence (existing merge branch already does this; make sure the recurrent's `engine_tag` is replaced by the engine's tag when present so the "MIRA" tag survives).
- In `normalizedSuggestions` also build `engineIcds = new Set(sanitizedBaseSuggestions.map((s) => s.icd_x))` and expose it from the same `useMemo` (return `{ list, engineIcds }`); `normalizedSuggestions` re-ranks every item, so rank cannot tell history-only rows apart.
- In `impressionItems`: `history: recurrentByIcd.get(selectedDiagnosis.icd_x) ? { label, count, visitsConsidered, lastSeen, engineAgrees: engineIcds.has(selectedDiagnosis.icd_x), engineSource: engineIcds.has(selectedDiagnosis.icd_x) ? (/^MIRA/.test(item.suggestion.engine_tag ?? '') ? 'mira' : 'legacy') : null } : undefined`.
- In the view-model candidate mapping add `history: item.history`.
- In `selectSuggestedDiagnosis`, after the selection updates and when the item has history: `void auditLogger.log('suggestion_selected', { session_id: patientRM ? `rm-${patientRM}` : 'rm-unknown', suggestions: [{ icd10_code: diagnosis.icd_x, confidence: item.suggestion.confidence }], metadata: { selected_icd: diagnosis.icd_x, source: 'riwayat', history_label: history.label, history_count: history.count, visits_considered: history.visitsConsidered } })` with `import { auditLogger } from '@/lib/iskandar-diagnosis-engine/audit-logger';` (the logger hashes the session id itself; the existing `logSuggestionSelected` wrapper cannot carry metadata and its file is R3, so the generic `log` is used).
- Pass `recurrent.map((c) => ({ icd: c.icd, name: c.name }))` as `recurrent` into `buildDiagnosisRequestContext` (Task 6 placeholder).

`ClinicalReasoningWorkbench.tsx`: replace the `[]` placeholder from Task 6 with `useRecurrentDiagnoses(patient.rm).map((c) => ({ icd: c.icd, name: c.name }))` (memoised).

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical components/sidepanel` then `node scripts/pnpm.mjs run lint` and `run typecheck`
Expected: PASS, exit 0. `ClinicalDifferential.autoselect.test.tsx` must stay green unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/clinical/diagnosis/useRecurrentDiagnoses.ts components/clinical/diagnosis/useRecurrentDiagnoses.test.tsx components/clinical/diagnosis/diagnosisViewModel.ts components/clinical/diagnosis/diagnosisViewModel.test.ts components/clinical/ClinicalImpressionPanel.tsx components/clinical/ClinicalDifferential.tsx components/clinical/ClinicalDifferential.helpers.test.ts components/sidepanel/ClinicalReasoningWorkbench.tsx && git commit -m "feat(med-assist): offer recurrent diagnoses from the record first and audit the doctor's pick

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 10: History to MIRA through `knownConditions`

**Files:**
- Create: `lib/diagnosis-engine/case-state.test.ts`
- Modify: `lib/diagnosis-engine/case-state.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/diagnosis-engine/case-state.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { encounterToCaseState } from './case-state';

const CASE = GOLDEN_CASES.find((c) => c.id === 'appendicitis-like')!;

describe('encounterToCaseState knownConditions', () => {
  it('appends recurrent diagnoses as "name (ICD)" without duplicating chronic entries', () => {
    const encounter = { ...CASE.encounter, diagnosa: { ...CASE.encounter.diagnosa, penyakit_kronis: ['Hipertensi (I10)'] } };
    const state = encounterToCaseState(encounter, {
      ...CASE.context,
      recurrent_diagnoses: [{ icd: 'I10', name: 'Hipertensi' }, { icd: 'E11.9', name: 'DM tipe 2' }],
    });
    expect(state.knownConditions).toEqual(['Hipertensi (I10)', 'DM tipe 2 (E11.9)']);
  });

  it('keeps knownConditions unchanged when no recurrent diagnoses are sent', () => {
    expect(encounterToCaseState(CASE.encounter, CASE.context).knownConditions).toEqual([...(CASE.encounter.diagnosa?.penyakit_kronis ?? [])]);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine/case-state.test.ts` → FAIL on the first assertion.

- [ ] **Step 3: Implement**

```ts
    knownConditions: mergeKnownConditions(encounter.diagnosa?.penyakit_kronis ?? [], context.recurrent_diagnoses ?? []),
```
```ts
function mergeKnownConditions(chronic: string[], recurrent: Array<{ icd: string; name: string }>): string[] {
  const merged = [...chronic];
  const seen = new Set(merged.map((item) => item.trim().toLowerCase()));
  for (const item of recurrent) {
    const label = `${item.name} (${item.icd})`;
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    merged.push(label);
  }
  return merged;
}
```

- [ ] **Step 4: Run** — `node scripts/pnpm.mjs exec vitest run lib/diagnosis-engine` → PASS (golden recordings are unaffected: their contexts carry no `recurrent_diagnoses`).

- [ ] **Step 5: Commit**

```bash
git add lib/diagnosis-engine/case-state.ts lib/diagnosis-engine/case-state.test.ts && git commit -m "feat(med-assist): send recurrent diagnoses to MIRA as knownConditions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

## Part 3 — Diagnosis page as a step flow

All Part 3 components use Indonesian UI copy exactly as written here; class names are prefixed `dx-flow-` and appended to `style.css`. `phase` is `'loading' | 'error' | 'ready'` as today.

### Task 11: Step derivation and the shared page props

**Files:**
- Create: `components/clinical/diagnosis/diagnosisSteps.ts`, `components/clinical/diagnosis/diagnosisPageProps.ts`
- Test: `components/clinical/diagnosis/diagnosisSteps.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DiagnosisStepKey = 'finding' | 'diagnosis' | 'therapy' | 'rme';
  export interface DiagnosisStepState { key: DiagnosisStepKey; index: number; label: string; done: boolean }
  export function resolveDiagnosisSteps(phase, viewModel): DiagnosisStepState[]; // same rules as the old stepper
  export function resolveActiveStep(steps: DiagnosisStepState[], reopened: DiagnosisStepKey | null): DiagnosisStepKey; // reopened wins; else first not done; else 'rme'
  // diagnosisPageProps.ts: `DiagnosisPageProps` = the former `DiagnosisWorkspaceProps` plus
  //   `recurrentOnlyMessage?: string` — nothing else changes; `DiagnosisManualMedicationDraftView`,
  //   `DiagnosisTriageOutcome`, `DiagnosisTriageView` move here unchanged.
  ```

- [ ] **Step 1: Write the failing test**

```ts
// components/clinical/diagnosis/diagnosisSteps.test.ts
import { describe, expect, it } from 'vitest';

import { resolveActiveStep, resolveDiagnosisSteps } from './diagnosisSteps';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

function vm(overrides: { selectedDiagnosisCount?: number; selectedMedicationCount?: number; transferState?: string } = {}): DiagnosisPageViewModel {
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: '', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: '', confidenceLabel: '', safestNextAction: '', primaryCtaLabel: '', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: [] },
    candidates: [],
    selectedDiagnoses: [],
    therapy: { state: 'idle', hasDiagnosisBasis: false, selectedDiagnosisCount: overrides.selectedDiagnosisCount ?? 0, selectedMedicationCount: overrides.selectedMedicationCount ?? 0, candidateMedicationCount: 0, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: '', groups: [] },
    transfer: { state: overrides.transferState ?? 'idle', diagnosisReady: false, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: null, medicationSelectionLabel: '0/0', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
  };
}

describe('resolveDiagnosisSteps', () => {
  it('marks steps done from phase, diagnosis, medication and transfer state', () => {
    expect(resolveDiagnosisSteps('loading', vm()).map((s) => s.done)).toEqual([false, false, false, false]);
    expect(resolveDiagnosisSteps('ready', vm({ selectedDiagnosisCount: 1, selectedMedicationCount: 2, transferState: 'success' })).map((s) => s.done)).toEqual([true, true, true, true]);
    expect(resolveDiagnosisSteps('ready', vm()).map((s) => [s.index, s.label])).toEqual([[1, 'Temuan'], [2, 'Diagnosis'], [3, 'Terapi'], [4, 'RME']]);
  });
});

describe('resolveActiveStep', () => {
  it('is the first unfinished step, the reopened step when set, and rme when all are done', () => {
    expect(resolveActiveStep(resolveDiagnosisSteps('ready', vm()), null)).toBe('diagnosis');
    expect(resolveActiveStep(resolveDiagnosisSteps('ready', vm({ selectedDiagnosisCount: 1 })), 'finding')).toBe('finding');
    expect(resolveActiveStep(resolveDiagnosisSteps('ready', vm({ selectedDiagnosisCount: 1, selectedMedicationCount: 1, transferState: 'success' })), null)).toBe('rme');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/diagnosisSteps.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// components/clinical/diagnosis/diagnosisSteps.ts
import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

export type DiagnosisStepKey = 'finding' | 'diagnosis' | 'therapy' | 'rme';

export interface DiagnosisStepState {
  key: DiagnosisStepKey;
  index: number;
  label: string;
  done: boolean;
}

export function resolveDiagnosisSteps(
  phase: 'loading' | 'error' | 'ready',
  viewModel: DiagnosisPageViewModel
): DiagnosisStepState[] {
  return [
    { key: 'finding', index: 1, label: 'Temuan', done: phase === 'ready' },
    { key: 'diagnosis', index: 2, label: 'Diagnosis', done: isDiagnosisChosen(viewModel) },
    { key: 'therapy', index: 3, label: 'Terapi', done: viewModel.therapy.selectedMedicationCount > 0 },
    { key: 'rme', index: 4, label: 'RME', done: viewModel.transfer.state === 'success' },
  ];
}

export function resolveActiveStep(steps: DiagnosisStepState[], reopened: DiagnosisStepKey | null): DiagnosisStepKey {
  if (reopened) return reopened;
  return steps.find((step) => !step.done)?.key ?? 'rme';
}
```

`diagnosisPageProps.ts`: move `DiagnosisManualMedicationDraftView`, `DiagnosisTriageOutcome`, `DiagnosisTriageView` and the props interface (renamed `DiagnosisPageProps`, plus `recurrentOnlyMessage?: string`) out of `DiagnosisWorkspace.tsx`; make `DiagnosisWorkspace.tsx` re-export them (`export type { … } from './diagnosisPageProps'; export type DiagnosisWorkspaceProps = DiagnosisPageProps;`) so nothing breaks until Task 15 deletes it. Point `TherapyReviewPanel.tsx` and `RMETransferPanel.tsx` type imports at `./diagnosisPageProps`.

- [ ] **Step 4: Run** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis` and `run typecheck` → PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/clinical/diagnosis/diagnosisSteps.ts components/clinical/diagnosis/diagnosisSteps.test.ts components/clinical/diagnosis/diagnosisPageProps.ts components/clinical/diagnosis/DiagnosisWorkspace.tsx components/clinical/diagnosis/TherapyReviewPanel.tsx components/clinical/diagnosis/RMETransferPanel.tsx && git commit -m "refactor(med-assist): derive diagnosis page steps in one module and share the page props type

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 12: Safety strip and receipt/ghost lines

**Files:**
- Create: `components/clinical/diagnosis/SafetyStrip.tsx`, `components/clinical/diagnosis/StepReceipt.tsx`
- Test: `components/clinical/diagnosis/SafetyStrip.test.tsx`, `components/clinical/diagnosis/StepReceipt.test.tsx`
- Modify: `entrypoints/sidepanel/style.css` (append), `components/clinical/diagnosis/diagnosisDisplayUtils.ts` (move `getVisibleSafetyItems` and `splitReferralGuidance` here from `DiagnosisWorkspace.tsx`, exported)

**Interfaces:**
- Produces:
  ```tsx
  <SafetyStrip safetyItems={string[]} triage={DiagnosisTriageView | null} />   // renders null when both empty
  <StepReceipt step={DiagnosisStepState} summary={string} onReopen={() => void} />   // "✓ <label> · <summary> · ubah"
  <StepGhost step={DiagnosisStepState} />                                          // "<index> · <label>"
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// components/clinical/diagnosis/SafetyStrip.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SafetyStrip } from './SafetyStrip';

describe('SafetyStrip', () => {
  it('renders nothing without danger signs or triage', () => {
    const { container } = render(<SafetyStrip safetyItems={[]} triage={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows danger signs with no triage result, uncapped, behind one "lihat"', () => {
    const items = ['SpO2 < 90%', 'Nyeri dada', 'Kejang', 'Sesak berat'];
    render(<SafetyStrip safetyItems={items} triage={null} />);
    expect(screen.getByText('⚠ 4 tanda bahaya')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'lihat' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('highlights a referral and folds its reasons behind "alasan"', () => {
    render(
      <SafetyStrip
        safetyItems={[]}
        triage={{ outcome: 'refer', headline: 'Rujuk ke RS', tone: 'danger', firedCriteria: ['TD > 180'], referralGuidance: '1. Bawa hasil EKG' }}
      />
    );
    const line = screen.getByTestId('dx-flow-triage');
    expect(line).toHaveAttribute('data-tone', 'danger');
    expect(line).toHaveTextContent('Rujuk: Rujuk ke RS');
    fireEvent.click(screen.getByRole('button', { name: 'alasan' }));
    expect(screen.getByText('TD > 180')).toBeInTheDocument();
    expect(screen.getByText('Bawa hasil EKG')).toBeInTheDocument();
  });

  it('reads "Triase:" for a non-referral outcome', () => {
    render(<SafetyStrip safetyItems={[]} triage={{ outcome: 'treat_locally', headline: 'Dapat ditangani di layanan primer', tone: 'primary', firedCriteria: [], referralGuidance: null }} />);
    expect(screen.getByTestId('dx-flow-triage')).toHaveTextContent('Triase: Dapat ditangani di layanan primer');
    expect(screen.queryByRole('button', { name: 'alasan' })).toBeNull();
  });
});
```

```tsx
// components/clinical/diagnosis/StepReceipt.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StepGhost, StepReceipt } from './StepReceipt';

describe('StepReceipt', () => {
  it('shows the done step in one line and reopens on "ubah"', () => {
    const onReopen = vi.fn();
    render(<StepReceipt step={{ key: 'finding', index: 1, label: 'Temuan', done: true }} summary="nyeri kepala · TD 168/102" onReopen={onReopen} />);
    const line = screen.getByTestId('dx-flow-receipt-finding');
    expect(line).toHaveTextContent('✓ Temuan · nyeri kepala · TD 168/102');
    fireEvent.click(screen.getByRole('button', { name: 'ubah Temuan' }));
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it('renders a ghost line that is not interactive', () => {
    render(<StepGhost step={{ key: 'rme', index: 4, label: 'RME', done: false }} />);
    const ghost = screen.getByTestId('dx-flow-ghost-rme');
    expect(ghost).toHaveTextContent('4 · RME');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost.querySelector('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/SafetyStrip.test.tsx components/clinical/diagnosis/StepReceipt.test.tsx` → FAIL, modules not found.

- [ ] **Step 3: Implement**

```tsx
// components/clinical/diagnosis/SafetyStrip.tsx
import { useState } from 'react';

import { splitReferralGuidance } from './diagnosisDisplayUtils';
import type { DiagnosisTriageView } from './diagnosisPageProps';

export function SafetyStrip({ safetyItems, triage }: { safetyItems: string[]; triage: DiagnosisTriageView | null }) {
  const [showSigns, setShowSigns] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  if (safetyItems.length === 0 && !triage) return null;
  const referral = triage?.outcome === 'refer' || triage?.outcome === 'emergency';
  const reasons = triage ? [...triage.firedCriteria, ...(triage.referralGuidance ? splitReferralGuidance(triage.referralGuidance) : [])] : [];

  return (
    <section className="dx-flow-safety" aria-label="Keselamatan">
      {safetyItems.length > 0 ? (
        <div className="dx-flow-safety__line dx-flow-safety__line--danger" data-testid="dx-flow-danger">
          <span>{`⚠ ${safetyItems.length} tanda bahaya`}</span>
          <button type="button" className="dx-flow-link" aria-expanded={showSigns} onClick={() => setShowSigns((v) => !v)}>lihat</button>
        </div>
      ) : null}
      {showSigns ? (
        <ul className="dx-flow-list dx-flow-list--danger">{safetyItems.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : null}
      {triage ? (
        <div className="dx-flow-safety__line" data-testid="dx-flow-triage" data-tone={triage.tone}>
          <span>{referral ? `Rujuk: ${triage.headline}` : `Triase: ${triage.headline}`}</span>
          {reasons.length > 0 ? (
            <button type="button" className="dx-flow-link" aria-expanded={showReasons} onClick={() => setShowReasons((v) => !v)}>alasan</button>
          ) : null}
        </div>
      ) : null}
      {showReasons ? <ul className="dx-flow-list">{reasons.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </section>
  );
}
```

```tsx
// components/clinical/diagnosis/StepReceipt.tsx
import type { DiagnosisStepState } from './diagnosisSteps';

export function StepReceipt({ step, summary, onReopen }: { step: DiagnosisStepState; summary: string; onReopen: () => void }) {
  return (
    <div className="dx-flow-receipt" data-testid={`dx-flow-receipt-${step.key}`}>
      <span className="dx-flow-receipt__text">{`✓ ${step.label} · ${summary}`}</span>
      <button type="button" className="dx-flow-link" aria-label={`ubah ${step.label}`} onClick={onReopen}>ubah</button>
    </div>
  );
}

export function StepGhost({ step }: { step: DiagnosisStepState }) {
  return (
    <div className="dx-flow-ghost" data-testid={`dx-flow-ghost-${step.key}`} aria-hidden="true">
      {`${step.index} · ${step.label}`}
    </div>
  );
}
```

Move `getVisibleSafetyItems` (with its two helpers `isGenericDiagnosisUiText`, `isChronicRiskContextOnly`, both already exported there) and `splitReferralGuidance` into `diagnosisDisplayUtils.ts` as exports; `DiagnosisWorkspace.tsx` imports them from there (keeps its `splitReferralGuidance` re-export for its test until Task 15).

Append to `style.css` (use existing token names; check `--sentra-danger`/`--sentra-warning`/`--sentra-safe` exist as in Task 5):

```css
/* ── Diagnosis page step flow (2026-09-28): one step at a time ── */
.dx-flow { display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.45; }
.dx-flow-safety { display: flex; flex-direction: column; gap: 4px; }
.dx-flow-safety__line { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-card); border: 1px solid var(--accent-border-soft); font-size: 13px; }
.dx-flow-safety__line--danger, .dx-flow-safety__line[data-tone='danger'] { border-color: var(--sentra-danger); color: var(--sentra-danger); }
.dx-flow-safety__line[data-tone='warning'] { border-color: var(--sentra-warning); }
.dx-flow-link { background: none; border: 0; padding: 0; color: var(--accent-med); font: inherit; font-size: 11px; text-decoration: underline; cursor: pointer; }
.dx-flow-list { margin: 0; padding-left: 18px; font-size: 13px; }
.dx-flow-list--danger { color: var(--sentra-danger); }
.dx-flow-receipt { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 2px 8px; border-left: 2px solid var(--accent-med); font-size: 11px; color: var(--text-main); animation: dx-flow-shrink var(--duration-neu) var(--ease-neu); }
.dx-flow-ghost { padding: 2px 8px; border-left: 2px solid var(--accent-border-soft); font-size: 11px; color: var(--text-muted); opacity: 0.45; }
.dx-flow-step { display: flex; flex-direction: column; gap: 8px; animation: dx-flow-fade-in var(--duration-neu) var(--ease-neu); }
.dx-flow-step__heading { margin: 0; font-size: 14px; font-weight: 600; }
.dx-flow-label { margin: 0; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.dx-flow-card { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: var(--radius-card); border: 1px solid var(--accent-border-soft); text-align: left; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
.dx-flow-card[aria-pressed='true'] { border-color: var(--sentra-safe); }
.dx-flow-card__head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.dx-flow-card__title { margin: 0; font-size: 13px; font-weight: 600; }
.dx-flow-chip { padding: 1px 8px; border-radius: var(--radius-chip); border: 1px solid var(--accent-border-mid); font-size: 11px; }
.dx-flow-muted { margin: 0; font-size: 13px; color: var(--text-muted); }
.dx-flow-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--accent-border-soft); font-size: 13px; }
.dx-flow-links { display: flex; gap: 12px; flex-wrap: wrap; }
@keyframes dx-flow-shrink { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes dx-flow-fade-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .dx-flow-receipt, .dx-flow-step { animation: none; }
}
```
(`--duration-neu` is 0.2 s in the file; the spec's 160 ms is met by adding `--dx-flow-duration: 160ms;` on `.dx-flow` and using it in the two animations instead of `--duration-neu`.)

- [ ] **Step 4: Run tests, token-guard** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis` → PASS; token-guard on the two `.tsx` and `style.css` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/clinical/diagnosis/SafetyStrip.tsx components/clinical/diagnosis/SafetyStrip.test.tsx components/clinical/diagnosis/StepReceipt.tsx components/clinical/diagnosis/StepReceipt.test.tsx components/clinical/diagnosis/diagnosisDisplayUtils.ts components/clinical/diagnosis/DiagnosisWorkspace.tsx entrypoints/sidepanel/style.css && git commit -m "feat(med-assist): safety strip and receipt/ghost lines for the step-flow diagnosis page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 13: Finding and Diagnosis steps

**Files:**
- Create: `components/clinical/diagnosis/steps/FindingStep.tsx`, `components/clinical/diagnosis/steps/DiagnosisStep.tsx`
- Test: `components/clinical/diagnosis/steps/FindingStep.test.tsx`, `components/clinical/diagnosis/steps/DiagnosisStep.test.tsx`
- Modify: `components/clinical/diagnosis/diagnosisDisplayUtils.ts` (move `buildClinicalSignals` + `CLINICAL_SIGNAL_PATTERNS` here, exported)

**Interfaces:**
- Produces:
  ```tsx
  export function findingSummary(signals: string[]): string;   // first 4 chips joined by " · ", "+N" for the rest
  <FindingStep viewModel complaintSummary secondaryComplaint />  // full Clinical Finding block (chips) under heading "Temuan"
  export function diagnosisSummary(viewModel): string;          // "<displayLabel of the first selected diagnosis>"
  <DiagnosisStep viewModel phase errorMessage recurrentOnlyMessage showManualDiagnosisInput manualIcd manualName onToggleCandidate onToggleManualDiagnosisInput onManualIcdChange onManualNameChange onSubmitManualDiagnosis onCompleteData />
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// components/clinical/diagnosis/steps/DiagnosisStep.test.tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DiagnosisStep } from './DiagnosisStep';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

function candidate(over: Partial<DiagnosisCandidateView>): DiagnosisCandidateView {
  return { id: '2-J06.9', rank: 2, code: 'J06.9', name: 'ISPA', displayLabel: 'J06.9 - ISPA', confidenceLabel: 'Moderate confidence', source: 'suggested', isSelected: false, isSelectionBlocked: false, supports: ['Batuk'], against: [], missing: ['Auskultasi'], review: [], ...over };
}

function vm(candidates: DiagnosisCandidateView[], over: Partial<DiagnosisPageViewModel> = {}): DiagnosisPageViewModel {
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: '', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: candidates[0]?.displayLabel ?? '', confidenceLabel: 'High confidence', safestNextAction: '', primaryCtaLabel: 'Pilih Diagnosis Utama', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: ['Krisis hipertensi (I16)'] },
    candidates,
    selectedDiagnoses: [],
    therapy: { state: 'idle', hasDiagnosisBasis: false, selectedDiagnosisCount: 0, selectedMedicationCount: 0, candidateMedicationCount: 0, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: '', groups: [] },
    transfer: { state: 'idle', diagnosisReady: false, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: null, medicationSelectionLabel: '0/0', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
    ...over,
  };
}

const handlers = () => ({ onToggleCandidate: vi.fn(), onToggleManualDiagnosisInput: vi.fn(), onManualIcdChange: vi.fn(), onManualNameChange: vi.fn(), onSubmitManualDiagnosis: vi.fn(), onCompleteData: vi.fn() });

describe('DiagnosisStep', () => {
  it('asks one question, shows at most three cards, history first, and the rest behind Lainnya', () => {
    const cards = [
      candidate({ id: '1-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: true, engineSource: 'mira' } }),
      candidate({}),
      candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'Sakit kepala tegang', displayLabel: 'G44.2 - Sakit kepala tegang' }),
      candidate({ id: '4-R51', rank: 4, code: 'R51', name: 'Nyeri kepala', displayLabel: 'R51 - Nyeri kepala' }),
    ];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByRole('heading', { name: 'Apa diagnosis utama hari ini?' })).toBeInTheDocument();
    const shown = screen.getAllByTestId('dx-flow-card');
    expect(shown).toHaveLength(3);
    expect(within(shown[0]).getByText('Kronis')).toBeInTheDocument();
    expect(within(shown[0]).getByText('3 dari 5 kunjungan · terakhir 12 Agu 2026 · MIRA setuju')).toBeInTheDocument();
    expect(screen.queryByText('Diagnosis Utama')).toBeNull();
    expect(screen.queryByText('Diagnosis Banding')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lainnya (1)' }));
    expect(screen.getAllByTestId('dx-flow-card')).toHaveLength(4);
  });

  it('selects on tap, marks aria-pressed, and opens the reasons only from "alasan"', () => {
    const h = handlers();
    render(<DiagnosisStep viewModel={vm([candidate({ isSelected: true }), candidate({ id: '3-G44.2', rank: 3, code: 'G44.2', name: 'x', displayLabel: 'G44.2 - x' })])} phase="ready" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...h} />);
    const [first] = screen.getAllByTestId('dx-flow-card');
    expect(first).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(first);
    expect(h.onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    expect(screen.queryByText('Auskultasi')).toBeNull();
    fireEvent.click(within(first).getByRole('button', { name: 'alasan' }));
    expect(screen.getByText('Auskultasi')).toBeInTheDocument();
    expect(h.onToggleCandidate).toHaveBeenCalledTimes(1);
  });

  it('lists cannot-miss items uncapped and shows the history-only message when the engine had nothing', () => {
    const cards = [candidate({ id: '0-I10', rank: 1, code: 'I10', name: 'Hipertensi', displayLabel: 'I10 - Hipertensi', history: { label: 'Kronis', count: 2, visitsConsidered: 3, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null } })];
    render(<DiagnosisStep viewModel={vm(cards)} phase="ready" errorMessage="" recurrentOnlyMessage="Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut." showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Jangan terlewat: Krisis hipertensi (I16)')).toBeInTheDocument();
    expect(screen.getByText('Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut.')).toBeInTheDocument();
    expect(screen.getByText('2 dari 3 kunjungan · terakhir 12 Agu 2026')).toBeInTheDocument();
  });

  it('shows a two-card skeleton with a live text while loading', () => {
    render(<DiagnosisStep viewModel={vm([])} phase="loading" errorMessage="" showManualDiagnosisInput={false} manualIcd="" manualName="" {...handlers()} />);
    expect(screen.getByText('Menyusun diagnosis banding...')).toHaveClass('sr-only');
    expect(document.querySelectorAll('.diagnosis-skeleton__card')).toHaveLength(2);
  });
});
```

```tsx
// components/clinical/diagnosis/steps/FindingStep.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FindingStep, findingSummary } from './FindingStep';

describe('FindingStep', () => {
  it('summarises the first four signals and counts the rest', () => {
    expect(findingSummary(['Pusing', 'Demam', 'Batuk', 'Sesak', 'Mual', 'Lemas'])).toBe('Pusing · Demam · Batuk · Sesak · +2');
    expect(findingSummary([])).toBe('belum ada sinyal');
  });

  it('renders the clinical signals as chips under the Temuan heading', () => {
    render(<FindingStep complaintSummary="nyeri kepala, tengkuk kaku" secondaryComplaint="" allergySummary="Tidak ada alergi" chronicDiagnosisSummary="Hipertensi" />);
    expect(screen.getByRole('heading', { name: 'Temuan' })).toBeInTheDocument();
    expect(screen.getByText('Pusing')).toHaveClass('diagnosis-chip');
    expect(screen.getByText('Hipertensi')).toHaveClass('diagnosis-chip');
  });
});
```

- [ ] **Step 2: Run to verify they fail** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/steps` → FAIL, modules not found.

- [ ] **Step 3: Implement**

`diagnosisDisplayUtils.ts`: move `CLINICAL_SIGNAL_PATTERNS`, `MAX_CLINICAL_SIGNAL_ITEMS` and `buildClinicalSignals` (exported) from `DiagnosisWorkspace.tsx`; have `DiagnosisWorkspace.tsx` import `buildClinicalSignals` until Task 15 deletes it. Add `export function formatShortDate(iso: string): string` returning `d MMM yyyy` in Indonesian (`['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']`) using `getUTCDate`/`getUTCMonth`/`getUTCFullYear` (a date-only ISO string parses as UTC midnight; local getters would give the previous day west of UTC), `''` for an invalid date.

```tsx
// components/clinical/diagnosis/steps/FindingStep.tsx
import { buildClinicalSignals } from '../diagnosisDisplayUtils';

export function findingSummary(signals: string[]): string {
  if (signals.length === 0) return 'belum ada sinyal';
  const head = signals.slice(0, 4).join(' · ');
  return signals.length > 4 ? `${head} · +${signals.length - 4}` : head;
}

export function FindingStep(props: { complaintSummary: string; secondaryComplaint?: string; allergySummary: string; chronicDiagnosisSummary: string }) {
  const signals = buildClinicalSignals(props);
  return (
    <section className="dx-flow-step" aria-label="Temuan">
      <h2 className="dx-flow-step__heading">Temuan</h2>
      <div className="diagnosis-context__grid" data-testid="diagnosis-clinical-signals">
        {signals.map((signal) => <span key={signal} className="diagnosis-chip">{signal}</span>)}
      </div>
    </section>
  );
}
```

`DiagnosisStep.tsx` (key parts; the manual form markup is the one from `MainDiagnosisSection`, unchanged):

```tsx
import { useState } from 'react';

import { cleanClinicalSummary, formatClinicalText, formatShortDate } from '../diagnosisDisplayUtils';
import type { DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from '../diagnosisViewModel';

const MAX_CARDS = 3;

type Props = Pick<DiagnosisPageProps, 'viewModel' | 'phase' | 'errorMessage' | 'recurrentOnlyMessage' | 'showManualDiagnosisInput' | 'manualIcd' | 'manualName' | 'onToggleCandidate' | 'onToggleManualDiagnosisInput' | 'onManualIcdChange' | 'onManualNameChange' | 'onSubmitManualDiagnosis' | 'onCompleteData'>;

export function diagnosisSummary(viewModel: DiagnosisPageViewModel): string {
  return viewModel.selectedDiagnoses[0]?.displayLabel ?? '';
}

function historyLine(card: DiagnosisCandidateView): string | null {
  if (!card.history) return null;
  const base = `${card.history.count} dari ${card.history.visitsConsidered} kunjungan · terakhir ${formatShortDate(card.history.lastSeen)}`;
  if (!card.history.engineAgrees) return base;
  return `${base} · ${card.history.engineSource === 'mira' ? 'MIRA setuju' : 'engine setuju'}`;
}

function tallyLine(card: DiagnosisCandidateView): string {
  return [`mendukung ${card.supports.length}`, `tidak ${card.against.length}`, `? ${card.missing.length}`].join(' · ');
}

function chipFor(card: DiagnosisCandidateView): string | null {
  if (card.history) return card.history.label;
  return /MIRA/.test(card.displayLabel) ? 'MIRA' : null;
}

function Card({ card, onToggle }: { card: DiagnosisCandidateView; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const title = formatClinicalText(card.displayLabel).replace(/\s·\s(MIRA(?: · jangan terlewat)?|Kronis|Berulang)$/, '');
  const chip = chipFor(card);
  return (
    <div className="dx-flow-card" data-testid="dx-flow-card" role="button" tabIndex={0} aria-pressed={card.isSelected}
      onClick={() => onToggle(card.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(card.id); } }}>
      <div className="dx-flow-card__head">
        <p className="dx-flow-card__title">{title}</p>
        {chip ? <span className="dx-flow-chip">{chip}</span> : null}
      </div>
      <p className="dx-flow-muted">{historyLine(card) ?? tallyLine(card)}</p>
      <button type="button" className="dx-flow-link" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>alasan</button>
      {open ? (
        <div className="diagnosis-evidence-grid" onClick={(e) => e.stopPropagation()}>
          <List title="Mendukung" items={card.supports} /><List title="Yang tidak mendukung" items={card.against} /><List title="Data kurang" items={card.missing} /><List title="Catatan" items={card.review} />
        </div>
      ) : null}
    </div>
  );
}
```
Body of `DiagnosisStep`: heading `<h2 className="dx-flow-step__heading">Apa diagnosis utama hari ini?</h2>`; loading → the two-card skeleton + `<span className="sr-only">Menyusun diagnosis banding...</span>`; error → `errorMessage` in a danger panel; ready → `recurrentOnlyMessage` (if set) as `dx-flow-muted`, the visible notice from `getVisibleErrorMessage(errorMessage)`, cards = `viewModel.candidates` filtered (`code !== 'R69'`) sorted history-first (stable), first `MAX_CARDS` shown, "Lainnya (N)" button toggling the rest, then `"Jangan terlewat: " + doNotMiss items` one `<p>` per item (cleaned, uncapped, skipping ICDs already shown as cards), then `dx-flow-links` with "Diagnosis manual ›"/"Tutup diagnosis manual" and the manual form. `List` is the existing `LineList` markup (returns null when empty).

- [ ] **Step 4: Run tests, token-guard** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis` → PASS; token-guard on the new `.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/clinical/diagnosis/steps/FindingStep.tsx components/clinical/diagnosis/steps/FindingStep.test.tsx components/clinical/diagnosis/steps/DiagnosisStep.tsx components/clinical/diagnosis/steps/DiagnosisStep.test.tsx components/clinical/diagnosis/diagnosisDisplayUtils.ts components/clinical/diagnosis/DiagnosisWorkspace.tsx && git commit -m "feat(med-assist): Temuan and Diagnosis steps for the step-flow diagnosis page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 14: Therapy and RME steps

**Files:**
- Create: `components/clinical/diagnosis/steps/TherapyStep.tsx`, `components/clinical/diagnosis/steps/RmeStep.tsx`
- Test: `components/clinical/diagnosis/steps/TherapyStep.test.tsx`, `components/clinical/diagnosis/RMETransferPanel.test.tsx` (kept; one assertion may change, see step 3)
- Modify: nothing else in this task. `RMETransferPanel.tsx` keeps its `StagedSection` wrapper and `TherapyReviewPanel.tsx` stays until Task 15, so the old workspace and its tests stay green at this commit.

**Interfaces:**
- Produces:
  ```tsx
  export function therapySummary(viewModel): string;   // first two selected medication names joined by ", ", then "+N"
  <TherapyStep viewModel showManualMedicationInput manualMedicationDraft manualMedicationOptions onRemoveDiagnosis onSelectAllMedications onClearMedications onToggleManualMedicationInput onManualMedicationDraftChange onAddManualMedication onToggleMedication onRemoveManualMedication />
  export function rmeSummary(viewModel): string;       // "terkirim" | formatTransferState(state)
  <RmeStep {...the seven RMETransferPanel props} />    // heading "RME", then <RMETransferPanel …/>
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// components/clinical/diagnosis/steps/TherapyStep.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TherapyStep, therapySummary } from './TherapyStep';
import type { DiagnosisPageViewModel } from '../diagnosisViewModel';

function vm(): DiagnosisPageViewModel {
  const med = (key: string, name: string, isSelected: boolean, sourceLabel = 'PROPOSAL') => ({ key, name, doseLine: '1x1 | Sesudah makan | 30 hari', rationale: '', safetyLabel: 'safe', contraindications: [], isSelected, sourceLabel });
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: 'Amlodipin 10 mg', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: 'I10 - Hipertensi', confidenceLabel: 'High confidence', safestNextAction: '', primaryCtaLabel: '', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: [] },
    candidates: [],
    selectedDiagnoses: [{ key: 'suggested:1:I10', displayLabel: 'I10 - Hipertensi', sourceLabel: 'Rekomendasi sistem' }],
    therapy: { state: 'ready', hasDiagnosisBasis: true, selectedDiagnosisCount: 1, selectedMedicationCount: 1, candidateMedicationCount: 3, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: 'I10', groups: [{ diagnosisKey: 'suggested:1:I10', diagnosisLabel: 'I10 - Hipertensi', sourceLabel: 'Rekomendasi sistem', statusText: 'ready', detailItems: [], medications: [med('amlodipin', 'Amlodipin 10 mg', true), med('kandesartan', 'Kandesartan 8 mg', false), med('manual-1', 'Vitamin B', false, 'MANUAL')] }] },
    transfer: { state: 'idle', diagnosisReady: true, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: 'I10', medicationSelectionLabel: '1/3', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
  };
}

const handlers = () => ({ onRemoveDiagnosis: vi.fn(), onSelectAllMedications: vi.fn(), onClearMedications: vi.fn(), onToggleManualMedicationInput: vi.fn(), onManualMedicationDraftChange: vi.fn(), onAddManualMedication: vi.fn(), onToggleMedication: vi.fn(), onRemoveManualMedication: vi.fn() });

describe('TherapyStep', () => {
  it('asks "Terapi apa?" and shows one row per medication with one status word', () => {
    const h = handlers();
    render(<TherapyStep viewModel={vm()} showManualMedicationInput={false} manualMedicationDraft={{ nama_obat: '', dosis: '', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' }} manualMedicationOptions={['Sesudah makan']} {...h} />);
    expect(screen.getByRole('heading', { name: 'Terapi apa?' })).toBeInTheDocument();
    const rows = screen.getAllByTestId('dx-flow-med');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Amlodipin 10 mg');
    expect(rows[0]).toHaveTextContent('lanjut');
    expect(rows[1]).toHaveTextContent('usulan');
    expect(rows[2]).toHaveTextContent('manual');
    fireEvent.click(rows[1]);
    expect(h.onToggleMedication).toHaveBeenCalledWith('kandesartan');
    expect(screen.queryByText(/Hanya untuk ditinjau/)).toBeNull();
  });

  it('opens the manual form from "+ Obat" and summarises selected medications', () => {
    const h = handlers();
    render(<TherapyStep viewModel={vm()} showManualMedicationInput={false} manualMedicationDraft={{ nama_obat: '', dosis: '', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' }} manualMedicationOptions={['Sesudah makan']} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Obat' }));
    expect(h.onToggleManualMedicationInput).toHaveBeenCalledTimes(1);
    expect(therapySummary(vm())).toBe('Amlodipin 10 mg');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/steps/TherapyStep.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

`TherapyStep.tsx`: heading "Terapi apa?"; `viewModel.selectedDiagnoses` as one `dx-flow-muted` line "Basis: <labels>" with a "hapus" link per diagnosis (calls `onRemoveDiagnosis`); rows: for each group medication a `<div role="button" tabIndex={0} className="dx-flow-row" data-testid="dx-flow-med" aria-pressed={isSelected} onClick={() => onToggleMedication(key)} onKeyDown={Enter/Space → same}>` (a `div`, not a `button`, because the manual rows contain a nested "hapus" button) with name + dose left and the status word right: `'manual'` when `sourceLabel === 'MANUAL'`, else `'lanjut'` when the medication name (case-insensitive, first word) appears in `viewModel.context.chronicTherapySummary`, else `isSelected ? 'dipilih' : 'usulan'`; a "hapus" link on manual rows (`onRemoveManualMedication`, `stopPropagation`). Buttons row: "+ Obat" (`onToggleManualMedicationInput`), "Pilih semua", "Reset". Manual form = the existing `ManualMedicationForm` markup moved here. `therapySummary`: selected medication names from all groups, first two joined by ", ", `+N` for the rest, or `'belum ada obat'`.

`RmeStep.tsx`: `<section className="dx-flow-step" aria-label="RME"><h2 className="dx-flow-step__heading">RME</h2><RMETransferPanel …/></section>`; `rmeSummary(vm)` returns `'terkirim'` when `transfer.state === 'success'` else `formatTransferState(transfer.state)`. Until Task 15 the panel still renders its `StagedSection`; `RmeStep` passes it through unchanged.

- [ ] **Step 4: Run tests, token-guard** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis` → PASS; token-guard → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/clinical/diagnosis/steps/TherapyStep.tsx components/clinical/diagnosis/steps/TherapyStep.test.tsx components/clinical/diagnosis/steps/RmeStep.tsx && git commit -m "feat(med-assist): Terapi and RME steps for the step-flow diagnosis page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 15: `DiagnosisStepFlow` orchestrator; switch the page; delete the old workspace

**Files:**
- Create: `components/clinical/diagnosis/DiagnosisStepFlow.tsx`
- Test: `components/clinical/diagnosis/DiagnosisStepFlow.test.tsx`
- Modify: `components/clinical/ClinicalDifferential.tsx` (render `DiagnosisStepFlow`, pass `recurrentOnlyMessage`)
- Modify: `components/clinical/diagnosis/RMETransferPanel.tsx` (replace the `<StagedSection …>` wrapper with a fragment, delete its `SectionHeader`), `RMETransferPanel.test.tsx` (if an assertion queried the section summary "RME Transfer · …", replace it with the same readiness assertion on `.diagnosis-transfer-status` and name it in the commit)
- Delete: `components/clinical/diagnosis/DiagnosisWorkspace.tsx`, `DiagnosisWorkspace.test.tsx`, `DiagnosisProgressStepper.tsx`, `StagedSection.tsx`, `TherapyReviewPanel.tsx` (its markup moved into `TherapyStep.tsx` in Task 14)

**Interfaces:**
- Produces: `<DiagnosisStepFlow {...DiagnosisPageProps} />` with root `data-testid="diagnosis-workspace"` and the same `data-diagnosis-*` attributes as before (other tests read them).

- [ ] **Step 1: Write the failing test**

```tsx
// components/clinical/diagnosis/DiagnosisStepFlow.test.tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DiagnosisStepFlow } from './DiagnosisStepFlow';
import type { DiagnosisPageProps } from './diagnosisPageProps';

// makeViewModel / makeProps: copy the fixtures from the deleted DiagnosisWorkspace.test.tsx
// unchanged (context, primary, evidence, one J06.9 candidate, therapy with one selected
// paracetamol, transfer idle), typed as DiagnosisPageProps.

describe('DiagnosisStepFlow', () => {
  it('shows the safety strip, the finished Temuan as a receipt, Diagnosis active and Terapi/RME as ghosts', () => {
    const vm = makeViewModel({ therapy: { ...makeViewModel().therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 } });
    render(<DiagnosisStepFlow {...makeProps({ viewModel: vm })} />);
    expect(screen.getByTestId('dx-flow-danger')).toHaveTextContent('⚠ 2 tanda bahaya');
    expect(screen.getByTestId('dx-flow-receipt-finding')).toHaveTextContent('✓ Temuan · Demam · Batuk · Sesak');
    expect(screen.getByRole('heading', { name: 'Apa diagnosis utama hari ini?' })).toBeInTheDocument();
    expect(screen.getByTestId('dx-flow-ghost-therapy')).toHaveTextContent('3 · Terapi');
    expect(screen.getByTestId('dx-flow-ghost-rme')).toHaveTextContent('4 · RME');
    expect(screen.queryByRole('heading', { name: 'Terapi apa?' })).toBeNull();
  });

  it('moves the focus to Terapi once a diagnosis is chosen and shows Diagnosis as a receipt', () => {
    const vm = makeViewModel({ therapy: { ...makeViewModel().therapy, selectedMedicationCount: 0 } });
    render(<DiagnosisStepFlow {...makeProps({ viewModel: vm })} />);
    expect(screen.getByTestId('dx-flow-receipt-diagnosis')).toHaveTextContent('✓ Diagnosis · J18.9 - Community Acquired Pneumonia');
    expect(screen.getByRole('heading', { name: 'Terapi apa?' })).toBeInTheDocument();
  });

  it('reopens a finished step from "ubah" and returns to the flow from "selesai"', () => {
    render(<DiagnosisStepFlow {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'ubah Diagnosis' }));
    expect(screen.getByRole('heading', { name: 'Apa diagnosis utama hari ini?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'selesai' }));
    expect(screen.getByRole('heading', { name: 'RME' })).toBeInTheDocument();
  });

  it('keeps Penunjang and Edukasi as one-line links under the active step', () => {
    render(<DiagnosisStepFlow {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Penunjang (1)' }));
    expect(screen.getByText('SpO2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edukasi (1)' }));
    expect(screen.getByText('Review auskultasi paru')).toBeInTheDocument();
  });

  it('shows the danger strip with no triage result (safety never hides)', () => {
    render(<DiagnosisStepFlow {...makeProps({ triage: null })} />);
    expect(screen.getByTestId('dx-flow-danger')).toBeInTheDocument();
  });

  it('keeps one body size and no stepper', () => {
    const css = readFileSync(resolve(__dirname, '../../../entrypoints/sidepanel/style.css'), 'utf-8');
    const block = css.slice(css.indexOf('Diagnosis page step flow'));
    expect(block).toMatch(/\.dx-flow \{[^}]*font-size: 13px/);
    render(<DiagnosisStepFlow {...makeProps()} />);
    expect(document.querySelector('.diagnosis-stepper')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisStepFlow.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/clinical/diagnosis/DiagnosisStepFlow.tsx
import { useEffect, useState } from 'react';

import { getVisibleSafetyItems, getVisibleExamItems, cleanClinicalSummary } from './diagnosisDisplayUtils';
import type { DiagnosisPageProps } from './diagnosisPageProps';
import { resolveActiveStep, resolveDiagnosisSteps, type DiagnosisStepKey } from './diagnosisSteps';
import { SafetyStrip } from './SafetyStrip';
import { StepGhost, StepReceipt } from './StepReceipt';
import { DiagnosisStep, diagnosisSummary } from './steps/DiagnosisStep';
import { FindingStep, findingSummary } from './steps/FindingStep';
import { RmeStep, rmeSummary } from './steps/RmeStep';
import { TherapyStep, therapySummary } from './steps/TherapyStep';
import { buildClinicalSignals } from './diagnosisDisplayUtils';

export function DiagnosisStepFlow(props: DiagnosisPageProps) {
  const { viewModel, phase, triage } = props;
  const steps = resolveDiagnosisSteps(phase, viewModel);
  const [reopened, setReopened] = useState<DiagnosisStepKey | null>(null);
  const active = resolveActiveStep(steps, reopened);
  const safetyItems = getVisibleSafetyItems(viewModel.evidence.redFlags, viewModel.evidence.doNotMiss);
  const signals = buildClinicalSignals({ complaintSummary: props.complaintSummary, secondaryComplaint: props.secondaryComplaint, allergySummary: viewModel.context.allergySummary, chronicDiagnosisSummary: viewModel.context.chronicDiagnosisSummary });
  const summaries: Record<DiagnosisStepKey, string> = { finding: findingSummary(signals), diagnosis: diagnosisSummary(viewModel), therapy: therapySummary(viewModel), rme: rmeSummary(viewModel) };

  // A reopened step closes itself when the flow moves past it (e.g. the doctor picked a new diagnosis).
  useEffect(() => { setReopened(null); }, [viewModel.therapy.selectedDiagnosisCount, viewModel.therapy.selectedMedicationCount, viewModel.transfer.state]);

  const activeIndex = steps.find((s) => s.key === active)?.index ?? 2;
  return (
    <div className="dx-flow diagnosis-content" data-testid="diagnosis-workspace"
      data-diagnosis-view-state={viewModel.primary.isInsufficient ? 'insufficient' : 'review'}
      data-diagnosis-selected-count={viewModel.therapy.selectedDiagnosisCount}
      data-diagnosis-medication-count={viewModel.transfer.medicationSelectionLabel}
      data-diagnosis-transfer-state={viewModel.transfer.state}>
      <SafetyStrip safetyItems={safetyItems} triage={triage ?? null} />
      {steps.filter((s) => s.done && s.key !== active && s.index < activeIndex).map((s) => (
        <StepReceipt key={s.key} step={s} summary={summaries[s.key]} onReopen={() => setReopened(s.key)} />
      ))}
      {active === 'finding' ? <FindingStep complaintSummary={props.complaintSummary} secondaryComplaint={props.secondaryComplaint} allergySummary={viewModel.context.allergySummary} chronicDiagnosisSummary={viewModel.context.chronicDiagnosisSummary} /> : null}
      {active === 'diagnosis' ? <DiagnosisStep {...props} /> : null}
      {active === 'therapy' ? <TherapyStep {...props} /> : null}
      {active === 'rme' ? <RmeStep {...props} /> : null}
      {reopened ? <button type="button" className="dx-flow-link" onClick={() => setReopened(null)}>selesai</button> : null}
      <SideLinks viewModel={viewModel} />
      {steps.filter((s) => s.index > activeIndex && !s.done).map((s) => <StepGhost key={s.key} step={s} />)}
    </div>
  );
}
```
`SideLinks`: two `dx-flow-link` buttons "Penunjang (N)" (N = `getVisibleExamItems(evidence.missing).length`, hidden when 0 and no safety fallback needed) and "Edukasi (N)" (N = review items not in the exam list, as `EducationSection` computed), each toggling its `dx-flow-list` in place. Receipts are shown only for done steps *before* the active one (the `s.index < activeIndex` filter); while an earlier step is reopened, later done steps are hidden until "selesai", and ghosts are only for not-done later steps.

`ClinicalDifferential.tsx`: import `DiagnosisStepFlow` instead of `DiagnosisWorkspace`; add `recurrentOnlyMessage={suggestions.length === 0 && recurrent.length > 0 ? 'Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut.' : undefined}`.

Delete `DiagnosisWorkspace.tsx`, `DiagnosisWorkspace.test.tsx`, `DiagnosisProgressStepper.tsx`, `StagedSection.tsx`. Migration of the deleted test file's assertions, each named in the commit message: "sections in clinical order" → replaced by the receipt/active/ghost test; "confidence once per card" → dropped (no confidence word on the page; tally line only); "one action per card and evidence in the card" → DiagnosisStep tap + alasan tests; "selected cards marked" → `aria-pressed`; "insufficient R69 unmistakable" → add to `DiagnosisStep.test.tsx`: an R69-only view model renders the "Lengkapi Data Diagnosis" button and no card; "late sections collapsed", "numbers the staged sections", "drops repeated therapy notices", "no repeated exam items in Edukasi" → SideLinks test + TherapyStep notice assertion; "stepper first + skeleton" → skeleton test in DiagnosisStep, stepper assertion removed (component deleted); "aria-busy/aria-live" → keep as an assertion on the DiagnosisStep loading section; "evidence.review via Alasan when insufficient" → SideLinks Edukasi test; triage-section tests → SafetyStrip tests; motion-stylesheet tests F3–F6 → keep the F4/F5/F6 CSS assertions in `DiagnosisStepFlow.test.tsx` (they read `style.css`, which is append-only, so they still hold) and drop F3 (stepper label) with the stepper.

- [ ] **Step 4: Run the whole suite, lint, typecheck, build, token-guard**

Run: `node scripts/pnpm.mjs run test`, `run lint`, `run typecheck`, `run build`; token-guard on `DiagnosisStepFlow.tsx`; safrs-auditor.
Expected: all exit 0; SAFRS R2 (Part 3 touches no R3 path).

- [ ] **Step 5: Commit**

```bash
git add components/clinical/diagnosis/DiagnosisStepFlow.tsx components/clinical/diagnosis/DiagnosisStepFlow.test.tsx components/clinical/diagnosis/steps/DiagnosisStep.test.tsx components/clinical/diagnosis/RMETransferPanel.tsx components/clinical/diagnosis/RMETransferPanel.test.tsx components/clinical/ClinicalDifferential.tsx && git rm -q components/clinical/diagnosis/DiagnosisWorkspace.tsx components/clinical/diagnosis/DiagnosisWorkspace.test.tsx components/clinical/diagnosis/DiagnosisProgressStepper.tsx components/clinical/diagnosis/StagedSection.tsx components/clinical/diagnosis/TherapyReviewPanel.tsx && git commit -m "feat(med-assist): diagnosis page as a step flow: one step at a time, receipts and ghosts

Replaces DiagnosisWorkspace and the progress stepper. Assertions migrated or dropped:
<list every one, as enumerated in the plan's Task 15 step 3>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 16: Close-out: gates, run:check, DECISIONS, HANDOFF

**Files:**
- Modify: `.agents/DECISIONS.md` (entries for Part 2 and Part 3), `.agents/HANDOFF.md` (overwrite)

- [ ] **Step 1: Full gates** — `node scripts/pnpm.mjs run lint && node scripts/pnpm.mjs run typecheck && node scripts/pnpm.mjs run test && node scripts/pnpm.mjs run build && node scripts/pnpm.mjs run run:check` → all exit 0; MIRA repository: `src\.venv\Scripts\python.exe -m pytest assist/host/tests -q` → passed.

- [ ] **Step 2: DECISIONS** — add (newest first): "Recurrent diagnoses from the record are offered first; the doctor promotes them" (threshold, window, chronic list location, audit metadata) and "Diagnosis page is a step flow (form B)" (structure, typography, what replaced the stepper, safety strip rule).

- [ ] **Step 3: HANDOFF** — overwrite with: branch state and commit range; what Chief must run once (`install_host.ps1 -ExtensionId <id>` in the MIRA repository, then reload the extension); live checks (status dot turns green with no manual start; Trajectory then Diagnosis shows the MIRA-tagged list at once; a synthetic patient with three prior I10 visits shows the Kronis card first; one step at a time); verification exit codes; carried items from the previous HANDOFF that are still open.

- [ ] **Step 4: Commit**

```bash
git add .agents/DECISIONS.md .agents/HANDOFF.md && git commit -m "docs(med-assist): record the recurrent-diagnosis and step-flow decisions; hand off

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes (done while writing)

- Spec coverage: 1.1 → T1/T2; 1.2 → T3/T4/T5; 1.3 → T6; 1.4 → T7; 2.1 → T8; 2.2 → T9 (+T15 for the history-only message); 2.3 → T10; 3.1–3.5 → T11–T15; error handling → T3/T4/T6/T9; testing → every task; sequencing → T16.
- Deviations from the spec, all forced by protected files or test infrastructure: (a) recurrent candidates reach `ClinicalDifferential` through a hook over the visit store instead of a prop from the workbench, because `main.tsx` renders `ClinicalDifferential` and is protected; (b) the hash is FNV-1a over canonical JSON instead of SHA-256 (synchronous, no `crypto.subtle` in jsdom); (c) audit metadata goes through `auditLogger.log` because `logSuggestionSelected` lives in an R3 file; (d) `TherapyReviewPanel.tsx` is deleted with the workspace since its content moved into `TherapyStep.tsx`.
- Type consistency: `DiagnosisPageProps` (T11) is what T13–T15 spread; `DiagnosisHistoryView` (T9) is what `DiagnosisStep` (T13) reads; `hashDiagnosisContext` (T6) is used by `mira-prefetch` and `ClinicalDifferential`; `MiraStatus` (T4) is read by `MiraStatusDot` (T5).

