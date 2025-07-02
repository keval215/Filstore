const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import the new clean routers
const walletRoutes = require('./src/wallet/wallet.router');
const filecoinRoutes = require('./src/filecoin/filecoin.router');
const storageRoutes = require('./src/storage/storage.router');

// Initialize wallet service on startup
const WalletService = require('./src/wallet/wallet.service');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize wallets on startup (async initialization)
async function initializeWallets() {
    try {
        console.log('🚀 Initializing blockchain service wallets...');
        const walletService = new WalletService();
        
        // Initialize both wallets
        const testnetWallet = await walletService.getOrCreateWallet('calibration');
        const mainnetWallet = await walletService.getOrCreateWallet('mainnet');
        
        console.log('✅ Wallets initialized:');
        console.log(`   🧪 Testnet:  ${testnetWallet.address}`);
        console.log(`   🌐 Mainnet:  ${mainnetWallet.address}`);
        
        return { testnetWallet, mainnetWallet };
    } catch (error) {
        console.error('❌ Wallet initialization failed:', error.message);
        // Don't exit - service can still run for other operations
    }
}

// Initialize wallets (non-blocking)
initializeWallets();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'blockchain',
    version: '2.0.0',
    network: process.env.FILECOIN_NETWORK || 'calibration',
    timestamp: new Date().toISOString()
  });
});

// API routes - clean and consolidated
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/filecoin', filecoinRoutes);
app.use('/api/v1/storage', storageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Blockchain service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
