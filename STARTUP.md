# Filstore Startup Guide

This guide provides detailed instructions for getting Filstore up and running quickly.

## 🚀 Quick Start Methods

### Method 1: Automated Quick Setup (Recommended)

The fastest way to get started:

```batch
# Windows
quick-setup.bat

# Linux/macOS
chmod +x quick-setup.sh
./quick-setup.sh
```

**What it does:**
1. Checks for Docker and Docker Compose
2. Sets up environment variables from templates
3. Initializes wallet configurations
4. Builds all Docker images
5. Starts all services
6. Initializes database schema
7. Runs wallet initialization
8. Performs health checks

**Expected output:**
```
🚀 Starting Filstore Quick Setup...
✅ Docker found
✅ Docker Compose found
📁 Setting up directories...
🔧 Configuring environment...
🏗️  Building Docker images...
🚀 Starting services...
💾 Initializing database...
👛 Setting up wallets...
🩺 Running health checks...
✅ All services are running!

🌐 Access URLs:
   Web Dashboard: http://localhost:3000
   API Gateway:   http://localhost:8080
   Admin Panel:   http://localhost:3001
```

### Method 2: Docker Compose

If you prefer more control:

```bash
# 1. Copy environment file
cp shared/config/dev.env .env

# 2. Build and start services
docker-compose up -d

# 3. Initialize wallets (first time only)
docker exec filstore-blockchain-1 node /app/scripts/docker-init-wallets.js

# 4. Check status
docker-compose ps
```

### Method 3: Manual Development Setup

For development and debugging:

```bash
# 1. Install dependencies
cd services/blockchain && npm install
cd ../frontend && npm install
cd ../..

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Start services manually
cd services/blockchain && npm start &
cd ../frontend && npm start &

# 4. Build and run Go services
cd services/gateway && go build && ./gateway &
cd ../engine && go build && ./engine &
```

## 🔧 Configuration

### Environment Setup

1. **Copy configuration templates:**
   ```bash
   cp shared/config/dev.env .env
   cp data/config/wallet-config.json.template data/config/wallet-config.json
   ```

2. **Edit configuration files:**
   - `.env` - Main environment variables
   - `data/config/wallet-config.json` - Wallet settings
   - `data/config/wallet.env` - Wallet-specific environment

### Key Configuration Options

**Network Selection:**
```env
# Use calibration for development (free testnet)
FILECOIN_NETWORK=calibration

# Use mainnet for production (real FIL required)
FILECOIN_NETWORK=mainnet
```

**Storage Providers:**
```env
# Pinata for IPFS pinning
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Web3.Storage (alternative)
WEB3_STORAGE_TOKEN=your_web3_storage_token
```

**Database:**
```env
DATABASE_URL=postgresql://filstore:password@localhost:5432/filstore
REDIS_URL=redis://localhost:6379
```

## 🐳 Docker Services

### Service Overview

| Service    | Port | Description                    | Dependencies |
|------------|------|--------------------------------|--------------|
| Gateway    | 8080 | API Gateway & Authentication   | Redis        |
| Blockchain | 3001 | Core Filecoin & IPFS service   | PostgreSQL   |
| Frontend   | 3000 | Web Dashboard & CLI            | Blockchain   |
| Engine     | 9090 | Background Processing          | PostgreSQL   |
| PostgreSQL | 5432 | Primary Database               | -            |
| Redis      | 6379 | Cache & Session Storage        | -            |

### Service Management

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis
docker-compose up -d blockchain gateway

# Stop services
docker-compose down

# Restart service
docker-compose restart blockchain

# View logs
docker-compose logs -f blockchain
docker-compose logs --tail=100 gateway

# Scale services (if needed)
docker-compose up -d --scale blockchain=2
```

### Health Checks

```bash
# Check all container status
docker-compose ps

# Test service endpoints
curl http://localhost:8080/api/v1/health
curl http://localhost:3001/health
curl http://localhost:3000

# Check specific service logs
docker-compose logs blockchain | grep -i error
docker-compose logs gateway | grep -i "wallet"
```

## 👛 Wallet Configuration

### Initial Wallet Setup

The system automatically creates wallets for both networks:

**Calibration Testnet:**
- File: `data/wallets/wallet-calibration.json`
- Network: Filecoin Calibration
- Purpose: Development and testing
- Funding: Free via faucet

**Mainnet:**
- File: `data/wallets/wallet-mainnet.json`
- Network: Filecoin Mainnet
- Purpose: Production use
- Funding: Real FIL required

### Manual Wallet Operations

```bash
# Initialize wallets manually
docker exec filstore-blockchain-1 node scripts/init-wallet.js

# Check wallet balance
curl "http://localhost:8080/api/v1/balance/f1abcdef..."

# Get testnet tokens (calibration only)
curl -X POST "http://localhost:8080/api/v1/faucet" \
  -H "Content-Type: application/json" \
  -d '{"address":"f1abcdef..."}'
```

### Wallet Security

- Private keys are stored in `data/wallets/` (excluded from git)
- Backup your wallet files before production use
- Use environment variables for sensitive configuration
- Consider hardware wallet integration for production

## 🔍 Troubleshooting

### Common Issues

**1. Port Conflicts**
```bash
# Check what's using ports
netstat -an | findstr ":3000"
netstat -an | findstr ":8080"

# Change ports in docker-compose.yml if needed
ports:
  - "3001:3001"  # Change first number
```

**2. Docker Build Failures**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test-build services/blockchain/
```

**3. Database Connection Issues**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test database connection
docker exec filstore-postgres-1 psql -U filstore -d filstore -c "SELECT version();"

# Reset database (WARNING: destroys data)
docker-compose down
docker volume rm filstore_postgres-data
docker-compose up -d
```

**4. Wallet Initialization Failures**
```bash
# Check wallet directory permissions
ls -la data/wallets/

# Recreate wallets
rm data/wallets/*.json
docker exec filstore-blockchain-1 node scripts/init-wallet.js

# Check wallet service logs
docker-compose logs blockchain | grep -i wallet
```

**5. Network Connectivity Issues**
```bash
# Test external connectivity
docker exec filstore-blockchain-1 curl -s https://api.calibration.node.glif.io
docker exec filstore-blockchain-1 curl -s https://api.pinata.cloud

# Check DNS resolution
docker exec filstore-blockchain-1 nslookup calibration.node.glif.io
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
echo "DEBUG=filstore:*" >> .env

# Restart services
docker-compose down
docker-compose up -d

# View debug logs
docker-compose logs -f blockchain
```

### Performance Monitoring

```bash
# Monitor resource usage
docker stats

# Check service health
docker-compose exec blockchain curl localhost:3001/health
docker-compose exec gateway curl localhost:8080/api/v1/status

# Database performance
docker exec filstore-postgres-1 psql -U filstore -d filstore -c "
  SELECT schemaname,tablename,attname,n_distinct,correlation 
  FROM pg_stats 
  WHERE schemaname='public';
"
```

## 📊 Service URLs & Endpoints

### Web Interfaces
- **Main Dashboard**: http://localhost:3000
- **Wallet Dashboard**: http://localhost:3000/wallet-dashboard.html
- **Admin Login**: http://localhost:3000/login.html

### API Endpoints
- **Gateway Health**: http://localhost:8080/api/v1/health
- **Blockchain Health**: http://localhost:3001/health
- **System Status**: http://localhost:8080/api/v1/status
- **Storage Upload**: http://localhost:3001/storage/upload
- **Wallet Balance**: http://localhost:8080/api/v1/balance/:address

### Direct Service Access
- **PostgreSQL**: `postgresql://filstore:password@localhost:5432/filstore`
- **Redis**: `redis://localhost:6379`
- **Gateway gRPC**: `localhost:9090`

## 🔄 Updates & Maintenance

### Updating the System

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run any migration scripts
docker exec filstore-blockchain-1 node scripts/migrate.js
```

### Regular Maintenance

```bash
# Clean up old files
node scripts/cleanup-old-files.js

# Optimize database
docker exec filstore-postgres-1 psql -U filstore -d filstore -c "VACUUM ANALYZE;"

# Clean Docker resources
docker system prune -f
```

### Backup & Recovery

```bash
# Backup database
docker exec filstore-postgres-1 pg_dump -U filstore filstore > backup.sql

# Backup wallets
cp -r data/wallets/ backup-wallets/

# Restore database
docker exec -i filstore-postgres-1 psql -U filstore filstore < backup.sql
```

---
