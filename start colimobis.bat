@echo off
setlocal enabledelayedexpansion
set "ROOT=%~dp0"

rem Trouver le sous-dossier Node portable (node\node-vXX-win-x64)
for /d %%D in ("%ROOT%node\*") do (
  set "NODEDIR=%%~fD"
  goto :foundnode
)

echo Node portable introuvable. Relancez setup.ps1.
pause
exit /b 1

:foundnode
set "PATH=%NODEDIR%;%PATH%"

rem Verifier que l'appli a ete construite
if not exist "%ROOT%app\www\browser\index.html" (
    echo L'application n'a pas encore ete construite.
    echo Lancez setup.ps1 d'abord.
    pause
    exit /b 1
)

echo Demarrage de Colimobis ...
echo Fichier CSV : %ROOT%data\regimes.csv

rem Supprimer l'ancien fichier .port s'il existe
set "PORTFILE=%ROOT%data\.port"
if exist "%PORTFILE%" del /f "%PORTFILE%"

rem Demarrer le serveur Express en arriere-plan
start "" /b node "%ROOT%server\server.js"

rem Attendre que le fichier .port apparaisse (max 15 secondes)
set /a TRIES=0
:waitport
if exist "%PORTFILE%" goto :portfound
if !TRIES! GEQ 30 goto :porttimeout
set /a TRIES+=1
timeout /t 1 /nobreak >nul 2>&1
goto :waitport

:portfound
set /p PORT=<"%PORTFILE%"
echo.
echo   URL : http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%"
goto :running

:porttimeout
echo.
echo   ATTENTION : Le serveur n'a pas demarre dans les 15 secondes.
echo   Essayez d'ouvrir manuellement http://localhost:8100
echo.

:running
echo.
echo   Serveur en cours d'execution. Fermez cette fenetre pour arreter.
echo.

rem Garder la fenetre ouverte tant que le serveur tourne
:keepalive
timeout /t 5 /nobreak >nul 2>&1
tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if %errorlevel%==0 goto :keepalive

echo.
echo   Serveur arrete.
pause
