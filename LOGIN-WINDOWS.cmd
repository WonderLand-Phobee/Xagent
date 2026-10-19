@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Please install Node.js 24 LTS from https://nodejs.org/ then reopen this file.
  pause
  exit /b 1
)
echo Preparing the login browser. First run may take a few minutes.
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
call npx playwright install chromium
if errorlevel 1 goto failed
node scripts/login-windows.mjs
if errorlevel 1 goto failed
pause
exit /b 0
:failed
echo Setup or login export failed. Do not share any login file or secret.
pause
exit /b 1
