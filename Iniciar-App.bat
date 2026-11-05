@echo off
title Ministerio Maranatha - App de Alabanza
echo ========================================================
echo        INICIANDO APP MINISTERIO MARANATHA
echo ========================================================
echo.
echo Abriendo aplicacion en tu navegador...
echo.
start http://localhost:8080
cd /d "%~dp0"
python -m http.server 8080
pause
