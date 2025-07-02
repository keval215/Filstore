#!/usr/bin/env node

/**
 * Docker Container Wallet Initialization
 * Ensures exactly 2 wallets exist when container starts
 */

const path = require('path');
const WalletService = require('../services/blockchain/src/wallet/wallet.service');

async function initializeContainerWallets() {
    console.log('🐳 DOCKER CONTAINER WALLET INITIALIZATION');
    console.log('=========================================');

    try {
        const walletService = new WalletService();
        
        // Check current wallet status
        const existingWallets = await walletService.listWallets();
        console.log(`📊 Found ${existingWallets.length} existing wallets`);

        let testnetWallet, mainnetWallet;

        // Initialize testnet wallet
        console.log('\n🧪 Initializing TESTNET wallet...');
        testnetWallet = await walletService.getOrCreateWallet('calibration');
        
        // Initialize mainnet wallet  
        console.log('\n🌐 Initializing MAINNET wallet...');
        mainnetWallet = await walletService.getOrCreateWallet('mainnet');

        // Final verification
        const finalWallets = await walletService.listWallets();
        
        console.log('\n✅ CONTAINER WALLET INITIALIZATION COMPLETE!');
        console.log('============================================');
        console.log(`📊 Total wallets: ${finalWallets.length}/2`);
        console.log(`🧪 Testnet:  ${testnetWallet.address}`);
        console.log(`🌐 Mainnet:  ${mainnetWallet.address}`);
        
        // Show faucet info for testnet
        console.log('\n🚰 FOR TESTNET TOKENS:');
        console.log('======================');
        console.log(`📋 Copy this address: ${testnetWallet.address}`);
        console.log('🌐 Visit any of these faucets:');
        console.log('   • https://faucet.calibnet.chainsafe-fil.io/');
        console.log('   • https://beryx.zondax.ch/faucet/');
        console.log('   • https://forest-explorer.chainsafe.dev/faucet/calibnet');
        console.log('📝 Paste your address and request test tokens');
        
        console.log('\n🚀 Blockchain service ready to start!\n');

        return {
            testnet: testnetWallet,
            mainnet: mainnetWallet,
            count: finalWallets.length
        };

    } catch (error) {
        console.error('\n❌ Container wallet initialization failed:', error.message);
        console.error('💥 Cannot start blockchain service without wallets');
        process.exit(1);
    }
}

// Export for use in other scripts
module.exports = { initializeContainerWallets };

// Run if called directly
if (require.main === module) {
    initializeContainerWallets();
}
