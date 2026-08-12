# verify-before-finish.ps1
# Stop hook.
# WARN ONLY and NON-BLOCKING: reminds Droid to verify before declaring done.
# It NEVER blocks session end and NEVER runs commands or sends data anywhere.
#
# Behavior:
#   - Exit 0 always (non-blocking; session always finishes normally).
#   - Optionally appends a one-line, non-sensitive session summary to a local
#     log file ONLY when the env var SENTRA_VERIFY_LOG is set to a writable path.
#   - If SENTRA or repo-guidance asks for verification, echoes guidance to stderr.
# Disable: set env var SENTRA_HOOKS_DISABLE=1.
#
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File verify-before-finish.ps1
# Input: hook JSON on stdin (stop_hook_active, tool_execution_count, elapsed_time).

$ErrorActionPreference = 'Stop'

if ($env:SENTRA_HOOKS_DISABLE -eq '1') { exit 0 }

$raw = ''
try {
    $raw = [Console]::In.ReadToEnd()
} catch {
    exit 0
}

# Non-sensitive log capture (opt-in only).
$logPath = $env:SENTRA_VERIFY_LOG
if (-not [string]::IsNullOrWhiteSpace($logPath) -and -not [string]::IsNullOrWhiteSpace($raw)) {
    try {
        $line = "{0}`tstop`tlen={1}" -f ([DateTime]::UtcNow.ToString('o'), $raw.Length)
        Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8 -ErrorAction Stop
    } catch {
        # Logging is best-effort; never fail the session over logging.
    }
}

# Remind to verify before finishing (non-blocking).
[Console]::Error.WriteLine("Sentra verify-before-finish: if this turn made changes, make sure you ran the relevant verification (test-and-verify) with evidence before declaring done. This is a reminder only.")

exit 0
