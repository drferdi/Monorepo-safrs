# Designed and constructed by codieverse+.
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot,
    [string]$ModelName = "deepseek-v4-flash"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallRoot = (Resolve-Path $InstallRoot).Path
$PythonExe = Join-Path $InstallRoot "runtime\python\python.exe"
$NotifMp3 = Join-Path $InstallRoot "sounds\notif.mp3"
$StateFile = Join-Path $InstallRoot "install.state.json"
$EnvFile = Join-Path $InstallRoot ".env"

function Import-EnvFile([string]$Path) {
    if (-not (Test-Path $Path)) {
        return
    }

    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

if (-not (Test-Path $PythonExe)) {
    throw "Embedded Python runtime belum siap."
}

Import-EnvFile -Path $EnvFile

$SmokeBackend = "skipped"
if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("DEEPSEEK_API_KEY"))) {
    Write-Host "DEEPSEEK_API_KEY belum diisi. Smoke test DeepSeek dilewati." -ForegroundColor Yellow
} else {
    $SmokeBackend = "deepseek"
    $SmokeScript = @'
from dotenv import load_dotenv
import os
import sys
import requests

load_dotenv(r"__ENV_FILE__")
api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
if not api_key:
    print("DEEPSEEK_API_KEY missing")
    sys.exit(2)

base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
model = os.getenv("DEEPSEEK_MODEL", "__MODEL__")
resp = requests.post(
    f"{base_url}/chat/completions",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
    json={
        "model": model,
        "messages": [
            {"role": "user", "content": "Jawab satu kata: OK"},
        ],
        "stream": False,
    },
    timeout=120,
)
resp.raise_for_status()
data = resp.json()
text = (data["choices"][0]["message"]["content"] or "").strip()
print(text)
sys.exit(0 if text else 1)
'@.Replace("__ENV_FILE__", $EnvFile).Replace("__MODEL__", $ModelName)

    $SmokeScript | & $PythonExe -
    if ($LASTEXITCODE -ne 0) {
        throw "DeepSeek smoke test gagal."
    }
}

$state = [ordered]@{
    ready = $true
    backend = $SmokeBackend
    model = $ModelName
    checked_at = (Get-Date).ToString("s")
    sound_present = (Test-Path $NotifMp3)
}
$state | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8

Write-Host "SIDELAB first-run bootstrap completed." -ForegroundColor Green
