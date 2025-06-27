@echo off
echo.
echo 🚀 Filecoin Backup System - Automated Setup
echo ═══════════════════════════════════════════════
echo This will automatically generate all secrets and start the system
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Requirements met!
echo.

REM Run the automated environment setup
echo 🔧 Running automated setup wizard...
node setup-env.js

if %errorlevel% neq 0 (
    echo ❌ Setup failed.
    pause
    exit /b 1
)

echo.
echo 🔨 Building and starting services...
echo ⚡ Using optimized Docker build (faster than local install)...

echo 🐳 Starting Docker services...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo ❌ Docker build failed. Trying alternative approach...
    echo 🔄 Cleaning Docker cache...
    docker system prune -f
    echo 🔄 Installing dependencies locally as fallback...
    cd services\blockchain
    echo 📦 Installing blockchain dependencies (this may take 2-3 minutes)...
    npm install --only=production --no-audit --timeout=600000
    cd ..\..\services\frontend  
    echo 📦 Installing frontend dependencies...
    npm install --only=production --no-audit --timeout=600000
    cd ..\..
    echo 🔄 Retrying Docker build with no cache...
    docker-compose build --no-cache
    docker-compose up -d
    if %errorlevel% neq 0 (
        echo ❌ Failed to start services.
        echo 💡 Try running: docker-compose logs
        pause
        exit /b 1
    )
)

echo.
echo ✅ Automated setup complete!
echo.
echo 📊 Your services:
echo    • Web Dashboard: http://localhost:3000
echo    • API Gateway:   http://localhost:8080
echo.
echo 🎯 Opening dashboard in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo 📝 Management commands:
echo    • View logs:     docker-compose logs -f
echo    • Stop:          docker-compose down
echo    • Restart:       docker-compose restart
echo.
pause
