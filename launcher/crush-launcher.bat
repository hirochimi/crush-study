@echo off
REM Crush Launcher - Batch wrapper for PowerShell launcher
REM This launches the PowerShell script with proper execution policy

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%crush-launcher.ps1"
set "CRUSH_EXE=C:\opt\l-llm\crush-study\crush.exe"

REM Check if crush.exe exists
if not exist "%CRUSH_EXE%" (
    echo Error: crush.exe not found at %CRUSH_EXE%
    echo Please build crush first: go build -o crush.exe .
    pause
    exit /b 1
)

REM Launch PowerShell script with bypass execution policy
start /max powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

REM Keep window open if there was an error
if errorlevel 1 (
    echo.
    echo Launcher exited with error.
    pause
)