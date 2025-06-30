# Quick Start Guide

This guide provides the fastest way to get Filstore up and running with automated setup.

## 🚀 Super Quick Start (Fully Automated)

### Windows Users - One-Click Setup
```batch
# Complete automated setup (recommended)
quick-setup.bat
```

This will:
- ✅ Check requirements (Docker, Node.js)
- ✅ Generate secure environment automatically
- ✅ Build and start all services
- ✅ Open dashboard in browser

### Linux/Mac Users - Two Commands
```bash
# 1. Generate secure environment
node setup-env.js

# 2. Start services
docker-compose up --build -d
```

## 🔧 Manual Setup Process

### Step 1: Environment Generation
```bash
# Interactive setup wizard (generates all secrets)
node setup-env.js
```

The wizard will ask:
- Filecoin network (testnet/mainnet)
- IPFS provider preference
- Security configurations

### Step 2: Start Services
```bash
# Build and start all services
docker-compose up --build -d

# Or start with logs visible
docker-compose up --build
```

## 📝 Alternative Quick Commands

### Complete Setup Commands
```batch
REM Windows batch commands
REM Generate environment
node setup-env.js

REM Start services
docker-compose up --build -d

REM Open dashboard
start http://localhost:3000
```

```bash
# Linux/Mac shell commands
# Generate environment
node setup-env.js

# Start services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Environment Regeneration
```bash
# Regenerate environment (if needed)
node setup-env.js

# Or overwrite existing
rm .env
node setup-env.js
```

## ⚡ Speed Optimization Commands

### Fast Docker Build
```bash
# Use Docker BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose up --build -d

# Parallel build
docker-compose build --parallel
```

### Selective Service Start
```bash
# Start core services only
docker-compose up -d postgres redis

# Then start application services
docker-compose up -d gateway engine blockchain

# Finally start frontend
docker-compose up -d frontend
```

## 🛑 Stop and Management Commands

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (caution: deletes data)
docker-compose down -v

# Stop specific service
docker-compose stop gateway
```

### Service Management Scripts

#### Windows Batch Scripts

**restart.bat:**
```batch
@echo off
echo Restarting Filstore services...
docker-compose restart
echo Services restarted!
docker-compose ps
pause
```

**logs.bat:**
```batch
@echo off
echo Select service logs:
echo 1. All services
echo 2. Gateway
echo 3. Engine  
echo 4. Blockchain
echo 5. Frontend
set /p choice="Enter choice (1-5): "

if %choice%==1 docker-compose logs -f
if %choice%==2 docker-compose logs -f gateway
if %choice%==3 docker-compose logs -f engine
if %choice%==4 docker-compose logs -f blockchain
if %choice%==5 docker-compose logs -f frontend
```

**update.bat:**
```batch
@echo off
echo Updating Filstore...
docker-compose down
docker-compose pull
docker-compose up --build -d
echo Update complete!
docker-compose ps
pause
```

#### Linux/Mac Shell Scripts

**restart.sh:**
```bash
#!/bin/bash
echo "Restarting Filstore services..."
docker-compose restart
echo "Services restarted!"
docker-compose ps
```

**logs.sh:**
```bash
#!/bin/bash
echo "Select service logs:"
echo "1. All services"
echo "2. Gateway"
echo "3. Engine"
echo "4. Blockchain" 
echo "5. Frontend"
read -p "Enter choice (1-5): " choice

case $choice in
    1) docker-compose logs -f ;;
    2) docker-compose logs -f gateway ;;
    3) docker-compose logs -f engine ;;
    4) docker-compose logs -f blockchain ;;
    5) docker-compose logs -f frontend ;;
esac
```

## 🔧 Advanced Setup Options

### Custom Environment Variables
```bash
# Generate with custom settings
FILECOIN_NETWORK=mainnet node setup-env.js

# Skip interactive prompts (use defaults)
SKIP_PROMPTS=true node setup-env.js
```

### Development Mode
```bash
# Generate development environment
NODE_ENV=development node setup-env.js

# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Production Setup
```bash
# Generate production environment
NODE_ENV=production node setup-env.js

# Start with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔍 Verification Commands

### Service Health Check
```bash
# Check all services
curl -s http://localhost:8080/health && echo " Gateway OK"
curl -s http://localhost:9090/health && echo " Engine OK"
curl -s http://localhost:3001/health && echo " Blockchain OK"
curl -s http://localhost:3000 && echo " Frontend OK"
```

### Environment Verification
```bash
# Check environment file
cat .env | grep -E "(JWT_SECRET|ENCRYPTION_KEY|FILECOIN_NETWORK)"

# Verify Docker services
docker-compose ps
docker-compose logs --tail=10
```

### Performance Check
```bash
# Resource usage
docker stats --no-stream

# Service response times
time curl -s http://localhost:8080/health
time curl -s http://localhost:9090/health
```

## 🐛 Quick Troubleshooting

### Environment Issues
```bash
# Regenerate environment
rm .env
node setup-env.js

# Check Node.js version
node --version  # Should be 16+
```

### Docker Issues
```bash
# Clean Docker cache
docker system prune -a -f

# Rebuild without cache
docker-compose build --no-cache

# Check Docker daemon
docker info
```

### Port Conflicts
```bash
# Windows - Check ports
netstat -ano | findstr :8080
netstat -ano | findstr :9090

# Linux/Mac - Check ports  
lsof -i :8080
lsof -i :9090
```

### Permission Issues (Linux/Mac)
```bash
# Fix data directory permissions
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data

# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

## 🎯 Quick Access URLs

After setup, access your services:

- **Main Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **File Engine**: http://localhost:9090  
- **Blockchain API**: http://localhost:3001
- **Database Admin**: http://localhost:5432 (PostgreSQL)
- **Cache Admin**: http://localhost:6379 (Redis)

## 📱 Mobile/Remote Access

Find your machine's IP address:
```bash
# Windows
ipconfig | findstr IPv4

# Linux/Mac
ip addr show | grep inet
```

Then access using: `http://YOUR_IP:3000`

---

**🎉 You're ready to go!** The automated setup handles all the complex configuration for you.
