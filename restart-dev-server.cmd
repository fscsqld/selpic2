@echo off
chcp 65001 >nul
echo ========================================
echo  Next.js Dev Server Restart
echo ========================================
echo.

echo [1/3] Stopping Node processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo       Node processes stopped.
) else (
    echo       No Node process found or already stopped.
)
echo.

echo [2/3] Waiting 3 seconds...
timeout /t 3 /nobreak >nul
echo.

echo [3/3] Starting dev server (port 3000)...
echo       Press Ctrl+C to stop the server.
echo.
cd /d "%~dp0"
npm run dev

pause
