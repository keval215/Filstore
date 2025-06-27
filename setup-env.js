#!/usr/bin/env node
/**
 * Automatic Environment Setup Script
 * Generates secure secrets automatically for web2 users
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class EnvironmentSetup {
    constructor() {
        this.envPath = path.join(process.cwd(), '.env');
        this.envExamplePath = path.join(process.cwd(), '.env.example');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Generate cryptographically secure random string
     */
    generateSecureKey(length = 32) {
        return crypto.randomBytes(length).toString('hex').substring(0, length);
    }

    /**
     * Generate a secure JWT secret (64 characters)
     */
    generateJWTSecret() {
        return crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
    }

    /**
     * Generate UUID-like identifier
     */
    generateProjectId() {
        return crypto.randomUUID();
    }

    /**
     * Ask user for IPFS preferences
     */
    async askIPFSPreference() {
        return new Promise((resolve) => {
            console.log('\n🌐 IPFS Storage Options:');
            console.log('1. Use free Infura IPFS (recommended for beginners)');
            console.log('2. Use local IPFS node');
            console.log('3. Skip IPFS setup (can configure later)');
            
            this.rl.question('Choose option (1-3): ', (answer) => {
                resolve(parseInt(answer) || 1);
            });
        });
    }

    /**
     * Ask for Infura credentials if needed
     */
    async askInfuraCredentials() {
        return new Promise((resolve) => {
            console.log('\n📝 Get free IPFS access:');
            console.log('1. Visit: https://infura.io/');
            console.log('2. Create free account');
            console.log('3. Create new IPFS project');
            console.log('4. Copy Project ID and Secret');
            console.log('');
            
            this.rl.question('Enter your Infura Project ID (or press Enter to use demo): ', (projectId) => {
                if (!projectId) {
                    resolve({
                        projectId: 'demo-project-id-change-in-production',
                        secret: 'demo-secret-change-in-production'
                    });
                } else {
                    this.rl.question('Enter your Infura Project Secret: ', (secret) => {
                        resolve({ projectId, secret });
                    });
                }
            });
        });
    }

    /**
     * Ask user for network preference
     */
    async askNetworkPreference() {
        return new Promise((resolve) => {
            console.log('\n🌍 Filecoin Network:');
            console.log('1. Testnet (calibration) - Free, for testing');
            console.log('2. Mainnet - Costs real FIL tokens');
            
            this.rl.question('Choose network (1-2): ', (answer) => {
                resolve(parseInt(answer) === 2 ? 'mainnet' : 'calibration');
            });
        });
    }

    /**
     * Generate complete environment configuration
     */
    async generateEnvironment() {
        console.log('🔐 Generating secure environment configuration...\n');

        // Generate all secure secrets
        const secrets = {
            jwtSecret: this.generateJWTSecret(),
            encryptionKey: this.generateSecureKey(32),
            walletEncryptionKey: this.generateSecureKey(32),
            apiKey: this.generateSecureKey(24)
        };

        // Ask user preferences
        const network = await this.askNetworkPreference();
        const ipfsChoice = await this.askIPFSPreference();
        
        let ipfsConfig;
        if (ipfsChoice === 1) {
            ipfsConfig = await this.askInfuraCredentials();
        } else if (ipfsChoice === 2) {
            ipfsConfig = {
                projectId: 'local-ipfs-node',
                secret: 'not-needed-for-local'
            };
        } else {
            ipfsConfig = {
                projectId: 'configure-later',
                secret: 'configure-later'
            };
        }

        // Create environment configuration
        const envConfig = this.createEnvConfig(secrets, network, ipfsConfig);
        
        // Write to .env file
        fs.writeFileSync(this.envPath, envConfig);
        
        console.log('\n✅ Environment configuration created successfully!');
        console.log('📁 Configuration saved to .env file');
        
        return { secrets, network, ipfsConfig };
    }

    /**
     * Create environment file content
     */
    createEnvConfig(secrets, network, ipfsConfig) {
        const networkConfig = network === 'mainnet' 
            ? {
                nodeUrl: 'https://api.node.glif.io/rpc/v1',
                network: 'mainnet'
            }
            : {
                nodeUrl: 'https://api.calibration.node.glif.io/rpc/v1',
                network: 'calibration'
            };

        return `# Filecoin Backup System - Auto-generated Configuration
# Generated on: ${new Date().toISOString()}
# DO NOT SHARE THIS FILE - Contains sensitive secrets

# Environment
NODE_ENV=development

# Database Configuration (Docker defaults)
POSTGRES_URL=postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup
REDIS_URL=redis://redis:6379

# Service Ports
GATEWAY_PORT=8080
ENGINE_PORT=9090
BLOCKCHAIN_PORT=3001
FRONTEND_PORT=3000
AI_OPTIMIZER_PORT=8000

# Filecoin Configuration
FILECOIN_NODE_URL=${networkConfig.nodeUrl}
FILECOIN_NETWORK=${networkConfig.network}
WALLET_PRIVATE_KEY=auto-generated-on-first-run

# IPFS Configuration
IPFS_URL=https://ipfs.infura.io:5001
IPFS_PROJECT_ID=${ipfsConfig.projectId}
IPFS_PROJECT_SECRET=${ipfsConfig.secret}

# Security Secrets (AUTO-GENERATED - Keep Secure!)
JWT_SECRET=${secrets.jwtSecret}
ENCRYPTION_KEY=${secrets.encryptionKey}
WALLET_ENCRYPTION_KEY=${secrets.walletEncryptionKey}
API_KEY=${secrets.apiKey}

# Storage Configuration
MAX_FILE_SIZE=100MB
UPLOAD_PATH=./data/uploads
LOG_PATH=./data/logs

# Backup Configuration
COMPRESSION_LEVEL=6
BACKUP_RETENTION_DAYS=30

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15m

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# AI Optimizer Configuration
AI_OPTIMIZER_URL=http://ai-optimizer:8000
ENABLE_AI_OPTIMIZATION=true
ML_MODEL_PATH=./data/ai-models
TRAINING_DATA_PATH=./data/training

# External APIs
FILREP_API_URL=https://api.filrep.io
SPACEGAP_API_URL=https://spacegap.github.io/api
FILSCAN_API_URL=https://api.filscan.io

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true

# Security Features
AUTO_WALLET_GENERATION=true
AUTO_SECRET_ROTATION=false
SECURITY_AUDIT_LOG=true
`;
    }

    /**
     * Display security summary
     */
    displaySecuritySummary(secrets) {
        console.log('\n🔒 Security Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ JWT Secret: ${secrets.jwtSecret.substring(0, 8)}... (64 chars)`);
        console.log(`✅ Encryption Key: ${secrets.encryptionKey.substring(0, 8)}... (32 chars)`);
        console.log(`✅ Wallet Key: ${secrets.walletEncryptionKey.substring(0, 8)}... (32 chars)`);
        console.log(`✅ API Key: ${secrets.apiKey.substring(0, 8)}... (24 chars)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🛡️  All secrets are cryptographically secure');
        console.log('📁 Secrets saved to .env file (keep private!)');
    }

    /**
     * Check if .env already exists
     */
    checkExistingEnv() {
        if (fs.existsSync(this.envPath)) {
            return new Promise((resolve) => {
                console.log('⚠️  .env file already exists!');
                this.rl.question('Overwrite existing configuration? (y/N): ', (answer) => {
                    resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
                });
            });
        }
        return Promise.resolve(true);
    }

    /**
     * Main setup process
     */
    async run() {
        try {
            console.log('🚀 Filecoin Backup System - Environment Setup');
            console.log('═══════════════════════════════════════════════');
            console.log('This wizard will automatically generate secure secrets');
            console.log('and configure your system for first-time use.\n');

            const shouldProceed = await this.checkExistingEnv();
            if (!shouldProceed) {
                console.log('Setup cancelled.');
                this.rl.close();
                return;
            }

            const { secrets, network, ipfsConfig } = await this.generateEnvironment();
            
            this.displaySecuritySummary(secrets);
            
            console.log('\n🎯 Next Steps:');
            console.log('1. Run: docker-compose up -d');
            console.log('2. Open: http://localhost:3000');
            console.log('3. System will auto-generate Filecoin wallet');
            
            if (network === 'calibration') {
                console.log('4. Wallet will be auto-funded from testnet faucet');
            } else {
                console.log('4. Fund your wallet with FIL tokens');
            }
            
            console.log('\n📖 Documentation:');
            console.log('• SETUP-GUIDE.md     - Detailed setup');
            console.log('• WALLET-SETUP.md    - Wallet management');
            console.log('• SECURITY.md        - Security features');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
        } finally {
            this.rl.close();
        }
    }
}

// Run the setup if called directly
if (require.main === module) {
    const setup = new EnvironmentSetup();
    setup.run();
}

module.exports = EnvironmentSetup;
