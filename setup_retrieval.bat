@echo off
REM File Retrieval System Setup Script for Windows
REM This script helps you set up and test the file retrieval functionality

echo 🚀 File Retrieval System Setup
echo ================================
echo.

REM Check if Docker is running
echo [INFO] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running

REM Check if Docker Compose is available
echo [INFO] Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install it and try again.
    pause
    exit /b 1
)
echo [SUCCESS] Docker Compose is available

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
pip install requests >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Python dependencies installed
) else (
    echo [WARNING] Failed to install Python dependencies. Please install manually:
    echo   pip install requests
)

REM Start services
echo [INFO] Starting services...
docker-compose up -d

echo [INFO] Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Check if services are running
echo [INFO] Checking service health...

REM Check Gateway
curl -s http://localhost:8080/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Gateway is running (port 8080)
) else (
    echo [ERROR] Gateway is not responding on port 8080
)

REM Check Engine
curl -s http://localhost:9090/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Engine is running (port 9090)
) else (
    echo [ERROR] Engine is not responding on port 9090
)

REM Check PostgreSQL
docker-compose exec -T postgres pg_isready -U filecoin_user >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] PostgreSQL is running
) else (
    echo [ERROR] PostgreSQL is not responding
)

REM Check Redis
docker-compose exec -T redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Redis is running
) else (
    echo [ERROR] Redis is not responding
)

REM Run tests
echo [INFO] Running retrieval system tests...
if exist test_retrieval.py (
    python test_retrieval.py
) else (
    echo [ERROR] test_retrieval.py not found
)

echo.
echo 📚 Usage Information
echo ===================
echo.
echo 🌐 API Endpoints:
echo   Gateway (Port 8080):
echo     GET  /api/v1/health                    - Health check
echo     GET  /api/v1/retrieval/files          - List user files
echo     POST /api/v1/retrieval                - Start retrieval job
echo     GET  /api/v1/retrieval/:id            - Get job status
echo     GET  /api/v1/retrieval/download/:cid  - Download file
echo     GET  /api/v1/retrieval/metadata/:cid  - Get file metadata
echo.
echo   Engine (Port 9090):
echo     GET  /api/v1/health                    - Health check
echo     Same endpoints as Gateway (direct access)
echo.
echo 🔧 Environment Variables:
echo   POSTGRES_URL=postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup
echo   IPFS_GATEWAY=https://ipfs.io
echo   TEMP_DIR=/tmp/engine
echo   OUTPUT_DIR=/app/output
echo.
echo 🧪 Testing:
echo   python test_retrieval.py               - Run test suite
echo.
echo 📖 Documentation:
echo   FILE_RETRIEVAL_IMPLEMENTATION.md        - Complete implementation guide
echo.

echo [SUCCESS] File Retrieval System setup completed!
echo.
echo 🎉 Your file retrieval system is ready!
echo.
echo Next steps:
echo 1. Upload some files using your existing backup system
echo 2. Test file retrieval using the API endpoints
echo 3. Integrate with your frontend application
echo.
echo For more information, see FILE_RETRIEVAL_IMPLEMENTATION.md
echo.

pause 