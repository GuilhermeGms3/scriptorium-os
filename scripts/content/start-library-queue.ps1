param([string]$Workspace = 'data/workspace/workspace.sqlite3', [switch]$RetryFailed)
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$databasePath = (Resolve-Path -LiteralPath (Join-Path $repository $Workspace)).Path
$logDirectory = Join-Path (Split-Path -Parent $databasePath) 'library-import-queue'
if (-not (Test-Path -LiteralPath (Join-Path $logDirectory 'queue.json'))) {
    throw 'Crie a fila com library:enqueue antes de iniciar.'
}
$nodeExecutable = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputLog = Join-Path $logDirectory "worker-$runStamp.log"
$errorLog = Join-Path $logDirectory "worker-$runStamp.error.log"
$workerArguments = @('--import', 'tsx', 'scripts/content/process-library-queue.ts', 'run', ('"{0}"' -f $databasePath), '--wait')
if ($RetryFailed) { $workerArguments += '--retry-failed' }
$worker = Start-Process -FilePath $nodeExecutable -ArgumentList $workerArguments -WorkingDirectory $repository -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru
[pscustomobject]@{ Pid = $worker.Id; OutputLog = $outputLog; ErrorLog = $errorLog }
