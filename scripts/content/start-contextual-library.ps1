param(
    [string]$Workspace = 'data/workspace/workspace.sqlite3',
    [string]$ReuseBackup,
    [switch]$Publish,
    [switch]$RetryFailed
)
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$database = (Resolve-Path -LiteralPath (Join-Path $repository $Workspace)).Path
if ($Publish -and !$ReuseBackup) { throw 'Publicação exige -ReuseBackup; não criamos backups pesados.' }
$queueDirectory = Join-Path (Split-Path -Parent $database) 'contextual-library-queue'
if (!(Test-Path -LiteralPath (Join-Path $queueDirectory 'queue.json'))) { throw 'Planeje a fila antes de iniciar.' }
$node = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$arguments = @('--import','tsx','scripts/content/contextual-library-queue.ts','run',('"{0}"' -f $database))
if ($Publish) {
    $backup = (Resolve-Path -LiteralPath (Join-Path $repository $ReuseBackup)).Path
    $arguments += @('--publish','--reuse-backup',('"{0}"' -f $backup))
}
if ($RetryFailed) { $arguments += '--retry-failed' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$job = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $repository -WindowStyle Hidden -RedirectStandardOutput (Join-Path $queueDirectory "worker-$stamp.log") -RedirectStandardError (Join-Path $queueDirectory "worker-$stamp.error.log") -PassThru
[pscustomobject]@{Pid=$job.Id; Directory=$queueDirectory; Publishing=[bool]$Publish}
