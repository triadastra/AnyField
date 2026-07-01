@echo off
setlocal
rem ============================================================
rem  AnyField launcher — double-click to run the app.
rem  Starts the Vite dev server and opens your browser at it.
rem  (WebGPU needs localhost/HTTPS, so the local URL is the one.)
rem ============================================================
title AnyField
cd /d "%~dp0app"

rem Node fresh installs aren't on PATH for already-open shells
where npm >nul 2>nul
if errorlevel 1 set "PATH=%ProgramFiles%\nodejs;%PATH%"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install it from https://nodejs.org and retry.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run - installing dependencies...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting AnyField... ^(close this window to stop it^)
call npm run dev -- --open
pause
