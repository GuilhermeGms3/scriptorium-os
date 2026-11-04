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
    if ($manifest.baseId) {
        Write-Host 'Transferindo somente o complemento. Livros e arquivos já instalados serão reutilizados.'
    } else {
        Write-Host "Transferindo o acervo completo ($($description.pdfCount) PDFs). Não é necessário importar livro por livro."
    }
    # ADB sync transports binary files without Windows stdin encoding/EOF behavior.
    # Only the authorized shell can enter the temporary directory (mode 0700).
    $staging = (& $Adb -s $Serial shell mktemp -d /data/local/tmp/scriptorium-XXXXXXXX | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $staging -notmatch '^/data/local/tmp/scriptorium-[A-Za-z0-9]{8}$') { throw 'Não foi possível preparar a transferência USB.' }
    try {
        Invoke-AdbChecked @('shell', 'chmod', '700', $staging)
        Invoke-AdbChecked @('push', (Join-Path $kit 'acervo.scriptorium'), "$staging/acervo.part")
        # The Android shell opens the protected file; run-as receives only a binary pipe.
        # Both paths contain exclusively validated generated identifiers, not user input.
        Invoke-AdbChecked @('shell', "cat $staging/acervo.part | run-as org.scriptorium.app dd of=$target.part bs=1048576")
    } finally {
        & $Adb -s $Serial shell rm -f "$staging/acervo.part" 2>$null | Out-Null
        & $Adb -s $Serial shell rmdir $staging 2>$null | Out-Null
    }
    $receivedHash = (& $Adb -s $Serial shell run-as org.scriptorium.app sha256sum "$target.part" | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $receivedHash -notmatch '^([a-fA-F0-9]{64})\s' -or $Matches[1].ToLowerInvariant() -ne $description.packageSha256) { throw 'A cópia no aparelho ficou incompleta ou divergente. Ela não foi entregue ao aplicativo. Confira o cabo USB e execute o instalador novamente; seus dados foram preservados.' }
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
