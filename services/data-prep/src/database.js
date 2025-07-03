/**
 * Database connection and utilities for data-prep service
 */

import pg from 'pg';
import { logger } from './utils/logger.js';

const { Pool } = pg;

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgres://filecoin_user:filecoin_pass@postgres:5432/filecoin_backup';

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  async connect(connectionString) {
    try {
      logger.info('Attempting database connection...');
      
      this.pool = new Pool({
        connectionString: POSTGRES_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000, // Increased timeout
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      });

      // Test connection with retry logic
      await this.testConnection();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Database connected successfully');
      
      // Handle connection errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected database error:', err);
        this.isConnected = false;
        this.scheduleReconnect();
      });
      
    } catch (error) {
      logger.error('Database connection failed:', error);
      this.isConnected = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        logger.error('Max reconnection attempts reached. Database connection failed permanently.');
        throw error;
      }
    }
  }

  async testConnection() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection test successful');
    } finally {
      client.release();
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    logger.info(`Scheduling database reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.testConnection();
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Database reconnection successful');
      } catch (error) {
        logger.warn('Database reconnection failed:', error.message);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database disconnected');
    }
  }

  async query(text, params) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Please check database connection.');
    }
    
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Query executed', { duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query failed:', { query: text.substring(0, 100), error: error.message });
      
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === '57P01') {
        this.isConnected = false;
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // CAR Files operations
  async createCarFile(data) {
    const query = `
      INSERT INTO car_files (
        backup_job_id, root_cid, car_cid, file_path, car_path,
        original_size, car_size, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.backupJobId || null,
      data.rootCid,
      data.carCid,
      data.filePath,
      data.carPath,
      data.originalSize,
      data.carSize,
      data.status || 'created',
      JSON.stringify(data.metadata || {})
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updateCarFile(id, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'metadata') {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    values.push(id);
    const query = `
      UPDATE car_files 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getCarFile(id) {
    const query = 'SELECT * FROM car_files WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  async getCarFileByRootCid(rootCid) {
    const query = 'SELECT * FROM car_files WHERE root_cid = $1';
    const result = await this.query(query, [rootCid]);
    return result.rows[0];
  }

  async listCarFiles(options = {}) {
    let query = 'SELECT * FROM car_files';
    const conditions = [];
    const values = [];

    if (options.status) {
      conditions.push(`status = $${conditions.length + 1}`);
      values.push(options.status);
    }

    if (options.backupJobId) {
      conditions.push(`backup_job_id = $${conditions.length + 1}`);
      values.push(options.backupJobId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ` LIMIT ${parseInt(options.limit)}`;
    }

    const result = await this.query(query, values);
    return result.rows;
  }

  async deleteCarFile(id) {
    const query = 'DELETE FROM car_files WHERE id = $1 RETURNING *';
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // CID Metadata operations
  async createCidMetadata(data) {
    const query = `
      INSERT INTO cid_metadata (
        cid, car_file_id, cid_type, parent_cid, file_path, size, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      data.cid,
      data.carFileId,
      data.cidType,
      data.parentCid || null,
      data.filePath || null,
      data.size || null,
      JSON.stringify(data.metadata || {})
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getCidMetadata(cid) {
    const query = 'SELECT * FROM cid_metadata WHERE cid = $1';
    const result = await this.query(query, [cid]);
    return result.rows;
  }

  async searchCids(searchTerm) {
    const query = `
      SELECT * FROM cid_metadata 
      WHERE cid ILIKE $1 OR file_path ILIKE $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await this.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  // Statistics
  async getCarStats() {
    const query = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN status = 'created' THEN 1 END) as created_files,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_files,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_files,
        COALESCE(SUM(original_size), 0) as total_original_size,
        COALESCE(SUM(car_size), 0) as total_car_size,
        COALESCE(AVG(car_size::FLOAT / NULLIF(original_size, 0)), 0) as avg_compression_ratio
      FROM car_files
    `;
    const result = await this.query(query);
    return result.rows[0];
  }
}

export const database = new Database();
