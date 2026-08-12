# block-secret-output.ps1
# PreToolUse hook (matcher: Read).
# Blocks Droid from reading files that look secret-bearing so their contents
# cannot leak into prompts, transcripts, or responses.
#
# Behavior:
#   - Exit 0 when the target is NOT a secret file (allowed).
#   - Exit 2 (blocking) when the target matches a secret-sensitive pattern.
#   - Never executes the file; never sends data anywhere.
# Disable: set env var SENTRA_HOOKS_DISABLE=1.
#
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File block-secret-output.ps1
# Input: hook JSON on stdin (tool_input.file_path).

$ErrorActionPreference = 'Stop'

if ($env:SENTRA_HOOKS_DISABLE -eq '1') { exit 0 }

$raw = ''
try {
    $raw = [Console]::In.ReadToEnd()
} catch {
    exit 0  # no input -> nothing to block
}

if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

$data = $null
try {
    $data = $raw | ConvertFrom-Json -ErrorAction Stop
} catch {
    exit 0  # unparseable input -> fail open to avoid breaking sessions
}

$target = ''
try {
    if ($null -ne $data.tool_input) {
        $target = [string]$data.tool_input.file_path
    }
} catch {
    $target = ''
}

if ([string]::IsNullOrWhiteSpace($target)) { exit 0 }

# Allowlist: safe template files that must remain readable (they contain no secrets,
# only placeholders). Checked before the block patterns so `.env.example` is not
# caught by the broader `.env($|\.)` rule.
$allowed = @(
    '(^|[\\/])\.env\.example($|\.)',
    '(^|[\\/])\.env\.template($|\.)',
    '(^|[\\/])\.env\.dist($|\.)'
)
$explicitlyAllowed = $false
foreach ($a in $allowed) {
    if ($target -match $a) {
        $explicitlyAllowed = $true
        break
    }
}
if ($explicitlyAllowed) { exit 0 }

# Secret-sensitive path patterns (case-insensitive). Fail-safe: block strong matches.
$patterns = @(
    '(^|[\\/])\.env($|\.)',        # .env, .env.local, .env.*
    '\.pem$',
    '\.p12$',
    '\.pfx$',
    '\.key$',
    '\.keyring$',
    'id_rsa$',
    'id_ed25519$',
    'id_ecdsa$',
    'id_dsa$',
    '(^|[\\/])\.ssh([\\/]|$)',
    'auth\.v2\.key',
    'credentials?\.',
    'secrets?\.',
    'tokens?\.(json|txt|yaml|yml)$'
)

$short = Split-Path -Leaf $target
$blocked = $false
$matchedPattern = ''
foreach ($p in $patterns) {
    if ($target -match $p -or $short -match $p) {
        $blocked = $true
        $matchedPattern = $p
        break
    }
}

if ($blocked) {
    # Blocking/corrective feedback: exit 2 writes the reason to Droid.
    [Console]::Error.WriteLine("Blocked by sentra block-secret-output hook: refusing to read a secret-sensitive file '$target' (matched pattern: $matchedPattern). If this is a false positive, set SENTRA_HOOKS_DISABLE=1 or move the file outside a secret-named path.")
    exit 2
}

exit 0
