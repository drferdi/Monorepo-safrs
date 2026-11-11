# Designed and constructed by codieverse+.
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Enable-EmbeddedPythonSite([string]$PythonRoot) {
    $pth = Get-ChildItem -Path $PythonRoot -Filter "python*._pth" | Select-Object -First 1
    if (-not $pth) {
        throw "Embedded Python ._pth file tidak ditemukan."
    }

    $lines = Get-Content $pth.FullName
    $normalized = foreach ($line in $lines) {
        if ($line -match '^\s*#\s*import site\s*$') {
            'import site'
        } else {
            $line
        }
    }

    if ($normalized -notcontains 'Lib\site-packages') {
        $normalized += 'Lib\site-packages'
    }

    Set-Content -Path $pth.FullName -Value $normalized -Encoding UTF8
}

$InstallRoot = (Resolve-Path $InstallRoot).Path
$BootstrapDir = Join-Path $InstallRoot "bootstrap"
$PythonZip = Join-Path $BootstrapDir "python-embed\python-embed.zip"
$GetPipPy = Join-Path $BootstrapDir "python-embed\get-pip.py"
$PythonRoot = Join-Path $InstallRoot "runtime\python"
$PythonExe = Join-Path $PythonRoot "python.exe"
$WheelhouseDir = Join-Path $BootstrapDir "wheelhouse"
$EnvExample = Join-Path $InstallRoot ".env.example"
$EnvFile = Join-Path $InstallRoot ".env"

Write-Step "Preparing embedded Python runtime"
New-Item -ItemType Directory -Force -Path $PythonRoot | Out-Null
Expand-Archive -Path $PythonZip -DestinationPath $PythonRoot -Force
Enable-EmbeddedPythonSite -PythonRoot $PythonRoot

Write-Step "Bootstrapping pip"
& $PythonExe $GetPipPy --no-warn-script-location

Write-Step "Installing SideLab dependencies from wheelhouse"
& $PythonExe -m pip install --no-index --find-links $WheelhouseDir -r (Join-Path $InstallRoot "requirements.txt")

if ((Test-Path $EnvExample) -and (-not (Test-Path $EnvFile))) {
Write-Step "Creating initial .env file"
    Copy-Item -Force $EnvExample $EnvFile
}

Write-Step "Running first-run smoke test"
& (Join-Path $BootstrapDir "first_run.ps1") -InstallRoot $InstallRoot -ModelName "deepseek-v4-flash"

Write-Host "SIDELAB post-install bootstrap completed." -ForegroundColor Green
