@echo off
chcp 65001 >nul
title Xoa lich su commit Git
cd /d "%~dp0"

echo ==================================================
echo   XOA TOAN BO LICH SU COMMIT CUA REPO
echo ==================================================
echo Thu muc hien tai: %cd%
echo.

:: Kiem tra Git
git --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Chua cai Git. Tai tai https://git-scm.com
    pause
    exit /b 1
)

:: Kiem tra co phai repo khong
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [LOI] Day khong phai thu muc repo Git.
    echo Hay copy file .bat nay vao thu muc repo roi chay lai.
    pause
    exit /b 1
)

:: Lay ten nhanh hien tai
for /f "delims=" %%i in ('git branch --show-current') do set BRANCH=%%i
if "%BRANCH%"=="" (
    echo [LOI] Khong xac dinh duoc nhanh hien tai.
    pause
    exit /b 1
)

echo Nhanh hien tai : %BRANCH%
echo Remote:
git remote -v
echo.
echo CANH BAO:
echo  - Toan bo lich su commit cu se bi XOA VINH VIEN tren GitHub.
echo  - Cac commit tren GitHub ma may ban chua co cung se bi mat.
echo  - Nen sao luu thu muc repo truoc khi tiep tuc.
echo.
set /p OK=Go YES de tiep tuc, phim khac de huy: 
if /i not "%OK%"=="YES" (
    echo Da huy.
    pause
    exit /b 0
)

echo.
echo [1/5] Tao nhanh moi khong co lich su...
git checkout --orphan temp_clean_branch
if errorlevel 1 goto :loi

echo [2/5] Them toan bo file va commit...
git add -A
git reset -q -- "%~nx0" >nul 2>&1
git commit -m "Initial commit"
if errorlevel 1 goto :loi

echo [3/5] Xoa nhanh cu %BRANCH%...
git branch -D %BRANCH%
if errorlevel 1 goto :loi

echo [4/5] Doi ten nhanh moi thanh %BRANCH%...
git branch -m %BRANCH%
if errorlevel 1 goto :loi

echo [5/5] Day len GitHub (ghi de)...
git push -f origin %BRANCH%
if errorlevel 1 goto :loi

echo.
echo ==================================================
echo   HOAN TAT! Lich su hien tai:
echo ==================================================
git log --oneline
echo.
echo Mo GitHub Desktop va bam "Fetch origin" de cap nhat.
pause
exit /b 0

:loi
echo.
echo [LOI] Co loi xay ra o buoc tren. Hay chup man hinh gui lai de duoc ho tro.
pause
exit /b 1
