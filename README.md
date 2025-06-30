# Filstore - Decentralized File Storage System

A comprehensive decentralized file storage solution built on Filecoin blockchain technology, providing secure, reliable, and distributed file storage capabilities.

## 🏗️ Architecture

Filstore consists of multiple interconnected microservices:

- **Gateway Service** (Port 8080) - API gateway and request routing
- **Engine Service** (Port 9090) - Core file processing and storage logic
- **Blockchain Service** (Port 3001) - Filecoin blockchain integration
- **Frontend** (Port 3000) - User interface
- **Redis** (Port 6379) - Caching and session management
- **PostgreSQL** (Port 5432) - Metadata and configuration storage

## 📋 Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Node.js 16+ (for automated setup)
- Git
- 8GB+ RAM recommended
- 20GB+ free disk space

### Environment Setup (Automated)

**No manual configuration needed!** The system automatically generates all secure secrets and configurations.

Simply run the automated setup wizard:

```bash
# Automated setup (generates all secrets automatically)
node setup-env.js

# Or use the complete quick setup (Windows)
quick-setup.bat
```

The setup wizard will:
- ✅ Generate cryptographically secure secrets (JWT, encryption keys, API keys)
- ✅ Configure Filecoin network (testnet/mainnet)
- ✅ Set up IPFS storage options
- ✅ Create wallet encryption keys
- ✅ Configure all service connections
- ✅ Set optimal performance settings

**For advanced users only:** Manual `.env` configuration is available but not recommended.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```batch
# Windows - Complete automated setup
quick-setup.bat

# Linux/Mac - Run setup wizard then start
node setup-env.js
docker-compose up --build -d
```

### Option 2: Manual Docker Commands
```bash
# Generate environment first
node setup-env.js

# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📖 Detailed Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd Filstore
```

### 2. Automated Environment Setup
Run the interactive setup wizard that generates all configurations:
```bash
# Interactive setup wizard
node setup-env.js
```

The wizard will guide you through:
- Network selection (testnet/mainnet)
- IPFS configuration options
- Security preferences
- Automatic secret generation

### 3. Build Services
```bash
# Build all Docker images
docker-compose build

# Or build specific service
docker-compose build gateway
```

### 4. Start Services
```bash
# Start all services in detached mode
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific services
docker-compose up gateway engine
```

### 5. Verify Installation
Check that all services are running:
```bash
docker-compose ps
```

Access the services:
- Frontend: http://localhost:3000
- Gateway API: http://localhost:8080
- Engine API: http://localhost:9090
- Blockchain API: http://localhost:3001

## 🛠️ Development

### Service Management
```bash
# Restart a specific service
docker-compose restart gateway

# View logs for specific service
docker-compose logs -f engine

# Execute commands in running container
docker-compose exec gateway bash

# Scale services
docker-compose up --scale engine=2
```

### Database Management
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U filecoin_user -d filecoin_backup

# Backup database
docker-compose exec postgres pg_dump -U filecoin_user filecoin_backup > backup.sql

# Restore database
docker-compose exec -T postgres psql -U filecoin_user filecoin_backup < backup.sql
```

### Redis Management
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis
docker-compose exec redis redis-cli monitor
```

## 📁 Data Persistence

The following directories are used for persistent data:

- `./data/uploads` - File uploads storage
- `./data/logs` - Application logs
- `./data/wallets` - Blockchain wallet data
- `./data/config` - Configuration files
- `./data/redis` - Redis persistence

## 🔧 Configuration

### Gateway Service
- Port: 8080
- Connects to: Engine, Blockchain, Redis, PostgreSQL

### Engine Service
- Port: 9090
- Handles: File processing, storage operations
- Volumes: uploads, logs

### Blockchain Service
- Port: 3001
- Handles: Filecoin interactions, wallet management
- Volumes: wallets, config

### Frontend Service
- Port: 3000
- Static web application

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :8080
   
   # Modify docker-compose.yml ports if needed
   ```

2. **Permission errors**
   ```bash
   # Fix data directory permissions
   sudo chown -R $USER:$USER ./data
   ```

3. **Missing environment configuration**
   ```bash
   # Regenerate environment
   node setup-env.js
   ```

4. **Memory issues**
   ```bash
   # Check Docker memory allocation
   docker system info
   
   # Clean up unused resources
   docker system prune -a
   ```

5. **Service not starting**
   ```bash
   # Check service logs
   docker-compose logs service-name
   
   # Rebuild specific service
   docker-compose build --no-cache service-name
   ```

### Health Checks
```bash
# Check service health
curl http://localhost:8080/health
curl http://localhost:9090/health
curl http://localhost:3001/health
```

## 🔒 Security Features

- 🔐 **Auto-generated secrets**: All keys are cryptographically secure
- 🛡️ **Wallet encryption**: Private keys are encrypted at rest
- 🔄 **Secret rotation**: Optional automatic key rotation
- 📊 **Security audit logs**: All access is logged
- 🚫 **No hardcoded secrets**: Everything is generated or configurable
- 🔒 **Environment isolation**: Secrets never leave your machine

## 📈 Monitoring

### Docker Stats
```bash
# Monitor resource usage
docker stats

# Monitor specific services
docker stats filstore_gateway_1 filstore_engine_1
```

### Logs
```bash
# Follow all logs
docker-compose logs -f

# Filter logs by service
docker-compose logs -f gateway engine

# Search logs
docker-compose logs | grep ERROR
```

## 🔄 Updates

### Updating Services
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up --build -d

# Update specific service
docker-compose build --no-cache gateway
docker-compose up -d gateway
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[License information here]

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review logs for error details

---

**Note**: This is a development setup. For production deployment, additional security and performance configurations are required.
