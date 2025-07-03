import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './utils/logger.js';

export class FileWatcher {
  constructor(watchDir, carProcessor, cidManager = null) {
    this.watchDir = watchDir;
    this.carProcessor = carProcessor;
    this.cidManager = cidManager;
    this.watcher = null;
    this.processing = new Set(); // Track files currently being processed
    this.processQueue = []; // Queue for files to process
    this.isRunning = false;
    this.processingInterval = null;
    
    // Configuration
    this.config = {
      ignoreInitial: true,
      persistent: true,
      ignored: [
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.tmp',
        '**/*.temp',
        '**/.*' // Ignore hidden files
      ],
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2 seconds after last change
        pollInterval: 100
      }
    };
  }

  async start() {
    try {
      logger.info(`Starting file watcher for directory: ${this.watchDir}`);
      
      // Ensure watch directory exists
      await fs.ensureDir(this.watchDir);
      
      // Initialize watcher
      this.watcher = chokidar.watch(this.watchDir, this.config);
      
      // Set up event handlers
      this.watcher
        .on('add', (filePath) => this.handleFileAdd(filePath))
        .on('change', (filePath) => this.handleFileChange(filePath))
        .on('unlink', (filePath) => this.handleFileRemove(filePath))
        .on('error', (error) => this.handleError(error))
        .on('ready', () => {
          logger.info('File watcher is ready and watching for changes');
          this.isRunning = true;
        });

      // Start processing queue
      this.startProcessingQueue();
      
      return true;
    } catch (error) {
      logger.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  async stop() {
    try {
      logger.info('Stopping file watcher...');
      
      this.isRunning = false;
      
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }
      
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }
      
      // Wait for current processing to complete
      while (this.processing.size > 0) {
        logger.info(`Waiting for ${this.processing.size} files to finish processing...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      logger.info('File watcher stopped successfully');
    } catch (error) {
      logger.error('Error stopping file watcher:', error);
      throw error;
    }
  }

  async handleFileAdd(filePath) {
    try {
      logger.info(`New file detected: ${filePath}`);
      
      // Check if file is valid for processing
      if (await this.shouldProcessFile(filePath)) {
        this.queueFileForProcessing(filePath, 'add');
      }
    } catch (error) {
      logger.error(`Error handling file add for ${filePath}:`, error);
    }
  }

  async handleFileChange(filePath) {
    try {
      logger.info(`File changed: ${filePath}`);
      
      // Check if file is valid for processing
      if (await this.shouldProcessFile(filePath)) {
        this.queueFileForProcessing(filePath, 'change');
      }
    } catch (error) {
      logger.error(`Error handling file change for ${filePath}:`, error);
    }
  }

  async handleFileRemove(filePath) {
    try {
      logger.info(`File removed: ${filePath}`);
      
      // Remove from processing queue if present
      this.processQueue = this.processQueue.filter(item => item.filePath !== filePath);
      
      // Remove from currently processing set
      this.processing.delete(filePath);
      
    } catch (error) {
      logger.error(`Error handling file removal for ${filePath}:`, error);
    }
  }

  handleError(error) {
    logger.error('File watcher error:', error);
  }

  async shouldProcessFile(filePath) {
    try {
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        return false;
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Only process files, not directories
      if (!stats.isFile()) {
        return false;
      }

      // Check file size (avoid processing very small files)
      if (stats.size < 1024) { // Less than 1KB
        logger.debug(`Skipping small file: ${filePath} (${stats.size} bytes)`);
        return false;
      }

      // Check if file is already being processed
      if (this.processing.has(filePath)) {
        logger.debug(`File already being processed: ${filePath}`);
        return false;
      }

      // Check file extension (customize based on your needs)
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', // Images
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', // Videos
        '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', // Audio
        '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', // Documents
        '.zip', '.rar', '.7z', '.tar', '.gz', // Archives
        '.json', '.xml', '.csv', '.xlsx', '.xls', // Data files
        '.bin', '.dat', '.iso', '.img' // Other binary files
      ];

      if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
        logger.debug(`Skipping file with unsupported extension: ${filePath}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Error checking if file should be processed: ${filePath}`, error);
      return false;
    }
  }

  queueFileForProcessing(filePath, action) {
    // Remove existing entries for this file
    this.processQueue = this.processQueue.filter(item => item.filePath !== filePath);
    
    // Add to queue
    this.processQueue.push({
      filePath,
      action,
      timestamp: Date.now(),
      retries: 0
    });

    logger.debug(`Queued file for processing: ${filePath} (action: ${action})`);
  }

  startProcessingQueue() {
    this.processingInterval = setInterval(async () => {
      if (!this.isRunning || this.processQueue.length === 0) {
        return;
      }

      // Process one file at a time to avoid overwhelming the system
      if (this.processing.size > 0) {
        return;
      }

      const item = this.processQueue.shift();
      if (!item) {
        return;
      }

      await this.processQueueItem(item);
    }, 1000); // Check queue every second
  }

  async processQueueItem(item) {
    const { filePath, action, retries } = item;
    
    try {
      // Check if file still exists
      if (!await fs.pathExists(filePath)) {
        logger.debug(`File no longer exists, skipping: ${filePath}`);
        return;
      }

      // Mark as processing
      this.processing.add(filePath);
      
      logger.info(`Processing file: ${filePath} (action: ${action})`);
      
      // Wait a bit to ensure file is fully written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Process the file
      const result = await this.carProcessor.processFile(filePath, {
        watcherAction: action,
        queuedAt: new Date(item.timestamp).toISOString(),
        processedAt: new Date().toISOString()
      });
      
      // Store CID metadata if cidManager is available
      if (this.cidManager) {
        try {
          await this.cidManager.storeCID(result.rootCID, {
            originalPath: filePath,
            carPath: result.carPath,
            size: result.size,
            metadata: result.metadata
          });
        } catch (cidError) {
          logger.warn(`Failed to store CID metadata for ${filePath}:`, cidError);
          // Don't fail the entire processing if CID storage fails
        }
      }
      
      logger.info(`Successfully processed file: ${filePath}`);
      logger.info(`Generated CAR with CID: ${result.rootCID}`);
      
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      
      // Retry logic
      if (retries < 3) {
        logger.info(`Retrying file processing: ${filePath} (attempt ${retries + 1})`);
        
        // Re-queue with increased retry count
        setTimeout(() => {
          this.processQueue.push({
            ...item,
            retries: retries + 1
          });
        }, 5000 * (retries + 1)); // Exponential backoff
      } else {
        logger.error(`Max retries exceeded for file: ${filePath}`);
      }
    } finally {
      // Remove from processing set
      this.processing.delete(filePath);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      watchDir: this.watchDir,
      queueLength: this.processQueue.length,
      currentlyProcessing: Array.from(this.processing),
      processedCount: this.carProcessor?.processedCARs?.size || 0
    };
  }

  getProcessingQueue() {
    return this.processQueue.map(item => ({
      filePath: item.filePath,
      action: item.action,
      queuedAt: new Date(item.timestamp).toISOString(),
      retries: item.retries
    }));
  }

  async forceProcessFile(filePath) {
    try {
      if (!await fs.pathExists(filePath)) {
        throw new Error('File does not exist');
      }

      if (this.processing.has(filePath)) {
        throw new Error('File is already being processed');
      }

      logger.info(`Force processing file: ${filePath}`);
      
      this.processing.add(filePath);
      
      const result = await this.carProcessor.processFile(filePath, {
        watcherAction: 'manual',
        processedAt: new Date().toISOString()
      });
      
      // Store CID metadata if cidManager is available  
      if (this.cidManager) {
        try {
          await this.cidManager.storeCID(result.rootCID, {
            originalPath: filePath,
            carPath: result.carPath,
            size: result.size,
            metadata: result.metadata
          });
        } catch (cidError) {
          logger.warn(`Failed to store CID metadata for ${filePath}:`, cidError);
          // Don't fail the entire processing if CID storage fails
        }
      }
      
      this.processing.delete(filePath);
      
      return result;
    } catch (error) {
      this.processing.delete(filePath);
      throw error;
    }
  }
}
