param(
    [string]$Workspace = 'data/workspace/workspace.sqlite3',
    [string]$Staging = 'data/workspace/ocr-recovery-validated-20261023',
    [ValidateRange(1,4)][int]$Workers = 4,
    [switch]$Foreground,
    [switch]$Sample
)
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$workspacePath = if ([IO.Path]::IsPathRooted($Workspace)) { $Workspace } else { Join-Path $repository $Workspace }
$stagingPath = if ([IO.Path]::IsPathRooted($Staging)) { $Staging } else { Join-Path $repository $Staging }
$database = (Resolve-Path -LiteralPath $workspacePath).Path
$destination = [IO.Path]::GetFullPath($stagingPath)
$tools = Join-Path $env:LOCALAPPDATA 'Scriptorium\tools\ocr-5.4.0'
$env:SCRIPTORIUM_TESSERACT = Join-Path $tools 'tesseract\tesseract.exe'
$env:TESSDATA_PREFIX = Join-Path $tools 'tesseract\tessdata'
$env:SCRIPTORIUM_TESSDATA_REVISION = '87416418657359cb625c412a48b6e1d6d41c29bd'
$env:SCRIPTORIUM_PDFTOPPM = (Get-Command pdftoppm -CommandType Application | Select-Object -First 1).Source
$env:OMP_THREAD_LIMIT = '2'
if (!(Test-Path -LiteralPath $env:SCRIPTORIUM_TESSERACT)) { throw 'Execute setup-ocr-tools.ps1 primeiro.' }
if (!(Test-Path -LiteralPath (Join-Path $env:TESSDATA_PREFIX 'configs\tsv'))) { throw 'Configuracao TSV do Tesseract ausente.' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
if (Test-Path -LiteralPath (Join-Path $destination 'worker.lock')) {
    throw 'Ja existe um worker/lock neste staging. Confira o processo; nenhum lock sera removido.'
}
if (!$Foreground) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outputLog = Join-Path $destination "worker-$stamp.log"
    $errorLog = Join-Path $destination "worker-$stamp.error.log"
    $shell = (Get-Process -Id $PID).Path
    $arguments = @('-NoProfile','-File',('"{0}"' -f $PSCommandPath),'-Foreground','-Workspace',('"{0}"' -f $Workspace),'-Staging',('"{0}"' -f $Staging),'-Workers',$Workers)
    if ($Sample) { $arguments += '-Sample' }
    $worker = Start-Process -FilePath $shell -ArgumentList $arguments -WorkingDirectory $repository -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru
    [pscustomobject]@{Pid=$worker.Id; OutputLog=$outputLog; ErrorLog=$errorLog}
    return
}
$python = Join-Path $repository 'services\semantic-engine\.venv\Scripts\python.exe'
$ocrArguments = @('-m','app.ocr_library',$database,$destination,'--workers',$Workers)
if ($Sample) { $ocrArguments += '--sample' }
Push-Location (Join-Path $repository 'services/semantic-engine')
try { & $python @ocrArguments; $ocrExit = $LASTEXITCODE } finally { Pop-Location }
if ($Sample) { exit $ocrExit }
# Successful pages survive OCR exceptions and may be imported; no LLM publication occurs.
Push-Location $repository
try {
    & node --import tsx scripts/content/import-ocr-recovery.ts $database $destination --runtime-stopped --structure
    if ($LASTEXITCODE -ne 0) { throw 'Publicacao pendente. Confira erro/lock; os resultados OCR permanecem no staging.' }
} finally { Pop-Location }
if ($ocrExit -ne 0) { throw 'Paginas prontas incorporadas; ainda ha excecoes OCR no progress.json.' }
