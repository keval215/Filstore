@echo off
REM Security scan for Docker images
echo Running Docker security vulnerability scan...

REM Install Trivy if not available (security scanner)
echo Checking for Trivy security scanner...
trivy --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Trivy security scanner...
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
)

REM Scan the blockchain image
echo.
echo Scanning blockchain image for vulnerabilities...
trivy image filstore-blockchain --severity HIGH,CRITICAL --format table

REM Check Docker Compose for security best practices
echo.
echo Running Docker Compose security checks...
docker run --rm -v "%cd%:/project" -w /project clair/clair:latest clairctl analyze --local docker-compose.yml

echo.
echo Security scan complete!
echo Check the output above for any HIGH or CRITICAL vulnerabilities.
pause
