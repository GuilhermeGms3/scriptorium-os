#requires -Version 5.1
[CmdletBinding()]
param([string]$Adb, [string]$Serial, [switch]$NoWait)
$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot
$description = Get-Content -LiteralPath (Join-Path $kit 'delivery.json') -Raw | ConvertFrom-Json
if ($description.format -ne 'scriptorium-private-kit-v1' -or $description.id -notmatch '^[a-f0-9]{64}$') { throw 'Kit incompatível.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($item in @(@{name='Scriptorium.apk'; hash=$description.apkSha256}, @{name='acervo.scriptorium'; hash=$description.packageSha256})) {
    if ($item.hash -notmatch '^[a-f0-9]{64}$' -or (Get-FileHash -LiteralPath (Join-Path $kit $item.name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.hash) { throw "Arquivo incompleto ou alterado: $($item.name). Não instalamos nada." }
}
$zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $kit 'acervo.scriptorium'))
try {
    $entry = $zip.GetEntry('manifest.json')
    if ($null -eq $entry -or $entry.Length -gt 1000000) { throw 'Manifesto inválido.' }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    if ($manifest.id -ne $description.id) { throw 'O pacote não corresponde ao kit.' }
} finally { $zip.Dispose() }
if (-not $Adb) {
    $found = Get-Command adb -ErrorAction SilentlyContinue
    if ($found) { $Adb = $found.Source }
    elseif ($env:ANDROID_HOME -and (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'))) { $Adb = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe' }
    elseif ($env:LOCALAPPDATA -and (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'))) { $Adb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe' }
    else { throw 'ADB não encontrado. Instale as Platform Tools oficiais do Android e informe -Adb <caminho>.' }
}
$Adb = (Resolve-Path -LiteralPath $Adb).Path
if (-not $Serial) {
    $devices = @(& $Adb devices | Where-Object { $_ -match '^([^\s]+)\s+device$' } | ForEach-Object { ($_ -split '\s+')[0] })
    if ($devices.Count -ne 1) { throw 'Conecte e autorize um aparelho por USB, ou indique -Serial. Não habilitamos acesso remoto nem alteramos o aparelho automaticamente.' }
    $Serial = $devices[0]
}
if ($Serial -notmatch '^[A-Za-z0-9_.:-]+$') { throw 'Identificador de aparelho inválido.' }
function Invoke-AdbChecked([string[]]$CommandArguments) {
    & $Adb -s $Serial @CommandArguments
    if ($LASTEXITCODE -ne 0) { throw 'ADB interrompeu a operação. Não desinstale o aplicativo: isso apagaria seus dados. Confira autorização USB, assinatura e espaço disponível.' }
}
Write-Warning 'Salve suas notas antes da atualização. Não feche o aplicativo durante a preparação inicial do acervo. Na primeira instalação completa, reserve 8 GB livres. Atualizações reutilizam os arquivos já instalados.'
Invoke-AdbChecked @('install', '-r', (Join-Path $kit 'Scriptorium.apk'))
Invoke-AdbChecked @('shell', 'am', 'force-stop', 'org.scriptorium.app')
try { $alreadyInstalled = (& $Adb -s $Serial shell run-as org.scriptorium.app cat files/active-content 2>$null | Out-String).Trim() } catch { $alreadyInstalled = '' }
if ($alreadyInstalled -eq $description.id) {
    Write-Host 'Este acervo já está instalado. Atualizando somente o aplicativo, sem reenviar os livros.'
} else {
    Invoke-AdbChecked @('shell', 'run-as', 'org.scriptorium.app', 'mkdir', '-p', 'files/incoming')
    $target = "files/incoming/$($description.id)"
    Write-Host "Transferindo o acervo completo ($($description.pdfCount) PDFs). Não é necessário importar livro por livro."
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $Adb
    # Only a validated serial and a hex identifier enter this constant command. No shell on the PC.
    $start.Arguments = "-s $Serial exec-in run-as org.scriptorium.app dd of=$target.part bs=1048576"
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardInput = $true
    $start.RedirectStandardError = $true
    $start.RedirectStandardOutput = $true
    $start.StandardInputEncoding = New-Object System.Text.UTF8Encoding($false)
    $transfer = New-Object System.Diagnostics.Process
    $transfer.StartInfo = $start
    try {
        if (-not $transfer.Start()) { throw 'Não foi possível iniciar a transferência.' }
        $errors = $transfer.StandardError.ReadToEndAsync()
        $output = $transfer.StandardOutput.ReadToEndAsync()
        $source = [System.IO.File]::OpenRead((Join-Path $kit 'acervo.scriptorium'))
        try { $source.CopyTo($transfer.StandardInput.BaseStream, 1048576) } finally { $source.Dispose(); $transfer.StandardInput.Close() }
        $transfer.WaitForExit()
        $null = $output.Result
        $transferError = $errors.Result
        if ($transfer.ExitCode -ne 0) { throw "A transferência falhou: $transferError. A cópia incompleta não será instalada." }
    } finally { $transfer.Dispose() }
    Invoke-AdbChecked @('shell', 'run-as', 'org.scriptorium.app', 'mv', "$target.part", "$target.scriptorium")
}
Invoke-AdbChecked @('shell', 'am', 'start', '-n', 'org.scriptorium.app/.MainActivity')
if ($NoWait) { Write-Host 'Arquivos entregues. Aguarde a conferência no aplicativo; a instalação do acervo ainda não foi confirmada.'; return }
$deadline = [DateTime]::UtcNow.AddMinutes(30)
while ([DateTime]::UtcNow -lt $deadline) {
    try { $active = (& $Adb -s $Serial shell run-as org.scriptorium.app cat files/active-content 2>$null | Out-String).Trim() } catch { $active = '' }
    if ($active -eq $description.id) { Write-Host 'Acervo confirmado no aparelho. Aplicativo e livros foram entregues juntos; os dados pessoais foram mantidos.'; return }
    Write-Progress -Activity 'Preparando o acervo no Android' -Status 'Aguarde a verificação no aplicativo. A primeira instalação pode demorar.'
    Start-Sleep -Seconds 5
}
throw 'A transferência terminou, mas não foi possível confirmar o acervo ativo em 30 minutos. Veja a mensagem no aplicativo. Não apague seus dados nem desinstale.'
