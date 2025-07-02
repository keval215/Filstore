#!/usr/bin/env node

/**
 * Wallet initialization script
 * Creates or loads the default wallet for the specified network
 */

const WalletService = require('../services/blockchain/src/wallet/wallet.service');

async function initializeWallet() {
    console.log('🚀 WALLET INITIALIZATION');
    console.log('========================');
    
    const network = process.env.FILECOIN_NETWORK || 'calibration';
    console.log(`🌐 Network: ${network.toUpperCase()}`);
    
    try {
        const walletService = new WalletService();
        const wallet = await walletService.initializeWallet();
        
        console.log('\n✅ Wallet ready!');
        console.log(`📍 Address: ${wallet.address}`);
        console.log(`🌐 Network: ${wallet.network}`);
        console.log(`📅 Created: ${wallet.created}`);
        
        // Show balance if possible
        try {
            const FilecoinService = require('../services/blockchain/src/filecoin/filecoin.service');
            const filecoinService = new FilecoinService();
            const balance = await filecoinService.getBalance(wallet.address);
            console.log(`💰 Balance: ${balance} FIL`);
        } catch (error) {
            console.log('💰 Balance: Unable to fetch (node connection issue)');
        }
        
        return wallet;
        
    } catch (error) {
        console.error('\n❌ Initialization failed:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    initializeWallet()
        .then(() => {
            console.log('\n🎉 Wallet initialization completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Failed to initialize wallet:', error.message);
            process.exit(1);
        });
}

module.exports = { initializeWallet };
