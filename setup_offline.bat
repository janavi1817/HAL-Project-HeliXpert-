@echo off
title HeliXpert - Offline Setup
color 0B

echo.
echo ===============================================
echo    HELIXPERT - OFFLINE SETUP WIZARD
echo    Installing Dependencies and Datasets
echo ===============================================
echo.

:: Check Python
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
python --version
echo.

:: Check Node.js
echo [2/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found
    echo Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo.

:: Install Python Dependencies
echo [3/6] Installing Python dependencies...
echo This may take a few minutes...
python -m pip install --upgrade pip
pip install fastapi uvicorn pandas sqlite3 h5py numpy pydantic requests python-multipart
if errorlevel 1 (
    echo [WARNING] Some Python packages failed to install
    echo You may need to install them manually
)
echo.

:: Install Frontend Dependencies
echo [4/6] Installing Frontend dependencies...
cd HeliXpert
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        cd ..
        pause
        exit /b 1
    )
) else (
    echo npm packages already installed
)
cd ..
echo.

:: Create directories
echo [5/6] Creating required directories...
if not exist "data\database" mkdir data\database
if not exist "data\documents" mkdir data\documents
if not exist "data\metadata" mkdir data\metadata
if not exist "data\processed" mkdir data\processed
if not exist "data\vectorstore" mkdir data\vectorstore
if not exist "models\llm" mkdir models\llm
if not exist "models\vision" mkdir models\vision
if not exist "models\embeddings" mkdir models\embeddings
if not exist "logs" mkdir logs
echo Directories created.
echo.

:: Run data ingestion
echo [6/6] Importing datasets into SQLite...
python backend\ingestion.py
if errorlevel 1 (
    echo [WARNING] Dataset ingestion had some errors
    echo Check that dataset files exist in data/raw/
) else (
    echo [OK] Datasets imported successfully
)
echo.

echo ===============================================
echo    SETUP COMPLETE!
echo ===============================================
echo.
echo Next steps:
echo 1. Run start_helixpert.bat to launch the application
echo 2. Access HeliXpert at http://localhost:3000
echo 3. (Optional) Install Ollama for enhanced AI features
echo.
echo For offline AI (optional):
echo - Download Ollama from https://ollama.ai
echo - Run: ollama pull llama3:8b
echo - Configure in HeliXpert Settings
echo.
echo The application works without Ollama using
echo rule-based SQL query engine.
echo.
pause
