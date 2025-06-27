# How to Start Filstore

## Quick Start (Recommended)

### 1. Setup Environment
```powershell
# Copy environment template
copy .env.example .env

# Edit .env file with your settings
notepad .env
```

### 2. Start All Services
```powershell
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f blockchain
docker-compose logs -f gateway
```

### 3. Verify Services
```powershell
# Check service status
docker-compose ps

# Test API endpoints
curl http://localhost:8080/health     # Gateway
curl http://localhost:3001/health     # Blockchain
curl http://localhost:3000            # Frontend
```

## Development Mode

### Start with Hot Reload
```powershell
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or start services individually
docker-compose up gateway engine     # Go services only
docker-compose up blockchain frontend # JS services only
```

### Manual Service Start (For Development)
```powershell
# Start dependencies first
docker-compose up -d redis postgres

# Start Go services manually
cd services/gateway && go run main.go
cd services/engine && go run main.go

# Start JS services manually
cd services/blockchain && npm start
cd services/frontend && npm start
```

## Service Ports

- **Gateway (Go)**: http://localhost:8080
- **Engine (Go)**: gRPC on localhost:50051  
- **Blockchain (JS)**: http://localhost:3001
- **Frontend (JS)**: http://localhost:3000
- **Redis**: localhost:6379
- **PostgreSQL**: localhost:5432

## Common Commands

### View Logs
```powershell
docker-compose logs -f [service-name]
```

### Restart Services
```powershell
docker-compose restart [service-name]
```

### Stop Everything
```powershell
docker-compose down
```

### Clean Reset
```powershell
# Stop and remove containers + volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

### Access Container Shell
```powershell
docker-compose exec gateway sh      # Go service
docker-compose exec blockchain bash # JS service
```

## Wallet System Auto-Start

The wallet system initializes automatically when blockchain service starts:
1. ✅ Generates wallet if none exists
2. ✅ Attempts testnet funding via faucet
3. ✅ Monitors balance and logs status
4. ✅ Ready for backup operations

Check wallet status:
```powershell
docker-compose exec blockchain node src/check-wallet.js
```

## Troubleshooting

### Port Conflicts
```powershell
# Check what's using ports
netstat -ano | findstr :8080
netstat -ano | findstr :3001
```

### Container Issues
```powershell
# Rebuild containers
docker-compose build --no-cache

# View container resource usage
docker stats
```

### Database Issues
```powershell
# Reset database
docker-compose down
docker volume rm filstore_postgres_data
docker-compose up -d
```
