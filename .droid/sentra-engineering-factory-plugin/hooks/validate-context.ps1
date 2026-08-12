# validate-context.ps1
# UserPromptSubmit hook.
# WARN ONLY: when a submitted prompt contains a likely secret pattern, print a
# warning to stderr. It does NOT block input (per decision: warn, do not reject).
#
# Behavior:
#   - Exit 0 always (never blocks the user's input).
#   - Prints a warning to stderr when a secret-like pattern is detected.
#   - Never sends data anywhere; never persists the prompt.
# Disable: set env var SENTRA_HOOKS_DISABLE=1.
#
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File validate-context.ps1
# Input: hook JSON on stdin (prompt).

$ErrorActionPreference = 'Stop'

if ($env:SENTRA_HOOKS_DISABLE -eq '1') { exit 0 }

$raw = ''
try {
    $raw = [Console]::In.ReadToEnd()
} catch {
    exit 0
}
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

$data = $null
try {
    $data = $raw | ConvertFrom-Json -ErrorAction Stop
} catch {
    exit 0
}

$prompt = ''
try {
    $prompt = [string]$data.prompt
} catch {
    $prompt = ''
}
if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

# Likely-secret patterns commonly pasted into chat. Broad set; this hook warns only.
$patterns = @(
    'ghp_[A-Za-z0-9]{20,}',            # GitHub PAT
    'github_pat_[A-Za-z0-9_]{20,}',    # GitHub fine-grained PAT
    'glpat-[A-Za-z0-9\-]{20,}',        # GitLab PAT
    'AKIA[0-9A-Z]{16}',                # AWS access key id
    'sk-[A-Za-z0-9]{20,}',             # OpenAI-style / many SaaS keys
    'sk_live_[A-Za-z0-9]{20,}',        # Stripe keys
    'xox[baprs]-[A-Za-z0-9\-]{10,}',   # Slack tokens
    'AIza[0-9A-Za-z\-_]{30,}',         # Google API key
    'ya29\.[A-Za-z0-9_\-]{20,}',       # Google OAuth token
    'fk-[A-Za-z0-9]{20,}',             # Factory API key
    '-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----',  # private keys
    '(api[_-]?key|secret|token|password)\s*[:=]\s*["''][^"'']{8,}["'']'  # inline assignment
)

$detected = $false
$matchedPattern = ''
foreach ($p in $patterns) {
    if ($prompt -match $p) {
        $detected = $true
        $matchedPattern = $p
        break
    }
}

if ($detected) {
    [Console]::Error.WriteLine("Sentra validate-context: your prompt looks like it may contain a secret (matched pattern: $matchedPattern). Do NOT paste credentials into chat. Prefer environment variables or a secret store. This is a warning only; your input was not blocked.")
}

exit 0
