const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const cliRoutes = require('./src/cli');
const webRoutes = require('./src/web/app');
const apiClient = require('./src/api/client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'src/web/public')));

// Also serve JS files directly from root for compatibility
app.use('/metamask.js', express.static(path.join(__dirname, 'src/web/public/metamask.js')));
app.use('/ui.js', express.static(path.join(__dirname, 'src/web/public/ui.js')));
app.use('/dashboard.js', express.static(path.join(__dirname, 'src/web/public/dashboard.js')));
app.use('/styles.css', express.static(path.join(__dirname, 'src/web/public/styles.css')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'frontend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/cli', cliRoutes);
app.use('/api/v1/web', webRoutes);

// Test API client connectivity
app.get('/api/v1/test', async (req, res) => {
  try {
    const gatewayStatus = await apiClient.getGatewayStatus();
    res.json({
      status: 'connected',
      gateway: gatewayStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

// Serve web dashboard (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/web/public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend service running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
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
