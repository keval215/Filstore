# 🗂️ Filstore - Decentralized Filecoin Storage Platform

**A comprehensive Web3-enabled decentralized storage solution built on Filecoin with intelligent deal management, MetaMask integration, and automated storage optimization.**

---

## 🌟 What is Filstore?

Filstore is a complete decentralized storage platform that bridges the gap between traditional file storage and Web3. It provides users with a simple, modern interface to store files on the Filecoin network while offering advanced features like storage optimization, automated deal creation, and real-time market analysis.

### 🎯 **Core Mission**
Transform how individuals and businesses store data by making decentralized storage as easy as using traditional cloud storage, while providing the benefits of blockchain technology: immutability, censorship resistance, and true ownership.

### 🔥 **Key Benefits**
- **🔒 True Ownership**: Your files, your keys, your control
- **🌍 Decentralized**: No single point of failure
- **💰 Cost-Effective**: Competitive pricing with storage optimization
- **🛡️ Immutable**: Files stored on blockchain are tamper-proof
- **🚀 Future-Proof**: Built on cutting-edge Web3 technology

---

## 🏗️ How Filstore Works

### 📋 **The Complete User Journey**

1. **👛 Connect Wallet**: Users connect their MetaMask wallet to the platform
2. **📁 Upload Files**: Drag and drop files through the modern web interface
3. **🤖 Smart Optimization**: AI advisor analyzes market conditions and recommends optimal storage strategies
4. **📦 CAR File Creation**: Files are packaged into Content Addressed Archive (CAR) format for Filecoin
5. **🤝 Deal Creation**: Smart contracts automatically negotiate storage deals with providers
6. **✍️ MetaMask Signing**: Users sign transactions securely through MetaMask
7. **📊 Deal Monitoring**: Real-time tracking of deal status and storage lifecycle
8. **🔍 Verification**: Continuous verification that files remain stored and accessible

### 🔧 **Technical Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        FILSTORE PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React/Web3)  │  Gateway API  │  Blockchain Service   │
│  - MetaMask Integration │  - Rate Limit │  - Wallet Management  │
│  - File Upload UI      │  - CORS       │  - Deal Creation      │
│  - Deal Monitoring     │  - Auth       │  - Transaction Mgmt   │
├─────────────────────────────────────────────────────────────────┤
│  Data-Prep Service     │  Engine        │  Python Deal Analyzer │
│  - CAR File Creation   │  - Background  │  - Market Analysis    │
│  - IPFS Integration    │  - Processing  │  - Cost Optimization  │
│  - File Validation     │  - Scheduling  │  - Provider Ranking   │
├─────────────────────────────────────────────────────────────────┤
│         PostgreSQL      │     Redis      │     File Storage     │
│     - Deal Records      │  - Cache       │   - Uploads/CAR      │
│     - User Data         │  - Sessions    │   - Logs/Backups     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILECOIN ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│  Filecoin Network      │  IPFS Network  │  Storage Providers    │
│  - Calibration Testnet │  - Content     │  - PiKNiK (t017840)  │
│  - Mainnet             │  - Discovery   │  - Auto-accepting     │
│  - Smart Contracts     │  - Pinning     │  - 24-48hr activation │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Features & Capabilities

### 1. 🎨 **Modern Web Interface**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Drag & Drop Upload**: Intuitive file upload with progress tracking
- **Real-time Dashboard**: Live updates on deal status, network activity, and storage usage
- **Dark/Light Themes**: Customizable interface to match user preferences

### 2. 👛 **Advanced Wallet Integration**
- **MetaMask Native**: First-class MetaMask integration with automatic network switching
- **Multi-Network Support**: Seamless switching between Filecoin Calibration testnet and Mainnet
- **Wallet Management**: Generate, import, and manage Filecoin wallets directly
- **Balance Monitoring**: Real-time balance tracking and transaction history

### 3. 🤖 **Intelligent Storage Optimization**
- **AI-Powered Advisor**: Python-based machine learning analysis of market conditions
- **Cost Analysis**: Real-time pricing recommendations based on 7, 30, 90, or 180-day market data
- **Provider Rankings**: Automated ranking of storage providers by reliability and cost
- **Deal Recommendations**: Smart suggestions for deal duration, price, and provider selection

### 4. 📦 **Advanced File Processing**
- **CAR File Creation**: Automatic conversion of files to Content Addressed Archive format
- **Compression**: Intelligent compression algorithms to reduce storage costs
- **Chunking**: Large file splitting for optimal network transfer
- **Verification**: Cryptographic verification of file integrity throughout the process

### 5. 🔐 **Enterprise-Grade Security**
- **Web3-Only Authentication**: No passwords - only cryptographic wallet signatures
- **End-to-End Encryption**: Files encrypted before leaving your device
- **Immutable Storage**: Blockchain-based storage ensures data cannot be altered
- **Access Control**: Granular permissions based on wallet ownership

### 6. 📊 **Comprehensive Deal Management**
- **Deal Lifecycle Tracking**: From creation to expiration, track every stage
- **Provider Communication**: Automated negotiation with storage providers
- **Status Monitoring**: Real-time updates on deal acceptance, data transfer, and activation
- **Renewal Management**: Automated notifications and renewal options

### 7. 🔍 **Market Intelligence**
- **Real-time Analytics**: Live market data from Filecoin network
- **Pricing Trends**: Historical price analysis and future predictions
- **Provider Analytics**: Detailed statistics on provider performance and reliability
- **Network Health**: Overall network status and capacity monitoring

---

## 🛠️ Service Architecture

### **Frontend Service** (`localhost:3000`)
The user-facing web application providing the main interface for Filstore.

**Key Features:**
- React-based modern UI with Tailwind CSS styling
- MetaMask integration for Web3 authentication
- File upload with drag-and-drop support
- Real-time deal monitoring dashboard
- Market analysis and storage recommendations
- Responsive design for all device types

**API Endpoints:**
- `/` - Main dashboard
- `/upload` - File upload interface
- `/deals` - Deal management
- `/wallet` - Wallet management
- `/api/testnet/deals` - Testnet deal data
- `/api/mainnet/deals` - Mainnet deal data

### **Blockchain Service** (`localhost:3001`)
Core blockchain operations and wallet management service.

**Key Features:**
- Filecoin wallet generation and management
- Transaction creation and signing
- Deal negotiation with storage providers
- Balance checking and payment processing
- Network communication with Filecoin nodes

**API Endpoints:**
- `/check-wallet` - Validate wallet status
- `/upload-and-deal` - Create storage deals
- `/confirm-deal` - Confirm deal transactions
- `/wallet/balance` - Check wallet balances
- `/storage/optimize` - Get storage recommendations

### **Data-Prep Service** (`localhost:3002`)
Specialized service for preparing files for Filecoin storage.

**Key Features:**
- CAR (Content Addressed Archive) file creation
- IPFS integration and pinning
- File validation and verification
- Metadata management
- Content addressing (CID) generation

**API Endpoints:**
- `/car/create` - Create CAR files from uploads
- `/car/verify` - Verify CAR file integrity
- `/ipfs/pin` - Pin files to IPFS network
- `/cid/:cid` - Retrieve content by CID

### **Gateway Service** (`localhost:8080`)
API gateway providing centralized routing and security.

**Key Features:**
- Request routing and load balancing
- Rate limiting and DDoS protection
- CORS handling for cross-origin requests
- API versioning and documentation
- Health monitoring and status reporting

### **Engine Service** (`localhost:9090`)
Background processing engine for automated tasks.

**Key Features:**
- Scheduled backup operations
- Deal status monitoring and updates
- File compression and optimization
- Cleanup of expired data
- System maintenance tasks

### **Deal Analyzer** (Python Service)
Advanced analytics service for market intelligence.

**Key Features:**
- Machine learning-based market analysis
- Provider performance scoring
- Cost optimization algorithms
- Trend prediction and forecasting
- Custom recommendation engine

---

## 🔄 Complete Deal Creation Workflow

### **Step 1: File Upload & Validation**
```mermaid
graph LR
    A[User Selects File] --> B[Drag & Drop Upload]
    B --> C[File Validation]
    C --> D[Size & Type Check]
    D --> E[Preview Generation]
```

1. User drags file into upload area or clicks to browse
2. Frontend validates file size (max 100MB) and type
3. File metadata is extracted and displayed
4. Upload progress is tracked in real-time

### **Step 2: Market Analysis & Optimization**
```mermaid
graph LR
    A[File Ready] --> B[Call Deal Analyzer]
    B --> C[Market Data Analysis]
    C --> D[Provider Ranking]
    D --> E[Cost Calculation]
    E --> F[Recommendations]
```

1. Python Deal Analyzer fetches current market data
2. AI algorithms analyze pricing trends and provider performance
3. Optimal storage strategy is calculated
4. User receives personalized recommendations

### **Step 3: CAR File Preparation**
```mermaid
graph LR
    A[User Confirms Deal] --> B[Send to Data-Prep]
    B --> C[Create CAR File]
    C --> D[Generate CID]
    D --> E[Upload to IPFS]
    E --> F[Pin to Network]
```

1. File is sent to Data-Prep service for processing
2. Content Addressed Archive (CAR) format is created
3. Unique Content Identifier (CID) is generated
4. File is uploaded to IPFS and pinned for availability

### **Step 4: Deal Creation & Blockchain Interaction**
```mermaid
graph LR
    A[CAR Ready] --> B[Create Deal Transaction]
    B --> C[Calculate Costs]
    C --> D[Generate Transaction]
    D --> E[Send to MetaMask]
```

1. Blockchain service creates a storage deal transaction
2. Deal parameters (price, duration, provider) are set
3. Transaction is formatted for MetaMask signing
4. User reviews and signs transaction in MetaMask

### **Step 5: Provider Negotiation & Activation**
```mermaid
graph LR
    A[Transaction Signed] --> B[Submit to Network]
    B --> C[Provider Receives Deal]
    C --> D[Provider Accepts]
    D --> E[Data Transfer]
    E --> F[Deal Active]
```

1. Signed transaction is broadcast to Filecoin network
2. Selected storage provider (e.g., PiKNiK t017840) receives deal proposal
3. Provider validates deal and begins data transfer
4. Deal becomes active and file is permanently stored

### **Step 6: Monitoring & Maintenance**
```mermaid
graph LR
    A[Deal Active] --> B[Continuous Monitoring]
    B --> C[Status Updates]
    C --> D[Health Checks]
    D --> E[Renewal Alerts]
```

1. Engine service continuously monitors deal status
2. Regular health checks ensure data remains accessible
3. Users receive notifications about deal expiration
4. Automated renewal options are provided

---

## 🎛️ Installation & Setup

### **Prerequisites**
- Docker & Docker Compose (required)
- Node.js 18+ (for development)
- Python 3.8+ (for deal analyzer)
- Git (for source control)
- MetaMask browser extension

### **Quick Start (Recommended)**
```bash
# 1. Clone repository
git clone <repository-url>
cd Filstore

# 2. Run automated setup (Windows)
quick-setup.bat

# 3. Access application
# Frontend: http://localhost:3000
# Gateway: http://localhost:8080
# Blockchain API: http://localhost:3001
```

### **Manual Setup**
```bash
# 1. Clone and enter directory
git clone <repository-url>
cd Filstore

# 2. Set up environment
cp shared/config/dev.env.example shared/config/dev.env
# Edit dev.env with your configuration

# 3. Build services
docker-compose build

# 4. Start infrastructure
docker-compose up -d postgres redis

# 5. Initialize database
docker exec -it filstore-postgres-1 psql -U filstore -d filstore -f /docker-entrypoint-initdb.d/schema.sql

# 6. Start all services
docker-compose up -d

# 7. Initialize wallets
node scripts/init-wallet.js
```

### **Environment Configuration**
Create and configure these files:
- `shared/config/dev.env` - Development settings
- `data/config/wallet-config.json` - Wallet configurations
- `data/config/wallet.env` - Network-specific settings

**Required Environment Variables:**
```env
# Network Configuration
FILECOIN_NETWORK=calibration  # or mainnet
NODE_ENV=development

# Database
DATABASE_URL=postgresql://filstore:password@postgres:5432/filstore
REDIS_URL=redis://redis:6379

# IPFS/Pinata (optional)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window
```

---

## 🔐 Security & Authentication

### **Web3-Only Authentication Model**
Filstore uses a revolutionary authentication approach:
- **No Passwords**: Traditional username/password authentication is completely eliminated
- **Wallet-Based Identity**: Your MetaMask wallet serves as your identity
- **Cryptographic Signatures**: All operations require cryptographic proof of ownership
- **Session Management**: Secure session handling without storing sensitive data

### **Authentication Flow**
1. User connects MetaMask wallet to the application
2. Application requests a signature for a time-limited message
3. Signature is verified cryptographically on the server
4. Session is established with wallet address as the identifier
5. All subsequent operations are authorized through wallet ownership

### **Security Features**
- **End-to-End Encryption**: Files are encrypted before leaving your device
- **Immutable Storage**: Blockchain storage prevents data tampering
- **Access Control**: Only wallet owners can access their stored files
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Input Validation**: All inputs are sanitized and validated
- **CORS Protection**: Cross-origin request security

---

## 📊 Market Intelligence & Optimization

### **AI-Powered Deal Analyzer**
The Python-based Deal Analyzer provides sophisticated market intelligence:

**Market Analysis Features:**
- Real-time price monitoring across multiple storage providers
- Historical trend analysis over 7, 30, 90, and 180-day periods
- Provider performance scoring based on reliability metrics
- Network capacity analysis and availability predictions

**Optimization Algorithms:**
- Cost-benefit analysis for different deal durations
- Provider selection based on performance and price
- Optimal timing recommendations for deal creation
- Bulk storage strategies for multiple files

**Machine Learning Components:**
- Price prediction models using historical data
- Provider reliability scoring based on past performance
- Market trend identification and forecasting
- Anomaly detection for unusual market conditions

### **Recommendation Engine**
The system provides intelligent recommendations:
- **Storage Duration**: Optimal deal length based on cost analysis
- **Provider Selection**: Best providers for specific requirements
- **Timing**: When to create deals for maximum cost savings
- **Bundling**: Opportunities to combine multiple files for better rates

---

## 🧪 Testing & Quality Assurance

### **Automated Testing**
```bash
# Run all tests
npm test

# Test specific components
npm run test:wallet
npm run test:deals
npm run test:upload

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### **Manual Testing Workflows**
1. **Wallet Connection Test**:
   - Connect MetaMask to application
   - Verify wallet address display
   - Test network switching

2. **File Upload Test**:
   - Upload various file types and sizes
   - Verify CAR file creation
   - Check IPFS pinning

3. **Deal Creation Test**:
   - Create storage deals
   - Verify MetaMask interaction
   - Monitor deal status progression

### **Health Monitoring**
```bash
# Check service health
curl http://localhost:8080/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Database connectivity
docker exec -it filstore-postgres-1 pg_isready

# Redis connectivity
docker exec -it filstore-redis-1 redis-cli ping
```

---

## 🔍 Monitoring & Analytics

### **Real-time Dashboards**
- **System Status**: All services health and connectivity
- **Deal Analytics**: Success rates, average costs, provider performance
- **User Activity**: Upload volumes, deal creation patterns
- **Network Health**: Filecoin network status and capacity

### **Logging & Debugging**
- **Structured Logging**: JSON-formatted logs for easy parsing
- **Log Aggregation**: Centralized logging across all services
- **Error Tracking**: Automatic error detection and alerting
- **Performance Metrics**: Response times, throughput, and resource usage

### **Alerting System**
- **Deal Failures**: Immediate notification of failed deals
- **Service Outages**: Alerts when services become unavailable
- **Storage Expiration**: Advance warning of expiring deals
- **Cost Anomalies**: Alerts for unusual pricing or costs

---

## 🤝 Contributing & Development

### **Development Setup**
```bash
# 1. Fork the repository
git fork <repository-url>

# 2. Clone your fork
git clone <your-fork-url>
cd Filstore

# 3. Create feature branch
git checkout -b feature/your-feature-name

# 4. Install development dependencies
npm install --dev

# 5. Start development environment
docker-compose -f docker-compose.dev.yml up
```

### **Code Standards**
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Jest**: Testing framework
- **JSDoc**: Code documentation

### **Pull Request Process**
1. Create feature branch from `main`
2. Make changes with appropriate tests
3. Update documentation if needed
4. Run full test suite
5. Submit pull request with description
6. Respond to code review feedback
7. Merge after approval

---

## 📚 API Documentation

### **Complete API Reference**

#### **Frontend API** (`http://localhost:3000`)
```javascript
// Get all testnet deals
GET /api/testnet/deals
Response: {
  deals: Array<DealInfo>,
  count: number,
  last_updated: string
}

// Get specific deal status
GET /deal-status/:dealId
Response: {
  id: string,
  status: string,
  created_at: string,
  transaction_hash: string
}

// Check wallet readiness
POST /check-wallet
Body: { walletAddress: string }
Response: {
  success: boolean,
  ready: boolean,
  balance: string
}

// Create storage deal
POST /upload-and-deal
Body: FormData {
  file: File,
  walletAddress: string,
  useDataCap: boolean
}
Response: {
  success: boolean,
  dealId: string,
  carInfo: CAR_FileInfo,
  dealTransaction: TransactionInfo
}
```

#### **Blockchain API** (`http://localhost:3001`)
```javascript
// Wallet operations
POST /wallet/create
GET /wallet/balance/:address
POST /wallet/send
GET /wallet/history/:address

// Storage operations
POST /storage/upload
POST /storage/deal
GET /storage/status/:dealId
POST /storage/retrieve/:cid
```

#### **Data-Prep API** (`http://localhost:3002`)
```javascript
// CAR file operations (Web3 auth required)
POST /car/create
Headers: {
  'X-Wallet-Address': '0x...',
  'X-Wallet-Signature': '0x...',
  'X-Signed-Message': 'timestamp_message'
}
Body: { file: File, options: CAR_Options }
Response: {
  success: boolean,
  cid: string,
  carSize: number,
  carPath: string
}

// IPFS operations
POST /ipfs/pin/:cid
GET /ipfs/status/:cid
DELETE /ipfs/unpin/:cid
```

---

## 🛟 Troubleshooting & Support

### **Common Issues & Solutions**

**1. MetaMask Connection Issues**
```bash
# Symptoms: MetaMask not connecting or wrong network
# Solutions:
- Ensure MetaMask is unlocked
- Check network settings (Filecoin Calibration)
- Clear browser cache and cookies
- Reinstall MetaMask extension if needed
```

**2. Python Advisor Errors**
```bash
# Symptoms: "Python advisor not running" errors
# Solutions:
- Activate Python environment: myenv\Scripts\activate
- Install dependencies: pip install pandas numpy requests
- Check Python path in docker-compose.yml
- Verify deal-analyzer directory exists
```

**3. Database Connection Issues**
```bash
# Symptoms: Service startup failures
# Solutions:
docker-compose down
docker-compose up -d postgres redis
docker-compose up -d
```

**4. File Upload Failures**
```bash
# Symptoms: Uploads fail or timeout
# Solutions:
- Check file size (max 100MB)
- Verify disk space availability
- Check IPFS connectivity
- Review nginx upload limits
```

### **Getting Help**
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this README and inline code docs
- **Logs**: Always check service logs first: `docker-compose logs [service]`
- **Community**: Join our Discord/Telegram for community support

### **Development Support**
- **Code Reviews**: Submit PRs for community review
- **Feature Requests**: Open GitHub issues with detailed descriptions
- **Bug Reports**: Include reproduction steps and environment info
- **Questions**: Use GitHub Discussions for general questions

---

## 📄 License & Legal

This project is licensed under the **MIT License**:

```
MIT License

Copyright (c) 2025 Filstore

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### **Third-Party Licenses**
- **Filecoin**: Protocol and network usage
- **IPFS**: Content addressing and storage
- **MetaMask**: Wallet integration
- **Docker**: Containerization platform
- **Node.js**: Runtime environment
- **PostgreSQL**: Database system
- **Redis**: Caching system

---

## 🚀 Roadmap & Future Features

### **Phase 1: Core Platform** ✅
- [x] Basic file upload and storage
- [x] MetaMask integration
- [x] Deal creation and monitoring
- [x] CAR file generation
- [x] IPFS integration

### **Phase 2: Intelligence** ✅
- [x] AI-powered market analysis
- [x] Storage cost optimization
- [x] Provider performance ranking
- [x] Deal recommendations

### **Phase 3: Advanced Features** 🔄
- [ ] Multi-file bundling and batch operations
- [ ] Advanced encryption options
- [ ] File sharing and collaboration
- [ ] Mobile application (iOS/Android)
- [ ] Desktop application (Electron)

### **Phase 4: Enterprise** 🔮
- [ ] Team management and permissions
- [ ] Enterprise SSO integration
- [ ] Custom storage policies
- [ ] Audit logging and compliance
- [ ] API rate limiting and quotas

### **Phase 5: Ecosystem** 🔮
- [ ] Third-party integrations (Dropbox, Google Drive)
- [ ] Plugin architecture for extensions
- [ ] Marketplace for storage providers
- [ ] Decentralized governance (DAO)
- [ ] Token economics and rewards

---

## 📞 Contact & Community

- **GitHub**: [Project Repository](https://github.com/your-username/filstore)
- **Documentation**: [Technical Docs](https://docs.filstore.io)
- **Discord**: [Community Chat](https://discord.gg/filstore)
- **Twitter**: [@FilstoreHQ](https://twitter.com/FilstoreHQ)
- **Email**: support@filstore.io

**Maintainers:**
- **Lead Developer**: Your Name (@your-github)
- **DevOps**: Team Member (@their-github)
- **Frontend**: Team Member (@their-github)

---

<div align="center">

**Built with ❤️ for the decentralized future**

*Filstore - Making decentralized storage accessible to everyone*

[![GitHub Stars](https://img.shields.io/github/stars/your-username/filstore?style=social)](https://github.com/your-username/filstore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)
[![Web3](https://img.shields.io/badge/web3-enabled-green.svg)](#)

</div>
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
- **Data-Prep Service**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📁 Project Structure

```
Filstore/
├── services/
│   ├── blockchain/          # Core blockchain & storage service
│   ├── frontend/           # Web interface & CLI tools
│   ├── gateway/            # API gateway & authentication
│   ├── engine/             # Background processing engine
│   └── data-prep/          # Data preparation and processing
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

### Data-Prep Service (Port 3002)
- CAR file creation for Filecoin storage
- CID metadata management
- File monitoring and processing
- **Web3 Authentication Required** for all write operations

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

### Data-Prep API (http://localhost:3002)
- `GET /health` - Service health check (no auth required)
- `GET /status` - Service status (no auth required) 
- `POST /car/create` - Create CAR file (**Web3 signature required**)
- `POST /car/verify` - Verify CAR file (**Web3 signature required**)
- `GET /cars` - List processed CAR files (read-only)
- `GET /cid/:cid` - Get CID information (read-only)
- `GET /cids/search` - Search CIDs (read-only)
- `POST /watcher/start` - Start file watcher (**Web3 signature required**)
- `POST /watcher/stop` - Stop file watcher (**Web3 signature required**)
- `DELETE /cleanup` - Cleanup old files (**Web3 signature required**)

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

- **Web3-Only Authentication**: All write operations require MetaMask/Web3 wallet signatures
- No traditional username/password authentication
- Wallet address validation for all secure operations
- Rate limiting on all public endpoints
- CORS protection
- File upload size limits (100MB)
- Input validation and sanitization

### Web3 Authentication Headers

For write operations, include these headers:
```
X-Wallet-Address: 0x1234...abcd
X-Wallet-Signature: 0x5678...ef90
X-Signed-Message: "Authorize Filstore operation at 2025-07-03T06:45:00.000Z"
```

TEAM
- Keval (Lead developer)
- Tirth (Backend developer)
- Madhvendra (Analyst)

---


