#!/usr/bin/env node

/**
 * Wallet cleanup script
 * Finds all existing wallet files, keeps only 1 testnet and 1 mainnet, 
 * and stores them properly in data/wallets folder
 */

const fs = require('fs').promises;
const path = require('path');

class WalletCleanup {
    constructor() {
        this.dataWalletsDir = path.resolve('./data/wallets');
        this.legacyWalletPaths = [
            './data/wallets',
            './services/blockchain/data/wallets',
            './data',
            './wallets',
            './src/wallets',
            '/app/data/wallets'
        ];
    }

    async findAllWalletFiles() {
        const allWallets = [];
        
        // Check all possible wallet locations
        for (const walletPath of this.legacyWalletPaths) {
            try {
                const fullPath = path.resolve(walletPath);
                const exists = await this.directoryExists(fullPath);
                
                if (exists) {
                    const files = await fs.readdir(fullPath);
                    const walletFiles = files.filter(f => f.endsWith('.json') && f.includes('wallet'));
                    
                    for (const file of walletFiles) {
                        const filePath = path.join(fullPath, file);
                        try {
                            const content = await fs.readFile(filePath, 'utf8');
                            const wallet = JSON.parse(content);
                            
                            // Validate wallet structure
                            if (wallet.address && wallet.privateKey && wallet.network) {
                                allWallets.push({
                                    wallet,
                                    filePath,
                                    directory: walletPath
                                });
                            }
                        } catch (error) {
                            console.log(`⚠️  Skipping invalid wallet file: ${file}`);
                        }
                    }
                }
            } catch (error) {
                // Directory doesn't exist, continue
            }
        }

        return allWallets;
    }

    async directoryExists(dir) {
        try {
            await fs.access(dir);
            return true;
        } catch {
            return false;
        }
    }

    async ensureDataWalletsDir() {
        try {
            await fs.mkdir(this.dataWalletsDir, { recursive: true });
            console.log(`📁 Created directory: ${this.dataWalletsDir}`);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async cleanupWallets() {
        console.log('🧹 WALLET CLEANUP STARTED');
        console.log('=========================');

        // Find all wallet files
        const allWallets = await this.findAllWalletFiles();
        console.log(`📊 Found ${allWallets.length} wallet files in various locations`);

        if (allWallets.length === 0) {
            console.log('✅ No wallet files found to clean up');
            return { kept: 0, removed: 0 };
        }

        // List found wallets
        console.log('\n📋 Found wallets:');
        allWallets.forEach((w, i) => {
            console.log(`   ${i + 1}. ${w.wallet.address} (${w.wallet.network}) - ${w.filePath}`);
        });

        // Separate by network
        const testnetWallets = allWallets.filter(w => 
            w.wallet.network === 'calibration' || 
            w.wallet.address?.startsWith('t1') ||
            w.wallet.address?.startsWith('t4')
        );
        
        const mainnetWallets = allWallets.filter(w => 
            w.wallet.network === 'mainnet' || 
            w.wallet.address?.startsWith('f1') ||
            w.wallet.address?.startsWith('f4')
        );

        console.log(`\n🧪 Testnet wallets found: ${testnetWallets.length}`);
        console.log(`🌐 Mainnet wallets found: ${mainnetWallets.length}`);

        // Ensure data/wallets directory exists
        await this.ensureDataWalletsDir();

        // Keep the most recent wallet of each type
        const keepTestnet = testnetWallets.length > 0 ? this.getMostRecent(testnetWallets) : null;
        const keepMainnet = mainnetWallets.length > 0 ? this.getMostRecent(mainnetWallets) : null;

        let keptCount = 0;

        // Create new clean wallet files
        if (keepTestnet) {
            const testnetPath = path.join(this.dataWalletsDir, 'wallet-calibration.json');
            await fs.writeFile(testnetPath, JSON.stringify(keepTestnet.wallet, null, 2));
            console.log(`✅ Saved testnet wallet: ${keepTestnet.wallet.address}`);
            keptCount++;
        }

        if (keepMainnet) {
            const mainnetPath = path.join(this.dataWalletsDir, 'wallet-mainnet.json');
            await fs.writeFile(mainnetPath, JSON.stringify(keepMainnet.wallet, null, 2));
            console.log(`✅ Saved mainnet wallet: ${keepMainnet.wallet.address}`);
            keptCount++;
        }

        // Remove all old wallet files
        console.log('\n🗑️  Cleaning up old wallet files...');
        let removedCount = 0;
        
        for (const walletInfo of allWallets) {
            try {
                await fs.unlink(walletInfo.filePath);
                console.log(`   ❌ Removed: ${path.basename(walletInfo.filePath)}`);
                removedCount++;
            } catch (error) {
                console.log(`   ⚠️  Could not remove: ${walletInfo.filePath}`);
            }
        }

        console.log('\n✅ CLEANUP COMPLETE!');
        console.log(`📁 Clean wallets stored in: ${this.dataWalletsDir}`);
        console.log(`📊 Kept: ${keptCount} wallets, Removed: ${removedCount} old files`);
        
        if (keepTestnet) {
            console.log(`🧪 Testnet: ${keepTestnet.wallet.address}`);
        }
        if (keepMainnet) {
            console.log(`🌐 Mainnet: ${keepMainnet.wallet.address}`);
        }

        return { kept: keptCount, removed: removedCount };
    }

    getMostRecent(wallets) {
        return wallets.reduce((latest, current) => {
            const latestDate = new Date(latest.wallet.created || 0);
            const currentDate = new Date(current.wallet.created || 0);
            return currentDate > latestDate ? current : latest;
        });
    }
}

async function main() {
    const cleanup = new WalletCleanup();
    await cleanup.cleanupWallets();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = WalletCleanup;
