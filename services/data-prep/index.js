import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { CARProcessor } from './src/car-processor.js';
import { FileWatcher } from './src/file-watcher.js';
import { CIDManager } from './src/cid-manager.js';
import { logger } from './src/utils/logger.js';
import { database } from './src/database.js';
import { walletAuth, requireAuth, getWalletAddress } from './src/middleware/wallet-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration
const config = {
  uploadsDir: process.env.UPLOAD_DIR || '/app/uploads',
  carDir: process.env.CAR_OUTPUT_DIR || '/app/cars',
  tempDir: process.env.TEMP_DIR || '/app/temp',
  maxFileSize: process.env.MAX_FILE_SIZE || '1GB',
  chunkSize: process.env.CHUNK_SIZE || '32GB',
  autoCleanup: process.env.AUTO_CLEANUP === 'true',
  watchMode: process.env.WATCH_MODE !== 'false',
  postgresUrl: process.env.POSTGRES_URL || 'postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Web3 Authentication - ONLY authentication method
app.use(walletAuth);

// Initialize services
let carProcessor, fileWatcher, cidManager;

async function initializeServices() {
  try {
    // Connect to database with retry logic
    const databaseUrl = process.env.DATABASE_URL || 'postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup';
    logger.info('Initializing database connection...');
    
    try {
      await database.connect(databaseUrl);
      logger.info('Database connected successfully');
    } catch (dbError) {
      logger.warn('Database connection failed, continuing without database:', dbError.message);
      // Don't exit - allow service to run without database for now
    }

    // Ensure directories exist
    await fs.ensureDir(config.uploadsDir);
    await fs.ensureDir(config.carDir);
    await fs.ensureDir(config.tempDir);

    // Initialize services
    carProcessor = new CARProcessor(config);
    cidManager = new CIDManager(config);
    
    if (config.watchMode) {
      try {
        fileWatcher = new FileWatcher(config.uploadsDir, carProcessor, cidManager);
        await fileWatcher.start();
        logger.info('File watcher started');
      } catch (watcherError) {
        logger.warn('File watcher failed to start:', watcherError.message);
      }
    }

    logger.info('Data preparation services initialized (some services may be degraded if database is unavailable)');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    logger.error('Service will continue running with limited functionality');
    // Don't exit - let the service try to run
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: database.isConnected ? 'connected' : 'disconnected',
      carProcessor: carProcessor ? 'available' : 'unavailable',
      fileWatcher: fileWatcher ? 'available' : 'unavailable',
      cidManager: cidManager ? 'available' : 'unavailable'
    },
    config: {
      uploadsDir: config.uploadsDir,
      carDir: config.carDir,
      watchMode: config.watchMode
    }
  };

  // Set status based on critical services
  if (!database.isConnected) {
    health.status = 'degraded';
    health.warning = 'Database not connected - some features may be limited';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Get service status
app.get('/status', async (req, res) => {
  try {
    const [uploadsCount, carCount] = await Promise.all([
      fs.readdir(config.uploadsDir).then(files => files.length).catch(() => 0),
      fs.readdir(config.carDir).then(files => files.length).catch(() => 0)
    ]);

    // Get processing statistics
    const processingStats = await carProcessor.getProcessingStats();
    
    // Get file watcher status if available
    const watcherStatus = fileWatcher ? fileWatcher.getStatus() : null;

    res.json({
      uploadsCount,
      carCount,
      processing: carProcessor?.isProcessing() || false,
      lastProcessed: carProcessor?.getLastProcessed(),
      errors: carProcessor?.getErrors() || [],
      stats: processingStats,
      watcher: watcherStatus,
      database: {
        connected: database.isConnected
      }
    });
  } catch (error) {
    logger.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Manual CAR creation - Requires Web3 authentication
app.post('/car/create', requireAuth, async (req, res) => {
  try {
    const { filePath, metadata = {} } = req.body;
    const walletAddress = getWalletAddress(req);
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const fullPath = path.resolve(config.uploadsDir, filePath);
    
    // Check if file exists
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    logger.info(`Creating CAR for: ${fullPath} (wallet: ${walletAddress})`);
    const result = await carProcessor.processFile(fullPath, {
      ...metadata,
      walletAddress,
      createdBy: walletAddress
    });
    
    // Store CID metadata
    try {
      await cidManager.storeCID(result.rootCID, {
        originalPath: fullPath,
        carPath: result.carPath,
        size: result.size,
        metadata: result.metadata
      });
    } catch (cidError) {
      logger.warn('Failed to store CID metadata:', cidError);
      // Don't fail the entire request if CID storage fails
    }
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error creating CAR:', error);
    res.status(500).json({ 
      error: 'Failed to create CAR',
      details: error.message 
    });
  }
});

// Get CID information
app.get('/cid/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const info = await cidManager.getCIDInfo(cid);
    
    if (!info) {
      return res.status(404).json({ error: 'CID not found' });
    }

    res.json(info);
  } catch (error) {
    logger.error('Error getting CID info:', error);
    res.status(500).json({ 
      error: 'Failed to get CID information',
      details: error.message 
    });
  }
});

// Search CIDs
app.get('/cids/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 50, offset = 0 } = req.query;
    const results = await cidManager.searchCIDs({ searchTerm, limit: parseInt(limit), offset: parseInt(offset) });
    
    res.json(results);
  } catch (error) {
    logger.error('Error searching CIDs:', error);
    res.status(500).json({ 
      error: 'Failed to search CIDs',
      details: error.message 
    });
  }
});

// CID statistics
app.get('/cids/stats', async (req, res) => {
  try {
    const stats = await cidManager.getStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting CID statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get CID statistics',
      details: error.message 
    });
  }
});

// List processed CARs
app.get('/cars', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const cars = await carProcessor.listProcessedCARs(parseInt(limit), parseInt(offset));
    
    res.json({
      cars,
      total: cars.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error listing CARs:', error);
    res.status(500).json({ 
      error: 'Failed to list CARs',
      details: error.message 
    });
  }
});

// Verify CAR file - Requires Web3 authentication for security
app.post('/car/verify', requireAuth, async (req, res) => {
  try {
    const { carPath } = req.body;
    const walletAddress = getWalletAddress(req);
    
    if (!carPath) {
      return res.status(400).json({ error: 'carPath is required' });
    }

    const fullPath = path.resolve(config.carDir, carPath);
    const isValid = await carProcessor.verifyCAR(fullPath);
    
    logger.info(`CAR verification requested by ${walletAddress}: ${carPath} (valid: ${isValid})`);
    
    res.json({
      valid: isValid,
      carPath: fullPath,
      verifiedBy: walletAddress
    });
  } catch (error) {
    logger.error('Error verifying CAR:', error);
    res.status(500).json({ 
      error: 'Failed to verify CAR',
      details: error.message 
    });
  }
});

// Cleanup old files - Requires Web3 authentication for security
app.delete('/cleanup', requireAuth, async (req, res) => {
  try {
    const { olderThan = '7d' } = req.body;
    const walletAddress = getWalletAddress(req);
    const result = await carProcessor.cleanup(olderThan);
    
    logger.info(`Cleanup operation performed by ${walletAddress}: removed files older than ${olderThan}`);
    
    res.json({
      success: true,
      performedBy: walletAddress,
      ...result
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup',
      details: error.message 
    });
  }
});

// File watcher control endpoints - Require Web3 authentication

// Start file watcher
app.post('/watcher/start', requireAuth, async (req, res) => {
  try {
    const { watchDir } = req.body;
    const walletAddress = getWalletAddress(req);
    
    if (!fileWatcher) {
      return res.status(400).json({ error: 'File watcher not available' });
    }

    const targetDir = watchDir || config.uploadsDir;
    await fileWatcher.start(targetDir);
    
    logger.info(`File watcher started by ${walletAddress} for directory: ${targetDir}`);
    
    res.json({
      success: true,
      message: 'File watcher started',
      watchDir: targetDir,
      startedBy: walletAddress
    });
  } catch (error) {
    logger.error('Error starting file watcher:', error);
    res.status(500).json({ 
      error: 'Failed to start file watcher',
      details: error.message 
    });
  }
});

// Stop file watcher
app.post('/watcher/stop', requireAuth, async (req, res) => {
  try {
    const walletAddress = getWalletAddress(req);
    
    if (!fileWatcher) {
      return res.status(400).json({ error: 'File watcher not available' });
    }

    await fileWatcher.stop();
    
    logger.info(`File watcher stopped by ${walletAddress}`);
    
    res.json({
      success: true,
      message: 'File watcher stopped',
      stoppedBy: walletAddress
    });
  } catch (error) {
    logger.error('Error stopping file watcher:', error);
    res.status(500).json({ 
      error: 'Failed to stop file watcher',
      details: error.message 
    });
  }
});

// Get file watcher status
app.get('/watcher/status', (req, res) => {
  try {
    if (!fileWatcher) {
      return res.json({
        available: false,
        message: 'File watcher not available'
      });
    }

    const status = fileWatcher.getStatus();
    res.json({
      available: true,
      ...status
    });
  } catch (error) {
    logger.error('Error getting watcher status:', error);
    res.status(500).json({ 
      error: 'Failed to get watcher status',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (fileWatcher) {
    await fileWatcher.stop();
  }
  
  await database.disconnect();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (fileWatcher) {
    await fileWatcher.stop();
  }
  
  await database.disconnect();
  
  process.exit(0);
});

// Start server
async function start() {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`Data preparation service running on port ${PORT}`);
    logger.info(`Watching uploads directory: ${config.uploadsDir}`);
    logger.info(`CAR output directory: ${config.carDir}`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
