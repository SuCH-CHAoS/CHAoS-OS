@echo off
setlocal EnableExtensions

rem Run this file directly from Explorer or a terminal. The PowerShell helper handles
rem JSON validation and hidden password input while this launcher keeps it easy to start.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-website-backup.ps1"
set "exitCode=%ERRORLEVEL%"

echo.
if not "%exitCode%"=="0" (
  echo Restore did not complete. Read the message above and try again.
) else (
  echo Restore complete.
)
pause
exit /b %exitCode%
