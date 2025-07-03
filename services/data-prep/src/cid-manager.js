import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from 'multiformats/bases/base32';
import { base58btc } from 'multiformats/bases/base58';
import fs from 'fs-extra';
import path from 'path';
import { logger } from './utils/logger.js';
import { database } from './database.js';

export class CIDManager {
  constructor(config) {
    this.config = config;
  }

  async storeCID(cidString, metadata) {
    try {
      // Validate CID format
      const cid = CID.parse(cidString);
      
      // Find the associated CAR file
      const carFile = await database.getCarFileByRootCid(cidString);
      
      const cidData = {
        cid: cidString,
        carFileId: carFile?.id || null,
        cidType: 'root', // root, file, directory, etc.
        parentCid: metadata.parentCid || null,
        filePath: metadata.originalPath || null,
        size: metadata.size || 0,
        metadata: {
          version: cid.version,
          codec: cid.code,
          multihash: cid.multihash.code,
          ...metadata.metadata
        }
      };

      const result = await database.createCidMetadata(cidData);
      
      logger.info(`Stored CID metadata: ${cidString}`);
      return result;
    } catch (error) {
      logger.error(`Error storing CID ${cidString}:`, error);
      throw error;
    }
  }

  async getCIDInfo(cidString) {
    try {
      // Get CID metadata from database
      const cidMetadata = await database.getCidMetadata(cidString);
      
      if (cidMetadata && cidMetadata.length > 0) {
        const cidData = cidMetadata[0];
        
        // Get associated CAR file info if available
        let carFileInfo = null;
        if (cidData.car_file_id) {
          carFileInfo = await database.getCarFile(cidData.car_file_id);
        }
        
        return {
          cid: cidData.cid,
          carFileId: cidData.car_file_id,
          cidType: cidData.cid_type,
          parentCid: cidData.parent_cid,
          filePath: cidData.file_path,
          size: cidData.size,
          createdAt: cidData.created_at,
          metadata: cidData.metadata,
          carFile: carFileInfo ? {
            id: carFileInfo.id,
            rootCid: carFileInfo.root_cid,
            carPath: carFileInfo.car_path,
            originalSize: carFileInfo.original_size,
            carSize: carFileInfo.car_size,
            status: carFileInfo.status
          } : null,
          age: cidData.created_at ? this.calculateAge(cidData.created_at) : null,
          fileExists: carFileInfo?.car_path ? await fs.pathExists(carFileInfo.car_path) : false,
          cidDetails: this.parseCIDDetails(cidString)
        };
      }

      // If not in database, try to parse CID for basic info
      try {
        const cid = CID.parse(cidString);
        return {
          cid: cidString,
          version: cid.version,
          codec: cid.code,
          multihash: cid.multihash.code,
          cidDetails: this.parseCIDDetails(cidString),
          stored: false
        };
      } catch (parseError) {
        throw new Error(`Invalid CID format: ${cidString}`);
      }
    } catch (error) {
      logger.error(`Error getting CID info for ${cidString}:`, error);
      throw error;
    }
  }

  parseCIDDetails(cidString) {
    try {
      const cid = CID.parse(cidString);
      
      return {
        version: cid.version,
        codec: this.getCodecName(cid.code),
        multihash: {
          code: cid.multihash.code,
          name: this.getHashName(cid.multihash.code),
          size: cid.multihash.size
        },
        multibase: this.detectMultibase(cidString)
      };
    } catch (error) {
      logger.error(`Error parsing CID details for ${cidString}:`, error);
      return null;
    }
  }

  getCodecName(code) {
    const codecs = {
      0x55: 'raw',
      0x70: 'dag-pb',
      0x71: 'dag-cbor',
      0x72: 'libp2p-key',
      0x78: 'git-raw',
      0x7b: 'dag-json'
    };
    return codecs[code] || `unknown(${code})`;
  }

  getHashName(code) {
    const hashes = {
      0x12: 'sha2-256',
      0x13: 'sha2-512',
      0x17: 'sha3-224',
      0x16: 'sha3-256',
      0x15: 'sha3-384',
      0x14: 'sha3-512',
      0x1a: 'keccak-224',
      0x1b: 'keccak-256',
      0x1c: 'keccak-384',
      0x1d: 'keccak-512'
    };
    return hashes[code] || `unknown(${code})`;
  }

  detectMultibase(cidString) {
    if (cidString.startsWith('Qm') || cidString.startsWith('Qz')) {
      return 'base58btc';
    }
    if (cidString.startsWith('b')) {
      return 'base32';
    }
    if (cidString.startsWith('z')) {
      return 'base58btc';
    }
    if (cidString.startsWith('f') || cidString.startsWith('v')) {
      return 'base32';
    }
    return 'unknown';
  }

  async searchCIDs(query = {}) {
    try {
      const { searchTerm, limit = 50, offset = 0 } = query;
      
      let results;
      if (searchTerm) {
        results = await database.searchCids(searchTerm);
      } else {
        // Get all CID metadata with basic pagination
        const allCarFiles = await database.listCarFiles({ limit, offset });
        results = [];
        
        for (const carFile of allCarFiles) {
          const cidMetadata = await database.getCidMetadata(carFile.root_cid);
          results.push(...cidMetadata);
        }
      }

      return {
        cids: results.map(cid => ({
          cid: cid.cid,
          carFileId: cid.car_file_id,
          cidType: cid.cid_type,
          parentCid: cid.parent_cid,
          filePath: cid.file_path,
          size: cid.size,
          createdAt: cid.created_at,
          metadata: cid.metadata
        })),
        total: results.length,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error searching CIDs:', error);
      throw error;
    }
  }

  async validateCID(cidString) {
    try {
      const cid = CID.parse(cidString);
      
      return {
        valid: true,
        cid: cidString,
        version: cid.version,
        codec: cid.code,
        multihash: cid.multihash.code
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async convertCID(cidString, options = {}) {
    try {
      const cid = CID.parse(cidString);
      const { version, base } = options;

      let convertedCID = cid;

      // Convert version if specified
      if (version !== undefined && version !== cid.version) {
        if (version === 0 && cid.version === 1 && cid.code === 0x70) {
          // Convert v1 dag-pb to v0
          convertedCID = CID.createV0(cid.multihash);
        } else if (version === 1 && cid.version === 0) {
          // Convert v0 to v1
          convertedCID = CID.createV1(0x70, cid.multihash);
        }
      }

      // Convert base if specified
      let result = convertedCID.toString();
      if (base) {
        switch (base) {
          case 'base32':
            result = convertedCID.toString(base32);
            break;
          case 'base58btc':
            result = convertedCID.toString(base58btc);
            break;
          default:
            throw new Error(`Unsupported base: ${base}`);
        }
      }

      return {
        original: cidString,
        converted: result,
        originalVersion: cid.version,
        convertedVersion: convertedCID.version
      };
    } catch (error) {
      logger.error(`Error converting CID ${cidString}:`, error);
      throw error;
    }
  }

  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  async getStatistics() {
    try {
      const carStats = await database.getCarStats();
      
      return {
        totalCARs: parseInt(carStats.total_files) || 0,
        createdFiles: parseInt(carStats.created_files) || 0,
        verifiedFiles: parseInt(carStats.verified_files) || 0,
        failedFiles: parseInt(carStats.failed_files) || 0,
        totalOriginalSize: parseInt(carStats.total_original_size) || 0,
        totalCarSize: parseInt(carStats.total_car_size) || 0,
        avgCompressionRatio: parseFloat(carStats.avg_compression_ratio) || 0
      };
    } catch (error) {
      logger.error('Error getting CID statistics:', error);
      throw error;
    }
  }

  parseDuration(duration) {
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      throw new Error('Invalid duration format. Use format like "7d", "24h", "60m"');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid duration unit');
    }
  }
}
