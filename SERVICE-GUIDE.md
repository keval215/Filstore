# Filstore Service Guide

## Starting Without Make

### Quick Start (Docker Compose - Recommended)

```powershell
# 1. Setup environment
copy .env.example .env
# Edit .env with your settings (Redis URL, DB credentials, etc.)

# 2. Start all services
docker-compose up -d

# 3. Check status
docker-compose ps
docker-compose logs -f
```

### Manual Development Start

If you prefer to run services individually for development:

```powershell
# Start infrastructure services first
docker-compose up -d redis postgres

# Start Go services (in separate terminals)
cd services/gateway
go mod tidy
go run main.go

cd services/engine  
go mod tidy
go run main.go

# Start JavaScript services (in separate terminals)
cd services/blockchain
npm install
npm start

cd services/frontend
npm install  
npm start
```

## Service Architecture Overview

### 🚪 Gateway Service (`services/gateway/`)
**Purpose**: Main API gateway and load balancer
**Language**: Go
**Port**: 8080

#### What it does:
- Routes incoming requests to appropriate services
- Handles authentication and authorization
- Implements rate limiting and CORS
- Provides unified API endpoints for the entire system

#### Main Commands:
```powershell
cd services/gateway
go mod tidy           # Install dependencies
go run main.go        # Start server
go test ./...         # Run tests
go build -o gateway   # Build binary
```

#### Key Endpoints:
- `GET /health` - Health check
- `GET /api/v1/status` - System status
- `POST /api/v1/backup` - Initiate backup
- `GET /api/v1/backup/:id` - Check backup status

---

### ⚙️ Engine Service (`services/engine/`)
**Purpose**: File processing and backup engine
**Language**: Go  
**Port**: 9090

#### What it does:
- Compresses and encrypts files
- Manages backup jobs and queues
- Processes files before sending to Filecoin
- Handles file chunking and metadata

#### Main Commands:
```powershell
cd services/engine
go mod tidy           # Install dependencies
go run main.go        # Start server
go test ./...         # Run tests
go build -o engine    # Build binary
```

#### Key Endpoints:
- `GET /health` - Health check
- `POST /api/v1/backup` - Process backup job
- `POST /api/v1/compress` - Compress files
- `POST /api/v1/encrypt` - Encrypt files

---

### 🔗 Blockchain Service (`services/blockchain/`)
**Purpose**: Filecoin wallet and blockchain interactions
**Language**: JavaScript/Node.js
**Port**: 3001

#### What it does:
- Manages Filecoin wallets (create, fund, monitor)
- Interacts with Filecoin network APIs
- Handles storage deal creation and monitoring
- Provides IPFS integration
- Manages wallet funding via testnet faucet

#### Main Commands:
```powershell
cd services/blockchain
npm install           # Install dependencies
npm start            # Start production server
npm run dev          # Start with hot reload
npm test             # Run tests
npm run lint         # Check code style
node src/check-wallet.js  # Check wallet status
```

#### Key Endpoints:
- `GET /health` - Health check
- `POST /api/v1/wallet/create` - Create new wallet
- `GET /api/v1/wallet/balance` - Check wallet balance
- `POST /api/v1/wallet/fund` - Fund wallet (testnet)
- `POST /api/v1/filecoin/deal` - Create storage deal
- `GET /api/v1/storage/status` - Check storage status

---

### 🌐 Frontend Service (`services/frontend/`)
**Purpose**: Web dashboard and CLI interface
**Language**: JavaScript/Node.js
**Port**: 3000

#### What it does:
- Provides web dashboard for system monitoring
- Offers CLI tools for backup operations
- Displays backup status and wallet information
- Manages user interactions and file uploads

#### Main Commands:
```powershell
cd services/frontend
npm install           # Install dependencies
npm start            # Start web server
npm run dev          # Start with hot reload
npm run cli          # Run CLI interface
node src/cli.js --help  # CLI help
```

#### Key Features:
- **Web Dashboard**: `http://localhost:3000`
- **CLI Tool**: `npm run cli` or `node src/cli.js`
- **API Client**: Communicates with other services

---

## Shared Resources

### 📋 Proto Definitions (`shared/proto/`)
- `backup.proto` - Backup service definitions
- `engine.proto` - Engine service definitions

### ⚙️ Configuration (`shared/config/`)
- `dev.env` - Development environment variables
- `prod.env` - Production environment variables

### 💾 Data Directories (`data/`)
- `redis/` - Redis data persistence
- `postgres/` - PostgreSQL data
- `uploads/` - Uploaded files staging
- `logs/` - Application logs
- `wallets/` - Encrypted wallet storage
- `config/` - Runtime configuration

## Service Communication Flow

1. **User** → `Frontend` (Web/CLI)
2. **Frontend** → `Gateway` (API requests)
3. **Gateway** → `Engine` (File processing)
4. **Engine** → `Blockchain` (Filecoin operations)
5. **Blockchain** → `Filecoin Network` (Storage deals)

## Common Operations

### Check All Services
```powershell
# Check if all services are running
curl http://localhost:8080/health  # Gateway
curl http://localhost:9090/health  # Engine  
curl http://localhost:3001/health  # Blockchain
curl http://localhost:3000/health  # Frontend
```

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f blockchain
docker-compose logs -f gateway
```

### Stop Services
```powershell
# Stop all
docker-compose down

# Stop specific service
docker-compose stop blockchain
```

### Restart Service
```powershell
# Restart specific service
docker-compose restart blockchain

# Rebuild and restart
docker-compose up -d --build blockchain
```

## Development Tips

1. **Hot Reload**: Use `npm run dev` for JavaScript services
2. **Go Development**: Use `go run` for quick testing
3. **Database Access**: Check `docker-compose.yml` for database ports
4. **Debugging**: Enable debug logs via environment variables
5. **Testing**: Each service has its own test suite

## Troubleshooting

- **Port Conflicts**: Check if ports 3000, 3001, 8080, 9090 are available
- **Docker Issues**: Run `docker-compose down -v` to reset volumes
- **Database Connection**: Ensure Redis and PostgreSQL are running
- **Wallet Issues**: Check wallet setup guide in `WALLET-SETUP.md`
