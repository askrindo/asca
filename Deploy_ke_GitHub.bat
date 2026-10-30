@echo off
setlocal
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\MinGit\cmd;%PATH%"

echo =======================================================
echo   DEPLOY ASKRINDO SMART CREDIT ANALYSIS (ASCA)
echo   Repositori: https://github.com/askrindo/asca
echo =======================================================
echo.

git status
echo.
set /p commit_msg="Masukkan pesan pembaruan (kosongkan jika default): "
if "%commit_msg%"=="" set commit_msg=Pembaruan sistem ASCA (%date% %time%)

git add .
git commit -m "%commit_msg%"
echo.
echo Sedang mengirim pembaruan ke GitHub...
git push origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo =======================================================
    echo   [SUKSES] Pembaruan berhasil di-deploy ke GitHub!
    echo   Website Anda akan otomatis update dalam 30-60 detik.
    echo =======================================================
) else (
    echo.
    echo [INFO] Jika diminta login, masukkan Username GitHub Anda
    echo dan gunakan Personal Access Token (PAT) sebagai password.
)
echo.
pause
