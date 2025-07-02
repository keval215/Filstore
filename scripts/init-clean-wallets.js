#!/usr/bin/env node

/**
 * Initialize clean wallet setup script
 * Cleans up existing wallets and creates exactly 2 wallets (1 testnet, 1 mainnet)
 */

const WalletService = require('../services/blockchain/src/wallet/wallet.service');
const WalletCleanup = require('./cleanup-wallets');

async function initCleanWallets() {
    console.log('🧹 INITIALIZING CLEAN WALLET SETUP');
    console.log('===================================');

    try {
        // Step 1: Clean up existing wallets
        console.log('\nStep 1: Cleaning up existing wallets...');
        const cleanup = new WalletCleanup();
        const result = await cleanup.cleanupWallets();

        // Step 2: Ensure we have exactly 2 wallets
        console.log('\nStep 2: Setting up clean wallet structure...');
        const walletService = new WalletService();
        
        // Check if we need to create any wallets
        const testnetExists = await walletService.walletExists('calibration');
        const mainnetExists = await walletService.walletExists('mainnet');
        
        let testnetWallet, mainnetWallet;
        
        if (!testnetExists) {
            console.log('Creating testnet wallet...');
            testnetWallet = await walletService.generateWallet('calibration');
        } else {
            testnetWallet = await walletService.loadWalletByNetwork('calibration');
            console.log(`📝 Testnet wallet exists: ${testnetWallet.address}`);
        }
        
        if (!mainnetExists) {
            console.log('Creating mainnet wallet...');
            mainnetWallet = await walletService.generateWallet('mainnet');
        } else {
            mainnetWallet = await walletService.loadWalletByNetwork('mainnet');
            console.log(`📝 Mainnet wallet exists: ${mainnetWallet.address}`);
        }
        
        // Step 3: Verify final state
        console.log('\nStep 3: Verifying wallet setup...');
        const finalWallets = await walletService.listWallets();
        
        console.log('\n✅ CLEAN WALLET SETUP COMPLETE!');
        console.log('================================');
        console.log('📁 Wallet directory: ./data/wallets/');
        console.log(`📊 Total wallets: ${finalWallets.length}/2`);
        console.log(`🧪 Testnet wallet: ${testnetWallet.address}`);
        console.log(`🌐 Mainnet wallet: ${mainnetWallet.address}`);
        
        // Show file structure
        console.log('\n📂 File structure:');
        console.log('   ./data/wallets/wallet-calibration.json');
        console.log('   ./data/wallets/wallet-mainnet.json');
        
        if (testnetWallet.network === 'calibration') {
            console.log('\n🚰 For testnet tokens, use the faucet URLs shown above');
        }
        
        return {
            calibration: testnetWallet,
            mainnet: mainnetWallet,
            totalWallets: finalWallets.length,
            cleanupResult: result
        };
        
    } catch (error) {
        console.error('\n❌ Initialization failed:', error.message);
        throw error;
    }
}

if (require.main === module) {
    initCleanWallets()
        .then(() => {
            console.log('\n🎉 Wallet initialization completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Failed to initialize clean wallets:', error.message);
            process.exit(1);
        });
}

module.exports = { initCleanWallets };
