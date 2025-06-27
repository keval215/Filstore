# Filecoin Hybrid Backup System

A user-friendly backup solution leveraging Filecoin's decentralized storage network with AI-powered optimization.

## 🚀 Quick Start

Choose your preferred startup method:

### 🎯 Automated Setup (Recommended for Beginners)
**Zero configuration required - perfect for web2 users!**

```powershell
# Windows one-click setup
quick-setup.bat
```

**What this does:**
- ✅ Generates all secure secrets automatically
- ✅ Creates and funds Filecoin testnet wallet
- ✅ Configures IPFS with demo credentials
- ✅ Starts all services with Docker
- ✅ Opens web dashboard in browser

### 🔧 Manual Setup (Advanced Users)
**Full control over configuration**

```powershell
# 1. Copy and edit environment file
copy .env.example .env
notepad .env

# 2. Start services
docker-compose up -d

# 3. Access dashboard
start http://localhost:3000
```

**Manual configuration required:**
- Generate JWT secrets and encryption keys
- Setup IPFS credentials or use your own node
- Configure Filecoin network (testnet/mainnet)
- Create or import wallet

### 🛠️ Development Mode
**For developers modifying code**

```powershell
# Start infrastructure only
docker-compose up -d postgres redis

# Start services individually (separate terminals)
cd services/gateway && go run main.go
cd services/engine && go run main.go
cd services/blockchain && npm install && npm start
cd services/frontend && npm install && npm start
```

## 📊 Service URLs

Once started, access these services:
- **Web Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **Engine API**: http://localhost:9090
- **Blockchain API**: http://localhost:3001

## 🏗️ Architecture

### 🚪 Gateway Service (Go) - Port 8080
- API Gateway with authentication and rate limiting
- Routes requests to appropriate services

### ⚙️ Engine Service (Go) - Port 9090
- File processing, compression, and encryption
- Backup orchestration and job management

### 🔗 Blockchain Service (JavaScript) - Port 3001
- Filecoin and IPFS integration
- Wallet management and AI-powered deal optimization

### 🖥️ Frontend Service (JavaScript) - Port 3000
- Modern web dashboard with real-time monitoring
- File upload and backup management interface

## 📚 Documentation

- **[START.md](START.md)** - Detailed startup instructions and troubleshooting
- **[SERVICE-GUIDE.md](SERVICE-GUIDE.md)** - Service explanations and commands  
- **[WALLET-SETUP.md](WALLET-SETUP.md)** - Wallet setup and funding guide
- **[AI-OPTIMIZATION.md](AI-OPTIMIZATION.md)** - AI deal optimization strategy
- **[SECURITY.md](SECURITY.md)** - Security features and best practices

## 🔧 Configuration Examples

### Key Environment Variables
```bash
# Security (Auto-generated in automated setup)
JWT_SECRET=auto-generated-64-character-secret
ENCRYPTION_KEY=auto-generated-32-character-key
WALLET_ENCRYPTION_KEY=auto-generated-32-character-key

# Network (Configurable)
FILECOIN_NETWORK=calibration  # or mainnet
FILECOIN_NODE_URL=https://api.calibration.node.glif.io/rpc/v1

# IPFS (Demo credentials work out-of-box)
IPFS_URL=https://ipfs.infura.io:5001
IPFS_PROJECT_ID=your-project-id
```

## 🎯 When to Use Each Method

| Method | Best For | Time | Setup |
|--------|----------|------|-------|
| **Automated** | Beginners, testing | 2 minutes | Zero config |
| **Manual** | Advanced users, production | 10+ minutes | Full control |
| **Development** | Code contributors | Variable | Service-by-service |

## 📋 Management Commands

```powershell
# Start/Stop
docker-compose up -d          # Start all services
docker-compose down           # Stop all services  

# Monitoring
docker-compose logs -f        # View logs
docker-compose ps             # Check status

# Maintenance  
docker-compose restart       # Restart services
docker-compose down -v        # Clean reset
```

## 🚨 Troubleshooting

### Quick Fixes:
```powershell
# Services not starting
docker-compose ps
docker-compose logs -f

# Port conflicts  
netstat -an | findstr ":3000"

# Clean reset
docker-compose down -v
docker-compose up -d --build
```

## 🌟 Key Features

- **🔐 Automatic Encryption** - AES-256 encryption before storage
- **🌍 Decentralized Storage** - Files stored on Filecoin network  
- **🤖 AI Optimization** - Smart storage deal selection
- **📊 Real-time Dashboard** - Monitor all operations
- **🛡️ Security First** - Enterprise-grade security

## 🏆 Why Choose This System?

### For Web2 Users:
- **Zero Learning Curve** - Works like traditional cloud storage
- **Automatic Setup** - No crypto knowledge required  
- **Cost Savings** - Often cheaper than traditional cloud

### For Web3 Users:
- **Full Control** - Complete configuration freedom
- **Advanced Features** - AI optimization, custom providers
- **Integration Ready** - APIs for custom applications

## 📄 License

MIT License - see LICENSE file for details.

Ready to get started? Run `quick-setup.bat` for instant setup! 🚀
