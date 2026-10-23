param([string]$CacheDirectory = "$env:LOCALAPPDATA\Scriptorium\tools\ocr-5.4.0")
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($CacheDirectory)
New-Item -ItemType Directory -Path $root -Force | Out-Null
function Get-Verified([string]$Url, [string]$Name, [string]$Sha256) {
    $path = Join-Path $root $Name
    if (!(Test-Path -LiteralPath $path)) { Invoke-WebRequest -Uri $Url -OutFile $path }
    if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) {
        throw "Checksum divergente: $Name. Nenhum executavel sera iniciado."
    }
    return $path
}
# Portable extraction only: neither installer is executed; no PATH/registry changes.
$bootstrap = Get-Verified 'https://github.com/ip7z/7zip/releases/download/26.05/7zr.exe' '7zr.exe' '9bf582b894dfa665f852d7e9112b02290a1c303c2d95a21fcdc41ffcb03143b7'
$seven = Get-Verified 'https://github.com/ip7z/7zip/releases/download/26.05/7z2605-x64.exe' '7z2605-x64.exe' 'fd99e86f57d8f429ef5ed045bf98315af962e2309b0f1ba87a147a44c71647d0'
$installer = Get-Verified 'https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20240606/tesseract-ocr-w64-setup-5.4.0.20240606.exe' 'tesseract-setup.exe' 'c885fff6998e0608ba4bb8ab51436e1c6775c2bafc2559a19b423e18678b60c9'
$unpacker = Join-Path $root '7zip\7z.exe'
if (!(Test-Path -LiteralPath $unpacker)) {
    & $bootstrap x $seven "-o$(Join-Path $root '7zip')" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao extrair 7-Zip.' }
}
$binary = Join-Path $root 'tesseract\tesseract.exe'
if (!(Test-Path -LiteralPath $binary)) {
    & $unpacker x $installer "-o$(Join-Path $root 'tesseract')" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao extrair Tesseract.' }
}
$revision = '87416418657359cb625c412a48b6e1d6d41c29bd'
$data = Join-Path $root 'tesseract\tessdata'
New-Item -ItemType Directory -Path $data -Force | Out-Null
foreach ($language in @('por','spa','eng','grc','heb')) {
    $path = Join-Path $data "$language.traineddata"
    $cached = Join-Path $root "tessdata\$language.traineddata"
    if (!(Test-Path -LiteralPath $path) -and (Test-Path -LiteralPath $cached)) {
        Copy-Item -LiteralPath $cached -Destination $path
    }
    if (!(Test-Path -LiteralPath $path)) {
        Invoke-WebRequest "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/$revision/$language.traineddata" -OutFile $path
    }
}
& $binary --version
if ($LASTEXITCODE -ne 0) { throw 'Tesseract extraido nao executou.' }
& $binary --tessdata-dir $data --list-langs
if ($LASTEXITCODE -ne 0) { throw 'Modelos OCR indisponiveis.' }
Write-Output "SCRIPTORIUM_TESSERACT=$binary"
Write-Output "TESSDATA_PREFIX=$data"
Write-Output "TESSDATA_REVISION=$revision"
