# Filstore - Decentralized File Storage & Backup System

A comprehensive decentralized storage solution built on Filecoin with Web3 wallet integration, automated backups, and intelligent storage optimization.

## 🌟 Features

- **Web3 Wallet Integration**: MetaMask, Coinbase Wallet, and other Web3 wallets
- **Filecoin Storage**: Secure, decentralized file storage on Filecoin network
- **IPFS Integration**: Distributed file sharing with Pinata pinning service
- **Automated Backups**: Scheduled backups with compression and encryption
- **Storage Optimization**: AI-powered recommendations for cost-effective storage
- **Multi-Network Support**: Calibration testnet and Mainnet configurations
- **Docker Containerization**: Easy deployment with Docker Compose
- **Modern Web Interface**: React-based dashboard with real-time monitoring

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Filstore
```

### 2. Quick Setup (Windows)

Run the automated setup script:

```batch
quick-setup.bat
```

This will:
- Set up environment variables
- Initialize wallet configurations
- Build and start all Docker containers
- Initialize the database
- Start all services

### 3. Manual Setup

If you prefer manual setup:

```bash
# Copy environment configuration
cp shared/config/dev.env .env

# Build and start services
docker-compose up -d

# Initialize wallets (if needed)
node scripts/docker-init-wallets.js
```

### 4. Access the Application

- **Web Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **Blockchain Service**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📁 Project Structure

```
Filstore/
├── services/
│   ├── blockchain/          # Core blockchain & storage service
│   ├── frontend/           # Web interface & CLI tools
│   ├── gateway/            # API gateway & authentication
│   └── engine/             # Background processing engine
├── data/
│   ├── config/             # Wallet configurations
│   ├── logs/               # Application logs
│   ├── postgres/           # Database data
│   ├── redis/              # Cache data
│   ├── uploads/            # Temporary file uploads
│   └── wallets/            # Wallet key files
├── scripts/                # Utility scripts
├── shared/                 # Shared configurations
└── database/               # Database schema
```

## 🔧 Services

### Blockchain Service (Port 3001)
- Filecoin wallet management
- IPFS file operations
- Storage optimization
- Cost calculations

### Frontend Service (Port 3000)
- Web dashboard
- CLI interface
- File upload/download
- Wallet management UI

### Gateway Service (Port 8080)
- API gateway
- Web3 authentication
- Rate limiting
- CORS handling

### Engine Service (Port 9090)
- Background job processing
- Automated backups
- File compression/encryption
- Storage optimization

## 🔐 Wallet Configuration

The system supports multiple Filecoin networks:

### Calibration Testnet
- Default configuration for development
- Free test tokens available via faucet
- Located in `data/wallets/wallet-calibration.json`

### Mainnet
- Production configuration
- Real FIL tokens required
- Located in `data/wallets/wallet-mainnet.json`

### Configuration Files

Wallet configurations are stored in:
- `data/config/wallet-config.json` - Main wallet settings
- `data/config/wallet.env` - Environment-specific settings

## 🛠️ Development

### Local Development Setup

1. **Install Dependencies**:
   ```bash
   # Blockchain service
   cd services/blockchain && npm install
   
   # Frontend service
   cd ../frontend && npm install
   ```

2. **Start Services Individually**:
   ```bash
   # Start blockchain service
   cd services/blockchain && npm start
   
   # Start frontend service
   cd services/frontend && npm start
   ```

3. **Database Setup**:
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run database migrations
   docker exec -it filstore-postgres-1 psql -U filstore -d filstore -f /docker-entrypoint-initdb.d/schema.sql
   ```

### Environment Variables

Copy and configure environment files:
- `shared/config/dev.env` - Development settings
- `shared/config/prod.env` - Production settings

Key variables:
- `FILECOIN_NETWORK` - Network selection (calibration/mainnet)
- `PINATA_API_KEY` - Pinata service API key
- `PINATA_SECRET_KEY` - Pinata service secret
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

## 🔍 API Endpoints

### Gateway API (http://localhost:8080/api/v1)
- `GET /health` - Service health check
- `GET /status` - System status
- `POST /backup` - Initiate backup
- `GET /backup/:id` - Get backup status
- `POST /faucet` - Get testnet tokens
- `GET /balance/:address` - Check wallet balance

### Blockchain API (http://localhost:3001)
- `POST /storage/upload` - Upload file to IPFS
- `POST /storage/pin` - Pin file to Pinata
- `GET /storage/ipfs/:hash` - Retrieve file from IPFS
- `POST /storage/optimize` - Get storage optimization
- `POST /storage/cost` - Calculate storage costs
- `GET /storage/providers` - List storage providers

### Wallet API (http://localhost:3001/wallet)
- `POST /create` - Create new wallet
- `GET /balance` - Get wallet balance
- `POST /send` - Send FIL tokens
- `GET /history` - Transaction history

## 🐳 Docker

### Build Services
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build blockchain
```

### Manage Containers
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f blockchain

# Restart service
docker-compose restart blockchain
```

### Database Management
```bash
# Access PostgreSQL
docker exec -it filstore-postgres-1 psql -U filstore -d filstore

# Access Redis
docker exec -it filstore-redis-1 redis-cli
```

## 🧪 Testing

### Run Tests
```bash
# Test wallet generation
node scripts/test-wallet-generation.js

# Test storage optimization
node scripts/test-storage-optimization.js

# Cleanup old files
node scripts/cleanup-old-files.js
```

### Health Checks
```bash
# Check service health
curl http://localhost:8080/api/v1/health
curl http://localhost:3001/health

# Check wallet balance
curl http://localhost:8080/api/v1/balance/YOUR_WALLET_ADDRESS
```

## 📊 Monitoring

### Logs
- Application logs: `data/logs/`
- Docker logs: `docker-compose logs [service]`

### Database
- PostgreSQL admin: Connect to localhost:5432
- Redis monitoring: `docker exec -it filstore-redis-1 redis-cli monitor`

## 🔒 Security

- All API endpoints require Web3 wallet authentication
- Rate limiting on all public endpoints
- CORS protection
- File upload size limits (100MB)
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the logs: `docker-compose logs [service]`
- Verify configurations in `data/config/`
- Ensure all required environment variables are set
- Test network connectivity to Filecoin and IPFS endpoints


---


