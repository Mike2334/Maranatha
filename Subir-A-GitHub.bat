@echo off
title Publicar en GitHub - Maranatha
echo ========================================================
echo        SUBIR APP MARANATHA A TU GITHUB
echo ========================================================
echo.
echo 1. Entra a https://github.com/new
echo 2. Crea un repositorio (ejemplo: maranatha-app)
echo 3. Copia el enlace del repositorio.
echo.
set /p REPO_URL="Pega aqui la URL de tu repositorio de GitHub: "

if "%REPO_URL%"=="" (
    echo No ingresaste ninguna URL. Cancelando...
    pause
    exit /b
)

cd /d "%~dp0"
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Subiendo archivos a GitHub...
git push -u origin main

echo.
echo ========================================================
echo Listo! Ahora ve a tu repositorio en GitHub:
echo Settings ^> Pages ^> En "Branch" elige "main" y dale Save.
echo ========================================================
pause
