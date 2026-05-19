# build-package.ps1 - Cree un package de deploiement propre pour Colimobis
# Resultat : un dossier "ColimobisInstaller" pret a copier sur cle USB (~40 Mo)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

$outputDir = Join-Path $root "dist\ColimobisInstaller"

# -------------------------------------------------------
# 1. Nettoyage du dossier de sortie
# -------------------------------------------------------
if (Test-Path $outputDir) {
    Write-Host "[1/5] Nettoyage de l'ancien package ..."
    Remove-Item -Recurse -Force $outputDir
}
New-Item -ItemType Directory -Path $outputDir | Out-Null

# -------------------------------------------------------
# 2. Copie des scripts
# -------------------------------------------------------
Write-Host "[2/6] Copie des scripts ..."

Copy-Item (Join-Path $root "setup.ps1") $outputDir
Copy-Item (Join-Path $root "start colimobis.bat") $outputDir
Copy-Item (Join-Path $root "edit regimes.bat") $outputDir

# -------------------------------------------------------
# 3. Copie du zip Node.js portable
# -------------------------------------------------------
Write-Host "[3/6] Copie de Node.js portable ..."

$nodeZip = Get-ChildItem -Path $root -Filter "node*.zip" | Select-Object -First 1
if (-not $nodeZip) {
    Write-Error "Aucun fichier node*.zip trouve dans $root"
    exit 1
}
Copy-Item $nodeZip.FullName $outputDir
Write-Host "  -> $($nodeZip.Name)"

# -------------------------------------------------------
# 4. Copie du serveur Express (avec node_modules)
# -------------------------------------------------------
Write-Host "[4/6] Copie du serveur Express ..."

$serverSrc = Join-Path $root "server"
$serverDst = Join-Path $outputDir "server"
New-Item -ItemType Directory -Path $serverDst | Out-Null

Copy-Item (Join-Path $serverSrc "server.js") $serverDst
Copy-Item (Join-Path $serverSrc "package.json") $serverDst
Copy-Item (Join-Path $serverSrc "package-lock.json") $serverDst
Copy-Item (Join-Path $serverSrc "node_modules") $serverDst -Recurse

# -------------------------------------------------------
# 5. Copie du build Angular + CSV initial
# -------------------------------------------------------
Write-Host "[5/6] Copie du build Angular et des donnees ..."

# Build Angular (app/www/)
$wwwSrc = Join-Path $root "app\www"
$wwwDst = Join-Path $outputDir "app\www"
if (-not (Test-Path (Join-Path $wwwSrc "browser\index.html"))) {
    Write-Error "Build Angular introuvable dans app\www\browser\. Lancez 'ng build' d'abord."
    exit 1
}
New-Item -ItemType Directory -Path (Join-Path $outputDir "app") | Out-Null
Copy-Item $wwwSrc $wwwDst -Recurse

# Assets (CSV source pour le seed initial)
$assetsSrc = Join-Path $root "app\src\assets"
$assetsDst = Join-Path $outputDir "app\src\assets"
if (Test-Path $assetsSrc) {
    New-Item -ItemType Directory -Path (Join-Path $outputDir "app\src") -Force | Out-Null
    Copy-Item $assetsSrc $assetsDst -Recurse
    Write-Host "  -> assets (CSV seed)"
}

# data/regimes.csv
$dataSrc = Join-Path $root "data"
$dataDst = Join-Path $outputDir "data"
New-Item -ItemType Directory -Path $dataDst | Out-Null
$csvSrc = Join-Path $dataSrc "regimes.csv"
if (Test-Path $csvSrc) {
    Copy-Item $csvSrc $dataDst
}

# -------------------------------------------------------
# 6. Copie de Notepad++ portable (avec CSV Lint)
# -------------------------------------------------------
Write-Host "[6/6] Copie de Notepad++ portable ..."

$nppZip = Get-ChildItem -Path $root -Filter "npp-portable*.zip" | Select-Object -First 1
if ($nppZip) {
    Copy-Item $nppZip.FullName $outputDir
    Write-Host "  -> $($nppZip.Name) (editeur CSV avec plugin CSV Lint)"
} else {
    Write-Host "  ATTENTION : aucun fichier npp-portable*.zip trouve. Notepad++ ne sera pas inclus."
}

# -------------------------------------------------------
# Resume
# -------------------------------------------------------
Write-Host ""
Write-Host "============================================="
Write-Host "  Package cree avec succes !"
Write-Host "============================================="
Write-Host ""
Write-Host "  Emplacement : $outputDir"

$size = (Get-ChildItem -Path $outputDir -Recurse | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($size / 1MB, 1)
Write-Host "  Taille      : $sizeMB Mo"

Write-Host ""
Write-Host "  Contenu :"
Write-Host "    - setup.ps1"
Write-Host "    - start colimobis.bat"
Write-Host "    - edit regimes.bat"
Write-Host "    - $($nodeZip.Name)"
if ($nppZip) {
    Write-Host "    - $($nppZip.Name)  (Notepad++ + CSV Lint)"
}
Write-Host "    - server/   (Express + node_modules)"
Write-Host "    - app/www/  (build Angular)"
Write-Host "    - data/     (CSV initial)"
Write-Host ""
Write-Host "  Pour deployer : copiez le dossier"
Write-Host "  'ColimobisInstaller' sur le PC cible."
Write-Host ""
