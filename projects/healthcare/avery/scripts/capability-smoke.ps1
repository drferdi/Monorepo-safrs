#Requires -Version 5.1
<#
.SYNOPSIS
    Smoke test kapabilitas Avery: jalankan 8 prompt oneshot dan periksa bukti
    pemanggilan tool di state.db.

.DESCRIPTION
    Menjalankan `hermes_cli.main --profile avery -z "<prompt>"` untuk 8
    instrumen berurutan (files, terminal, web, knowledge, memory, skills,
    cron, delegation-jika-dikonfigurasi). Untuk tiap instrumen, skrip mencatat
    epoch UTC sebelum memanggil, lalu memanggil pembantu stdlib
    `smoke_evidence.py` untuk memeriksa state.db dan menghasilkan status
    discoverable/callable/consumed TANPA pernah membaca kolom `content`.

    Hasil ditulis ke docs/evidence/fix04-smoke.json dan ringkasan tabel
    dicetak ke stdout. Tidak pernah menyentuh config.yaml/.env/auth.json/
    cron/jobs.json/memories, tidak me-restart gateway, tidak mengirim pesan
    WhatsApp. Prompt tidak menulis di luar workspace\smoke (dibuat sebelum
    dan dihapus setelah seluruh instrumen selesai, dengan bukti penghapusan).

.PARAMETER Profile
    Nama profil Hermes. Default: avery.

.PARAMETER TimeoutSeconds
    Timeout per prompt oneshot. Default: 240.

.EXAMPLE
    pwsh -NoProfile -File scripts/capability-smoke.ps1
#>
[CmdletBinding()]
param(
    [string] $Profile = 'avery',
    [int]    $TimeoutSeconds = 240
)

$ErrorActionPreference = 'Stop'

# --- Resolusi path ------------------------------------------------------------
$repoRoot = Split-Path $PSScriptRoot -Parent
$profileHome = Join-Path $repoRoot "runtime\hermes-home\profiles\$Profile"
$configPath = Join-Path $profileHome 'config.yaml'
$dbPath = Join-Path $profileHome 'state.db'
$smokeDir = Join-Path $profileHome 'workspace\smoke'
$evidenceOutDir = Join-Path $repoRoot 'docs\evidence'
$evidenceOut = Join-Path $evidenceOutDir 'fix04-smoke.json'
$helperScript = Join-Path $PSScriptRoot 'smoke_evidence.py'
$logPath = Join-Path $profileHome 'logs\agent.log'

if (-not (Test-Path -LiteralPath $configPath)) {
    Write-Error "Profil tidak ditemukan: $profileHome (config.yaml hilang)"
    exit 2
}
if (-not (Test-Path -LiteralPath $dbPath)) {
    Write-Error "state.db tidak ditemukan: $dbPath"
    exit 2
}

# --- Resolusi Python bundled (tidak pernah dari runtime vendored) ------------
$hermesDir = 'C:\Users\drfer\.hermes-web-ui\desktop-runtime\hermes\0.20.4\win-x64\python'
$pyexe = Join-Path $hermesDir 'venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $hermesDir)) {
    Write-Error "Runtime Hermes tidak ditemukan: $hermesDir"
    exit 127
}
if (-not (Test-Path -LiteralPath $pyexe)) {
    Write-Error "Python bundled tidak ditemukan: $pyexe"
    exit 127
}
if (-not (Test-Path -LiteralPath $helperScript)) {
    Write-Error "Pembantu evidence tidak ditemukan: $helperScript"
    exit 2
}

# --- Scratch dir untuk stdout/stderr per-prompt (tidak masuk evidence) -------
$scratchDir = Join-Path $env:TEMP ("avery-smoke-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratchDir -Force | Out-Null

# --- Fungsi util ---------------------------------------------------------------
function Get-CliValue {
    param([Parameter(Mandatory)] [string] $Key)
    Push-Location -LiteralPath $hermesDir
    try {
        $env:HERMES_HOME = $profileHome
        $out = & $pyexe -m hermes_cli.main --profile $Profile config get $Key 2>&1
        $lastLine = $out | Where-Object { $_ -and ($_.ToString().Trim() -ne '') } | Select-Object -Last 1
        if ($null -eq $lastLine) { '' } else { $lastLine.ToString().Trim() }
    } finally {
        Pop-Location
    }
}

function Get-SanitizedToolsSummary {
    Push-Location -LiteralPath $hermesDir
    try {
        $env:HERMES_HOME = $profileHome
        $out = & $pyexe -m hermes_cli.main --profile $Profile tools --summary 2>&1
        ($out | ForEach-Object { ($_.ToString() -replace '\S*@\S+', '<ID>') }) -join "`n"
    } finally {
        Pop-Location
    }
}

function Get-SanitizedLogTail {
    param([int] $Lines = 20)
    if (-not (Test-Path -LiteralPath $logPath)) { return '(logs\agent.log tidak ditemukan)' }
    $tail = Get-Content -LiteralPath $logPath -Tail $Lines -ErrorAction SilentlyContinue
    ($tail | ForEach-Object { ($_.ToString() -replace '\S*@\S+', '<ID>') }) -join "`n"
}

function Invoke-OneshotPrompt {
    param(
        [Parameter(Mandatory)] [string] $Prompt,
        [Parameter(Mandatory)] [string] $Tag
    )

    $stdoutFile = Join-Path $scratchDir "$Tag.stdout.txt"
    $stderrFile = Join-Path $scratchDir "$Tag.stderr.txt"

    $since = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    $env:HERMES_HOME = $profileHome
    $quotedPrompt = '"' + $Prompt + '"'
    $argList = @('-m', 'hermes_cli.main', '--profile', $Profile, '-z', $quotedPrompt)

    $timedOut = $false
    $exitCode = $null
    try {
        $p = Start-Process -FilePath $pyexe -ArgumentList $argList -WorkingDirectory $hermesDir `
            -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
            $timedOut = $true
            try { & taskkill.exe /PID $p.Id /T /F 2>&1 | Out-Null } catch {}
        } else {
            $exitCode = $p.ExitCode
        }
    } finally {
        $sw.Stop()
    }

    [pscustomobject]@{
        Since      = $since
        DurationS  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        TimedOut   = $timedOut
        ExitCode   = $exitCode
    }
}

function Get-Evidence {
    param(
        [Parameter(Mandatory)] [double] $Since,
        [Parameter(Mandatory)] [string] $Expect
    )
    $json = & $pyexe $helperScript --db $dbPath --since $Since --expect $Expect 2>&1
    try {
        $parsed = ($json | Out-String).Trim() | ConvertFrom-Json
        return $parsed
    } catch {
        return [pscustomobject]@{
            discoverable = $false
            callable     = $false
            consumed     = $false
            tools_called = @()
            session_id   = $null
            error        = "gagal parse evidence: $($json -join ' ')"
        }
    }
}

# --- Siapkan workspace\smoke ---------------------------------------------------
if (Test-Path -LiteralPath $smokeDir) {
    Remove-Item -LiteralPath $smokeDir -Recurse -Force
}
New-Item -ItemType Directory -Path $smokeDir -Force | Out-Null

# --- Cek konfigurasi delegation sebelum instrumen 8 ---------------------------
$delegationEnabled = $false
try {
    $delegationValue = Get-CliValue -Key 'delegation.enabled'
    if ($delegationValue -and ($delegationValue -match '(?i)^(true|1|yes)$')) {
        $delegationEnabled = $true
    }
} catch {
    $delegationEnabled = $false
}

# --- Definisi 8 instrumen ------------------------------------------------------
$smokeFile = Join-Path $smokeDir 'hello.txt'

$instruments = @(
    [ordered]@{
        instrument = 'Files'
        prompt_id  = 1
        prompt     = "Buat file $smokeFile berisi 'halo avery', lalu baca kembali dan laporkan isinya."
        expect     = 'write_file,read_file'
    },
    [ordered]@{
        instrument = 'Terminal'
        prompt_id  = 2
        prompt     = 'Jalankan perintah terminal echo smoke-ok dan laporkan keluarannya persis.'
        expect     = 'terminal'
    },
    [ordered]@{
        instrument = 'Web'
        prompt_id  = 3
        prompt     = 'Ambil judul halaman https://example.com dengan web_extract dan laporkan.'
        expect     = 'web_extract,web_search'
    },
    [ordered]@{
        instrument = 'Knowledge'
        prompt_id  = 4
        prompt     = 'Gunakan skill_view untuk membuka skill sentra-knowledge, lalu sebutkan nama satu dokumen kanonik yang terdaftar di dalamnya.'
        expect     = 'skill_view'
    },
    [ordered]@{
        instrument = 'Memory'
        prompt_id  = 5
        prompt     = 'Gunakan tool memory untuk membaca memori yang ada dan laporkan berapa entri yang ada (tanpa menyalin isinya).'
        expect     = 'memory'
    },
    [ordered]@{
        instrument = 'Skills'
        prompt_id  = 6
        prompt     = 'Panggil skills_list dan laporkan jumlah skill yang tersedia.'
        expect     = 'skills_list'
    },
    [ordered]@{
        instrument = 'Cron'
        prompt_id  = 7
        prompt     = 'Gunakan tool cronjob untuk menampilkan daftar job terjadwal dan laporkan jumlahnya. Jangan membuat, mengubah, atau menghapus job.'
        expect     = 'cronjob'
    }
)

# --- Eksekusi instrumen 1-7 -----------------------------------------------------
$results = @()

foreach ($inst in $instruments) {
    Write-Host ''
    Write-Host ("=== [{0}/8] {1} ===" -f $inst.prompt_id, $inst.instrument) -ForegroundColor Cyan

    $run = Invoke-OneshotPrompt -Prompt $inst.prompt -Tag ("prompt{0}" -f $inst.prompt_id)

    if ($run.TimedOut) {
        Write-Host "  TIMEOUT setelah $TimeoutSeconds detik" -ForegroundColor Red
        $results += [pscustomobject]@{
            instrument    = $inst.instrument
            prompt_id     = $inst.prompt_id
            expect        = $inst.expect
            discoverable  = $false
            callable      = $false
            consumed      = $false
            tools_called  = @()
            session_id    = $null
            duration_s    = $run.DurationS
            status        = 'FAIL'
            error         = 'timeout'
        }
        continue
    }

    $evidence = Get-Evidence -Since $run.Since -Expect $inst.expect

    $status = if ($evidence.discoverable -and $evidence.callable -and $evidence.consumed) { 'PASS' } else { 'FAIL' }

    $resultObj = [pscustomobject]@{
        instrument    = $inst.instrument
        prompt_id     = $inst.prompt_id
        expect        = $inst.expect
        discoverable  = [bool]$evidence.discoverable
        callable      = [bool]$evidence.callable
        consumed      = [bool]$evidence.consumed
        tools_called  = @($evidence.tools_called)
        session_id    = $evidence.session_id
        duration_s    = $run.DurationS
        status        = $status
    }
    if ($evidence.PSObject.Properties.Name -contains 'error' -and $evidence.error) {
        $resultObj | Add-Member -NotePropertyName 'error' -NotePropertyValue $evidence.error
    }

    $results += $resultObj

    $color = if ($status -eq 'PASS') { 'Green' } else { 'Red' }
    Write-Host ("  status={0} discoverable={1} callable={2} consumed={3} durasi={4}s" -f `
        $status, $resultObj.discoverable, $resultObj.callable, $resultObj.consumed, $resultObj.duration_s) -ForegroundColor $color

    if ($status -eq 'FAIL') {
        Write-Host '  --- petunjuk (tidak masuk evidence) ---' -ForegroundColor Yellow
        Write-Host ('  tools --summary: ' + (Get-SanitizedToolsSummary)) -ForegroundColor Yellow
        Write-Host '  logs\agent.log (20 baris terakhir, disanitasi):' -ForegroundColor Yellow
        Write-Host (Get-SanitizedLogTail -Lines 20) -ForegroundColor Yellow
    }
}

# --- Instrumen 8: Delegation (kondisional) --------------------------------------
Write-Host ''
Write-Host '=== [8/8] Delegation ===' -ForegroundColor Cyan
if (-not $delegationEnabled) {
    Write-Host '  NOT_CONFIGURED: delegation.enabled tidak diset di config.yaml' -ForegroundColor Yellow
    $results += [pscustomobject]@{
        instrument = 'Delegation'
        prompt_id  = 8
        expect     = 'delegate_task'
        status     = 'NOT_CONFIGURED'
    }
} else {
    $inst8Prompt = "Delegasikan tugas trivial: subagen menjawab 'pong'."
    $run = Invoke-OneshotPrompt -Prompt $inst8Prompt -Tag 'prompt8'

    if ($run.TimedOut) {
        Write-Host "  TIMEOUT setelah $TimeoutSeconds detik" -ForegroundColor Red
        $results += [pscustomobject]@{
            instrument   = 'Delegation'
            prompt_id    = 8
            expect       = 'delegate_task'
            discoverable = $false
            callable     = $false
            consumed     = $false
            tools_called = @()
            session_id   = $null
            duration_s   = $run.DurationS
            status       = 'FAIL'
            error        = 'timeout'
        }
    } else {
        $evidence = Get-Evidence -Since $run.Since -Expect 'delegate_task'
        $status = if ($evidence.discoverable -and $evidence.callable -and $evidence.consumed) { 'PASS' } else { 'FAIL' }
        $resultObj = [pscustomobject]@{
            instrument   = 'Delegation'
            prompt_id    = 8
            expect       = 'delegate_task'
            discoverable = [bool]$evidence.discoverable
            callable     = [bool]$evidence.callable
            consumed     = [bool]$evidence.consumed
            tools_called = @($evidence.tools_called)
            session_id   = $evidence.session_id
            duration_s   = $run.DurationS
            status       = $status
        }
        $results += $resultObj
        $color = if ($status -eq 'PASS') { 'Green' } else { 'Red' }
        Write-Host ("  status={0} discoverable={1} callable={2} consumed={3} durasi={4}s" -f `
            $status, $resultObj.discoverable, $resultObj.callable, $resultObj.consumed, $resultObj.duration_s) -ForegroundColor $color
    }
}

# --- Bersihkan workspace\smoke dan buktikan terhapus ----------------------------
Remove-Item -LiteralPath $smokeDir -Recurse -Force -ErrorAction SilentlyContinue
$smokeDirRemoved = -not (Test-Path -LiteralPath $smokeDir)
Write-Host ''
if ($smokeDirRemoved) {
    Write-Host "workspace\smoke terhapus: TERVERIFIKASI ($smokeDir tidak ada)" -ForegroundColor Green
} else {
    Write-Host "workspace\smoke terhapus: GAGAL ($smokeDir masih ada)" -ForegroundColor Red
}

# --- Bersihkan scratch dir stdout/stderr ---------------------------------------
Remove-Item -LiteralPath $scratchDir -Recurse -Force -ErrorAction SilentlyContinue

# --- Ringkasan + tulis evidence -------------------------------------------------
$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$notConfiguredCount = @($results | Where-Object { $_.status -eq 'NOT_CONFIGURED' }).Count

$summary = [ordered]@{
    pass           = $passCount
    fail           = $failCount
    not_configured = $notConfiguredCount
    ran_at         = (Get-Date).ToUniversalTime().ToString('o')
}

$output = [ordered]@{
    results = $results
    summary = $summary
}

if (-not (Test-Path -LiteralPath $evidenceOutDir)) {
    New-Item -ItemType Directory -Path $evidenceOutDir -Force | Out-Null
}

$json = $output | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($evidenceOut, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host '=== Ringkasan ===' -ForegroundColor Cyan
$results | Select-Object instrument, prompt_id, status, discoverable, callable, consumed, duration_s | Format-Table -AutoSize | Out-String | Write-Host
Write-Host ("PASS={0} FAIL={1} NOT_CONFIGURED={2}" -f $passCount, $failCount, $notConfiguredCount)
Write-Host "Evidence ditulis ke: $evidenceOut"

if ($failCount -gt 0) { exit 1 } else { exit 0 }
