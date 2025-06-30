@echo off
echo.
echo 🔐 Filecoin Backup System - JWT Authentication Test
echo ================================================
echo.

echo 📋 Pre-flight Check:
echo.

REM Check if Docker Desktop is running
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not running
    echo    Please start Docker Desktop and try again
    goto :end
) else (
    echo ✅ Docker is available
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo    Please install Node.js to run tests
    goto :end
) else (
    echo ✅ Node.js is available
)

echo.
echo 🚀 Starting Filecoin Backup System with JWT Authentication...
echo.

REM Start the services
docker-compose up --build -d

echo.
echo ⏳ Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo 🧪 Running JWT Authentication Tests...
echo.

REM Run the JWT test suite
node test-jwt.js

echo.
echo 🌐 System is ready! Access points:
echo ================================
echo.
echo 📊 Dashboard:     http://localhost:3000
echo 🔑 Login Page:    http://localhost:3000/login.html
echo 🛠️  Gateway API:   http://localhost:8080
echo 📈 Health Check:  http://localhost:8080/api/v1/health
echo.
echo 👥 Default Users:
echo   Username: admin   Password: password   Role: admin
echo   Username: user    Password: password   Role: user
echo.
echo 🔧 To stop the system: docker-compose down
echo.

:end
pause
