#!/usr/bin/env node

/**
 * Cleanup script to remove old redundant files after refactoring
 * Run this after verifying the new structure works correctly
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../services/blockchain/src');

// Files to remove (now redundant)
const filesToRemove = [
    'auto-wallet-init.js',
    'container-wallet-init.js', 
    'check-wallet.js',
    'regenerate-testnet-wallet.js',
    'generate-both-wallets.js',
    'test-wallet-fix.js',
    'test-address-gen.js',
    'wallet-manager.js',
    'wallet.js',
    'ai-optimizer.js',
    'storage.js',
    'filecoin.js'
];

async function cleanupOldFiles() {
    console.log('🧹 CLEANUP: Removing redundant files');
    console.log('===================================');
    
    let removedCount = 0;
    let notFoundCount = 0;
    
    for (const file of filesToRemove) {
        const filePath = path.join(srcDir, file);
        
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✅ Removed: ${file}`);
                removedCount++;
            } else {
                console.log(`⚠️  Not found: ${file}`);
                notFoundCount++;
            }
        } catch (error) {
            console.log(`❌ Error removing ${file}: ${error.message}`);
        }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Removed: ${removedCount} files`);
    console.log(`   Not found: ${notFoundCount} files`);
    console.log(`   Total processed: ${filesToRemove.length} files`);
    
    console.log('\n🎉 Cleanup completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the new API endpoints');
    console.log('   2. Update any external code that uses old endpoints');
    console.log('   3. Run the test scripts in /scripts directory');
    
    return { removedCount, notFoundCount };
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupOldFiles()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupOldFiles };
