const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const walletRoutes = require('./src/wallet');
const walletManagerRoutes = require('./src/wallet-manager');
const filecoinRoutes = require('./src/filecoin');
const storageRoutes = require('./src/storage');
const optimizerRoutes = require('./src/ai-optimizer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'blockchain',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/wallet-manager', walletManagerRoutes);
app.use('/api/v1/filecoin', filecoinRoutes);
app.use('/api/v1/storage', storageRoutes);
app.use('/api/v1/optimize', optimizerRoutes);

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
