@echo off
:: edit regimes.bat - Ouvre le fichier regimes.csv dans Notepad++ portable
:: avec le plugin CSV Lint pour une edition confortable.

setlocal

:: Racine = dossier du script
set "ROOT=%~dp0"
set "CSV=%ROOT%data\regimes.csv"
set "NPP_DIR="

:: Chercher Notepad++ dans le dossier notepad++
for /d %%d in ("%ROOT%notepad++\*") do (
    if exist "%%d\notepad++.exe" set "NPP_DIR=%%d"
)

if not defined NPP_DIR (
    echo.
    echo  ERREUR : Notepad++ portable introuvable.
    echo  Lancez setup.ps1 d'abord pour l'installer.
    echo.
    pause
    exit /b 1
)

if not exist "%CSV%" (
    echo.
    echo  ERREUR : Fichier CSV introuvable : %CSV%
    echo  Lancez setup.ps1 ou start colimobis.bat d'abord.
    echo.
    pause
    exit /b 1
)

:: Ouvrir le CSV dans Notepad++
start "" "%NPP_DIR%\notepad++.exe" "%CSV%"
