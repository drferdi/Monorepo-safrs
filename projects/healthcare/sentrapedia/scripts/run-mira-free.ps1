param(
  [Parameter(Mandatory=$true)][string]$MiraRoot,
  [ValidateRange(1024,65535)][int]$Port=8788,
  [switch]$ValidateOnly
)
$ErrorActionPreference='Stop'
$capsuleRoot=Split-Path $PSScriptRoot -Parent
$model='apodex/apodex-1.1-mini:free'
$models=Invoke-RestMethod 'https://openrouter.ai/api/v1/models'
$zdr=Invoke-RestMethod 'https://openrouter.ai/api/v1/endpoints/zdr'
$entry=@($models.data | Where-Object { $_.id -eq $model })
$eligible=@($zdr.data | Where-Object { $_.model_id -eq $model -and $_.supported_parameters -contains 'response_format' -and $_.supported_parameters -contains 'structured_outputs' -and $_.supported_parameters -contains 'temperature' })
if($entry.Count -ne 1 -or $entry[0].pricing.prompt -ne '0' -or $entry[0].pricing.completion -ne '0' -or !$eligible.Count) { throw 'Model gratis dengan keluaran terstruktur dan ZDR belum tersedia. Tidak ada layanan dimulai.' }
$resolvedMira=(Resolve-Path -LiteralPath $MiraRoot).Path
$python=Join-Path $resolvedMira 'src/.venv/Scripts/python.exe'
$appDir=Join-Path $resolvedMira 'assist'
if(!(Test-Path -LiteralPath $python) -or !(Test-Path -LiteralPath (Join-Path $appDir 'service/app.py'))) { throw 'Runtime MIRA yang sudah terpasang belum tersedia. Tidak melakukan instalasi.' }
$dotenvSource=Join-Path $resolvedMira 'src/.venv/Lib/site-packages/dotenv/main.py'
if(!(Test-Path -LiteralPath $dotenvSource) -or !([IO.File]::ReadAllText($dotenvSource).Contains('PYTHON_DOTENV_DISABLED'))) { throw 'Runtime belum mendukung menonaktifkan pembacaan .env luar.' }
if($ValidateOnly) { Write-Output "PASS: $model untuk kedua tahap; struktur/ZDR tersedia; tidak ada inferensi atau perubahan konfigurasi."; exit 0 }
$localEnv=Join-Path $capsuleRoot '.env.local'
$localValues=@{}
if(Test-Path -LiteralPath $localEnv) {
  foreach($line in [IO.File]::ReadAllLines($localEnv)) {
    if($line -match '^\s*(OPENROUTER_API_KEY|MIRA_SERVICE_TOKEN)\s*=\s*(.*?)\s*$') { $localValues[$matches[1]]=$matches[2].Trim('"',"'") }
  }
}
$key=$env:OPENROUTER_API_KEY
if(!$key) { $key=$localValues['OPENROUTER_API_KEY'] }
if(!$key) { throw 'OPENROUTER_API_KEY belum tersedia di environment atau .env.local Sentrapedia. Jangan kirim kunci lewat chat.' }
if(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw 'Port layanan sudah dipakai; tidak menghentikan layanan lain.' }
$token=$localValues['MIRA_SERVICE_TOKEN']
if(!$token) { $token=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) }
$runtimeDir=Join-Path $capsuleRoot '.runtime/mira-free'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$env:OPENROUTER_API_KEY=$key
$env:MIRA_DEV_TOKEN=$token
$env:MIRA_LLM_PROVIDER='openrouter'
$env:MIRA_SERVICE_ENV='development'
$env:MIRA_DATA_POLICY='synthetic-only'
$env:MIRA_PLAN_MODEL=$model
$env:MIRA_PLAN_MODEL_CHOICES=$model
$env:MIRA_ASSESS_MODEL=$model
$env:MIRA_STEP_DEADLINE_S='60'
$env:PYTHON_DOTENV_DISABLED='1'
$env:MIRA_AUDIT_DIR=Join-Path $runtimeDir 'audit'
$env:MIRA_ALLOWED_ORIGINS=''
$serviceProcess=Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','--factory','service.app:create_app','--app-dir',('"'+$appDir+'"'),'--host','127.0.0.1','--port',"$Port") -WorkingDirectory $capsuleRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'stdout.log') -RedirectStandardError (Join-Path $runtimeDir 'stderr.log') -PassThru
$ready=$false
for($attempt=0;$attempt -lt 30;$attempt++) {
  if($serviceProcess.HasExited) { break }
  try { $health=Invoke-RestMethod "http://127.0.0.1:$Port/healthz" -TimeoutSec 1; $ready=$health.status -eq 'ok' -and $health.contractVersion -eq '1' -and $health.version.Contains("+plan=$model+assess=$model"); if($ready) { break } } catch { }
  Start-Sleep -Milliseconds 200
}
if(!$ready) { if(!$serviceProcess.HasExited) { Stop-Process -Id $serviceProcess.Id }; throw 'Layanan gratis belum siap; konfigurasi workspace tidak diubah.' }
$lines=@(if(Test-Path -LiteralPath $localEnv) { [IO.File]::ReadAllLines($localEnv) | Where-Object { $_ -notmatch '^\s*MIRA_SERVICE_(URL|TOKEN)\s*=' } })
$lines+=@("MIRA_SERVICE_URL=http://127.0.0.1:$Port","MIRA_SERVICE_TOKEN=$token")
[IO.File]::WriteAllLines($localEnv,$lines)
$env:MIRA_SERVICE_URL="http://127.0.0.1:$Port"
$env:MIRA_SERVICE_TOKEN=$token
Write-Output "MIRA gratis siap di port $Port, proses $($serviceProcess.Id). Muat ulang server Sentrapedia untuk menerapkan koneksi. Tidak ada inferensi dalam penyiapan ini."
