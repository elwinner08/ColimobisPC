# setup.ps1 - Installation et demarrage de Colimobis
# Idempotent : peut etre relance sans risque.
# Tout est pre-compile : pas besoin d'Internet.

$ErrorActionPreference = "Stop"

# Racine = dossier du script
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

$isFirstRun = $false

# -------------------------------------------------------
# 1. Extraire Node.js portable (si pas deja fait)
# -------------------------------------------------------
$nodeDir = Join-Path $root "node"
$nodeSub = $null

if (Test-Path $nodeDir) {
    $nodeSub = Get-ChildItem -Path $nodeDir -Directory | Select-Object -First 1
}

if (-not $nodeSub) {
    $isFirstRun = $true
    Write-Host "[1/3] Premiere installation : extraction de Node.js ..."
    $nodeZip = Get-ChildItem -Path $root -Filter "node*.zip" | Select-Object -First 1
    if (-not $nodeZip) { Write-Error "Aucun fichier node*.zip trouve dans $root"; exit 1 }

    if (Test-Path $nodeDir) { Remove-Item -Recurse -Force $nodeDir }
    Expand-Archive -Path $nodeZip.FullName -DestinationPath $nodeDir -Force

    $nodeSub = Get-ChildItem -Path $nodeDir -Directory | Select-Object -First 1
    if (-not $nodeSub) { Write-Error "Dossier Node.js introuvable apres extraction"; exit 1 }
} else {
    Write-Host "[1/3] Node.js deja installe."
}

$node = Join-Path $nodeSub.FullName "node.exe"
if (-not (Test-Path $node)) { Write-Error "node.exe introuvable : $node"; exit 1 }

# -------------------------------------------------------
# 1b. Extraire Notepad++ portable avec CSV Lint (si pas deja fait)
# -------------------------------------------------------
$nppDir = Join-Path $root "notepad++"
$nppSub = $null

if (Test-Path $nppDir) {
    $nppSub = Get-ChildItem -Path $nppDir -Directory | Select-Object -First 1
}

if (-not $nppSub) {
    Write-Host "  Extraction de Notepad++ portable (editeur CSV) ..."
    $nppZip = Get-ChildItem -Path $root -Filter "npp-portable*.zip" | Select-Object -First 1
    if ($nppZip) {
        if (Test-Path $nppDir) { Remove-Item -Recurse -Force $nppDir }
        New-Item -ItemType Directory -Path $nppDir | Out-Null
        Expand-Archive -Path $nppZip.FullName -DestinationPath (Join-Path $nppDir "npp") -Force
        $nppSub = Get-ChildItem -Path $nppDir -Directory | Select-Object -First 1
        Write-Host "  Notepad++ portable installe avec le plugin CSV Lint."
    } else {
        Write-Host "  (Notepad++ portable non inclus dans le package, etape ignoree)"
    }
} else {
    Write-Host "  Notepad++ portable deja installe."
}

# -------------------------------------------------------
# 2. Verifier l'integrite du package
# -------------------------------------------------------
Write-Host "[2/3] Verification des fichiers ..."

$wwwDir = Join-Path $root "app\www\browser"
if (-not (Test-Path (Join-Path $wwwDir "index.html"))) {
    Write-Error "Application non trouvee dans app\www\browser\. Le package semble incomplet."
    exit 1
}

$serverJs = Join-Path $root "server\server.js"
if (-not (Test-Path $serverJs)) {
    Write-Error "Serveur non trouve : server\server.js. Le package semble incomplet."
    exit 1
}

$serverModules = Join-Path $root "server\node_modules"
if (-not (Test-Path $serverModules)) {
    Write-Error "Dependances serveur manquantes : server\node_modules\. Le package semble incomplet."
    exit 1
}

# Creer le fichier CSV initial si absent
$dataDir = Join-Path $root "data"
$csvFile = Join-Path $dataDir "regimes.csv"
if (-not (Test-Path $csvFile)) {
    Write-Host "  Creation du fichier CSV initial ..."
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
    $seedCsv = Join-Path $root "app\src\assets\data\regimes.csv"
    if (Test-Path $seedCsv) {
        Copy-Item $seedCsv $csvFile
    } else {
        Set-Content -Path $csvFile -Value "_id;requestNumber;ot;rf;label;state" -Encoding UTF8
    }
}

Write-Host "  Tout est en ordre."

# -------------------------------------------------------
# 3. Demarrer le serveur Colimobis
# -------------------------------------------------------
Write-Host ""
if ($isFirstRun) {
    Write-Host "============================================="
    Write-Host "  Colimobis - Installation terminee !"
    Write-Host "  Pour les prochains lancements, utilisez :"
    Write-Host "  -> start colimobis.bat"
    Write-Host "============================================="
} else {
    Write-Host "============================================="
    Write-Host "  Colimobis - Deja installe"
    Write-Host "  Astuce : utilisez 'start colimobis.bat'"
    Write-Host "  pour les prochains lancements."
    Write-Host "============================================="
}
Write-Host ""
Write-Host "  CSV : $csvFile"
if ($nppSub) {
    Write-Host "  Editeur CSV : edit regimes.bat (Notepad++ + CSV Lint)"
}
Write-Host ""

# -------------------------------------------------------
# 3. Demarrer le serveur Colimobis
# -------------------------------------------------------
Write-Host "[3/3] Demarrage du serveur ..."

# Supprimer l'ancien fichier .port s'il existe
$portFile = Join-Path $root "data\.port"
if (Test-Path $portFile) { Remove-Item -Force $portFile }

# Lancer le serveur en arriere-plan
$serverProcess = Start-Process -FilePath $node -ArgumentList $serverJs -PassThru -NoNewWindow

# Attendre que le fichier .port apparaisse (le serveur l'ecrit au demarrage)
$timeout = 15
$elapsed = 0
while (-not (Test-Path $portFile) -and $elapsed -lt $timeout) {
    Start-Sleep -Milliseconds 500
    $elapsed += 0.5
}

if (Test-Path $portFile) {
    $port = (Get-Content $portFile -Raw).Trim()
    Write-Host ""
    Write-Host "  URL : http://localhost:$port"
    Write-Host ""
    Start-Process "http://localhost:$port"
} else {
    Write-Host ""
    Write-Host "  ATTENTION : Le serveur n'a pas demarre dans les $timeout secondes."
    Write-Host "  Essayez d'ouvrir manuellement http://localhost:8100"
    Write-Host ""
}

# Attendre que le processus serveur se termine (Ctrl+C)
try {
    $serverProcess.WaitForExit()
} catch {
    # L'utilisateur a ferme la fenetre
}
