#!/usr/bin/env node

/**
 * Script to verify CAR files
 * Usage: node scripts/verify-car.js <car-file-path>
 */

import { CarReader } from '@ipld/car';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyCAR(carPath) {
  try {
    console.log(`Verifying CAR file: ${carPath}`);
    
    // Check if file exists
    if (!await fs.pathExists(carPath)) {
      throw new Error(`CAR file does not exist: ${carPath}`);
    }
    
    // Get file info
    const stats = await fs.stat(carPath);
    console.log(`File size: ${formatBytes(stats.size)}`);
    
    // Read CAR file
    const carFile = await fs.readFile(carPath);
    const reader = await CarReader.fromBytes(carFile);
    
    // Get roots
    const roots = await reader.getRoots();
    console.log(`Root CIDs: ${roots.length}`);
    
    for (const root of roots) {
      console.log(`  - ${root.toString()}`);
    }
    
    // Verify blocks
    let blockCount = 0;
    let totalBlockSize = 0;
    const seenCIDs = new Set();
    
    console.log('\nVerifying blocks...');
    
    for await (const { cid, bytes } of reader.blocks()) {
      blockCount++;
      totalBlockSize += bytes.length;
      
      if (seenCIDs.has(cid.toString())) {
        console.warn(`⚠️  Duplicate CID found: ${cid.toString()}`);
      } else {
        seenCIDs.add(cid.toString());
      }
      
      // Progress indicator for large files
      if (blockCount % 1000 === 0) {
        console.log(`  Verified ${blockCount} blocks...`);
      }
      
      // Limit for very large files
      if (blockCount > 10000) {
        console.log(`  Stopping verification at ${blockCount} blocks (large file)`);
        break;
      }
    }
    
    console.log(`\n✅ CAR file verification completed!`);
    console.log(`Total blocks: ${blockCount}`);
    console.log(`Unique CIDs: ${seenCIDs.size}`);
    console.log(`Total block data: ${formatBytes(totalBlockSize)}`);
    console.log(`Overhead: ${formatBytes(stats.size - totalBlockSize)} (${(((stats.size - totalBlockSize) / stats.size) * 100).toFixed(2)}%)`);
    
    // Additional checks
    if (roots.length === 0) {
      console.warn('⚠️  Warning: CAR file has no root CIDs');
    }
    
    if (blockCount === 0) {
      console.warn('⚠️  Warning: CAR file has no blocks');
    }
    
    if (seenCIDs.size !== blockCount) {
      console.warn(`⚠️  Warning: Found ${blockCount - seenCIDs.size} duplicate blocks`);
    }
    
    return {
      valid: true,
      roots: roots.map(r => r.toString()),
      blockCount,
      uniqueCIDs: seenCIDs.size,
      totalSize: stats.size,
      blockDataSize: totalBlockSize,
      overhead: stats.size - totalBlockSize
    };
    
  } catch (error) {
    console.error('❌ CAR verification failed:', error.message);
    
    // Try to provide more specific error information
    if (error.message.includes('Invalid CAR header')) {
      console.error('The file does not appear to be a valid CAR file');
    } else if (error.message.includes('ENOENT')) {
      console.error('File not found');
    } else if (error.message.includes('EACCES')) {
      console.error('Permission denied');
    }
    
    return {
      valid: false,
      error: error.message
    };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node verify-car.js <car-file-path>');
    console.log('');
    console.log('Examples:');
    console.log('  node verify-car.js ./car/myfile.car');
    console.log('  node verify-car.js /path/to/archive.car');
    process.exit(1);
  }
  
  const carPath = path.resolve(args[0]);
  
  verifyCAR(carPath).then(result => {
    if (!result.valid) {
      process.exit(1);
    }
  });
}

export { verifyCAR };
