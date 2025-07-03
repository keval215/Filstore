import { spawn } from 'child_process';
import { CarReader } from '@ipld/car';
import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { logger } from './utils/logger.js';
import { database } from './database.js';

export class CARProcessor {
  constructor(config) {
    this.config = config;
    this.processing = false;
    this.lastProcessed = null;
    this.errors = [];
  }

  isProcessing() {
    return this.processing;
  }

  getLastProcessed() {
    return this.lastProcessed;
  }

  getErrors() {
    return this.errors.slice(-10); // Return last 10 errors
  }

  async processFile(filePath, metadata = {}) {
    this.processing = true;
    
    try {
      logger.info(`Processing file: ${filePath}`);
      
      // Validate file exists and get stats
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // Generate CAR file path
      const filename = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const carFilename = `${filename}-${timestamp}.car`;
      const carPath = path.join(this.config.carDir, carFilename);

      // Create CAR file
      const result = await this.createCAR(filePath, carPath, metadata);
      
      // Store processing result in database
      const carFileData = {
        rootCid: result.rootCID,
        carCid: result.pieceCID, // Using piece CID as car CID for now
        filePath,
        carPath,
        originalSize: stats.size,
        carSize: result.size,
        status: 'created',
        metadata: {
          ...metadata,
          compressionRatio: stats.size > 0 ? result.size / stats.size : 1,
          pieceSize: result.pieceSize,
          timestamp: new Date().toISOString()
        }
      };

      const dbResult = await database.createCarFile(carFileData);
      
      const processResult = {
        id: dbResult.id,
        originalPath: filePath,
        carPath,
        rootCID: result.rootCID,
        size: result.size,
        pieceSize: result.pieceSize,
        pieceCID: result.pieceCID,
        timestamp: dbResult.created_at,
        metadata: dbResult.metadata
      };

      this.lastProcessed = processResult;
      
      logger.info(`Successfully processed file to CAR: ${carFilename}`);
      logger.info(`Root CID: ${result.rootCID}`);
      
      return processResult;
      
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      this.errors.push({
        timestamp: new Date().toISOString(),
        filePath,
        error: error.message
      });
      throw error;
    } finally {
      this.processing = false;
    }
  }

  async createCAR(inputPath, outputPath, metadata = {}) {
    try {
      // Check if input is a directory or file
      const stats = await fs.stat(inputPath);
      
      let packInput;
      if (stats.isDirectory()) {
        packInput = inputPath;
      } else {
        // For single files, we need to create a temporary directory structure
        const tempDir = path.join(this.config.tempDir, `pack-${Date.now()}`);
        await fs.ensureDir(tempDir);
        const tempFile = path.join(tempDir, path.basename(inputPath));
        await fs.copy(inputPath, tempFile);
        packInput = tempDir;
      }

      // Pack into CAR format
      const { root, car } = await pack({
        input: packInput,
        wrapWithDirectory: true,
        blockstore: null // Use default blockstore
      });

      // Write CAR file
      const carFile = fs.createWriteStream(outputPath);
      
      await new Promise((resolve, reject) => {
        car.pipe(carFile);
        car.on('end', resolve);
        car.on('error', reject);
        carFile.on('error', reject);
      });

      // Get file size
      const carStats = await fs.stat(outputPath);
      
      // Calculate piece CID (simplified - in production, use proper piece commitment)
      const pieceCID = await this.calculatePieceCID(outputPath);
      
      // Clean up temp directory if created
      if (!stats.isDirectory()) {
        const tempDir = path.join(this.config.tempDir, `pack-${Date.now()}`);
        await fs.remove(tempDir).catch(() => {}); // Ignore errors
      }

      return {
        rootCID: root.toString(),
        pieceCID,
        size: carStats.size,
        pieceSize: this.calculatePieceSize(carStats.size),
        carPath: outputPath
      };
      
    } catch (error) {
      logger.error('Error creating CAR:', error);
      throw error;
    }
  }

  async verifyCAR(carPath) {
    try {
      const carFile = await fs.readFile(carPath);
      const reader = await CarReader.fromBytes(carFile);
      
      // Verify structure
      const roots = await reader.getRoots();
      if (roots.length === 0) {
        throw new Error('CAR file has no roots');
      }

      // Verify blocks can be read
      let blockCount = 0;
      for await (const { cid, bytes } of reader.blocks()) {
        blockCount++;
        if (blockCount > 1000) break; // Limit check for large files
      }

      logger.info(`CAR verification passed: ${blockCount} blocks verified`);
      return true;
      
    } catch (error) {
      logger.error(`CAR verification failed for ${carPath}:`, error);
      return false;
    }
  }

  async listProcessedCARs(limit = 50, offset = 0) {
    try {
      const cars = await database.listCarFiles({ limit, offset });
      
      // Transform database results to match expected format
      return cars.map(car => ({
        id: car.id,
        originalPath: car.file_path,
        carPath: car.car_path,
        rootCID: car.root_cid,
        size: car.car_size,
        originalSize: car.original_size,
        pieceCID: car.car_cid, // Using car_cid as piece CID
        timestamp: car.created_at,
        status: car.status,
        metadata: car.metadata
      }));
    } catch (error) {
      logger.error('Error listing processed CARs:', error);
      throw error;
    }
  }

  async cleanup(olderThan) {
    try {
      const cutoffTime = this.parseDuration(olderThan);
      const cutoffDate = new Date(Date.now() - cutoffTime);
      
      let cleanedFiles = 0;
      let freedSpace = 0;

      // Get old CAR files from database
      const allCars = await database.listCarFiles();
      const oldCars = allCars.filter(car => new Date(car.created_at) < cutoffDate);

      // Clean up CAR files
      for (const car of oldCars) {
        try {
          const stats = await fs.stat(car.car_path);
          freedSpace += stats.size;
          
          // Remove file from filesystem
          await fs.remove(car.car_path);
          
          // Remove from database
          await database.deleteCarFile(car.id);
          
          cleanedFiles++;
          logger.info(`Cleaned up old CAR file: ${car.car_path}`);
        } catch (error) {
          logger.warn(`Failed to cleanup CAR file ${car.car_path}:`, error);
        }
      }

      // Clean up temp files
      const tempFiles = await fs.readdir(this.config.tempDir);
      for (const file of tempFiles) {
        const filePath = path.join(this.config.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.remove(filePath);
          logger.info(`Cleaned up temp file: ${file}`);
        }
      }

      return {
        cleanedFiles,
        freedSpace,
        cutoffDate: cutoffDate.toISOString()
      };
      
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }

  async calculatePieceCID(carPath) {
    try {
      // Simplified piece CID calculation
      // In production, use proper Filecoin piece commitment calculation
      const carData = await fs.readFile(carPath);
      const hash = createHash('sha256').update(carData).digest('hex');
      return `baga6ea4seaq${hash.substring(0, 32)}`; // Simplified format
    } catch (error) {
      logger.error('Error calculating piece CID:', error);
      return null;
    }
  }

  calculatePieceSize(size) {
    // Calculate next power of 2 for piece size (Filecoin requirement)
    let pieceSize = 256; // Minimum piece size
    while (pieceSize < size) {
      pieceSize *= 2;
    }
    return pieceSize;
  }

  parseDuration(duration) {
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      throw new Error('Invalid duration format. Use format like "7d", "24h", "60m"');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000; // minutes
      case 'h': return value * 60 * 60 * 1000; // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      default: throw new Error('Invalid duration unit');
    }
  }

  async getProcessingStats() {
    try {
      const dbStats = await database.getCarStats();
      
      return {
        totalProcessed: parseInt(dbStats.total_files) || 0,
        createdFiles: parseInt(dbStats.created_files) || 0,
        verifiedFiles: parseInt(dbStats.verified_files) || 0,
        failedFiles: parseInt(dbStats.failed_files) || 0,
        totalOriginalSize: parseInt(dbStats.total_original_size) || 0,
        totalCarSize: parseInt(dbStats.total_car_size) || 0,
        avgCompressionRatio: parseFloat(dbStats.avg_compression_ratio) || 0,
        isProcessing: this.processing,
        lastProcessed: this.lastProcessed,
        errorCount: this.errors.length
      };
    } catch (error) {
      logger.error('Error getting processing stats:', error);
      return {
        totalProcessed: 0,
        isProcessing: this.processing,
        lastProcessed: this.lastProcessed,
        errorCount: this.errors.length
      };
    }
  }

  calculateAverageProcessingTime() {
    // Simplified - in production, track actual processing times
    return 0;
  }
}
