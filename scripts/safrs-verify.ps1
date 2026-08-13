$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

$pythonCommand = $null
foreach ($candidate in @('python', 'python3')) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if (-not $command) {
        continue
    }
    if ($command.Source -like '*\WindowsApps\*') {
        continue
    }
    $version = & $command.Source --version 2>&1
    if ($LASTEXITCODE -eq 0 -and $version -match '^Python 3\.') {
        $pythonCommand = $command
        break
    }
}
if (-not $pythonCommand) {
    throw 'Python 3 is required to run SAFRS verification.'
}

$checks = @(
    'tools/safrs/check_policy.py',
    'tools/safrs/check_docs.py',
    'tools/safrs/check_routing.py',
    'tools/safrs/check_tool_inventory.py',
    'tools/safrs/check_topology.py',
    'tools/safrs/check_actions_pinning.py',
    'tools/safrs/check_automation_policy.py',
    'tools/safrs/check_task_contract.py',
    'tools/safrs/check_task_ownership.py',
    'tools/safrs/check_lifecycle.py',
    'tools/safrs/check_approval_evidence.py',
    'tools/safrs/check_sensitive_changes.py',
    'tools/safrs/check_handoff.py',
    'tests/architecture/test_safrs_topology.py',
    'tests/governance/test_sensitive_classification.py',
    'tests/governance/test_task_ownership.py',
    'tests/governance/test_automation_contracts.py',
    'tests/governance/test_automation_approvals.py'
)

foreach ($check in $checks) {
    & $pythonCommand.Source $check
    if ($LASTEXITCODE -ne 0) {
        throw "SAFRS check failed: $check"
    }
}

Write-Output 'SAFRS local governance verification: PASS'
