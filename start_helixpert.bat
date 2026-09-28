@echo off
title HeliXpert - Starting Application
color 0A

echo.
echo ===============================================
echo    HELIXPERT - HELICOPTER INTELLIGENCE
echo    Starting Backend and Frontend Servers
echo ===============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 16+ and try again
    pause
    exit /b 1
)

echo [OK] Python found
echo [OK] Node.js found
echo.

:: Start Backend Server
echo [1/2] Starting FastAPI Backend Server on port 8000...
start "HeliXpert Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

:: Start Frontend Server
echo [2/2] Starting React Frontend Server on port 3000...
start "HeliXpert Frontend" cmd /k "cd /d %~dp0HeliXpert && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ===============================================
echo    HELIXPERT STARTED SUCCESSFULLY
echo ===============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to open HeliXpert in browser...
pause >nul

:: Open browser
start http://localhost:3000

echo.
echo HeliXpert is running!
echo Close the terminal windows to stop the servers.
echo.
pause
