#!/usr/bin/env node

/**
 * Test script for wallet generation and address validation
 * This script tests wallet creation for both calibration and mainnet networks
 */

const path = require('path');
const WalletService = require('../services/blockchain/src/wallet/wallet.service');

async function testWalletGeneration() {
    console.log('🧪 WALLET GENERATION TEST');
    console.log('=========================');
    
    try {
        // Test calibration network
        console.log('\n1. Testing CALIBRATION network:');
        process.env.FILECOIN_NETWORK = 'calibration';
        const calibrationService = new WalletService();
        const calibrationWallet = await calibrationService.getOrCreateWallet('calibration');
        
        console.log('   ✅ Generated address:', calibrationWallet.address);
        console.log('   ✅ Network:', calibrationWallet.network);
        console.log('   ✅ Valid format:', calibrationWallet.address.startsWith('t1') ? 'YES' : 'NO');
        console.log('   ✅ Address validation:', calibrationService.validateAddress(calibrationWallet.address) ? 'PASS' : 'FAIL');
        
        // Test mainnet network
        console.log('\n2. Testing MAINNET network:');
        process.env.FILECOIN_NETWORK = 'mainnet';
        const mainnetService = new WalletService();
        const mainnetWallet = await mainnetService.getOrCreateWallet('mainnet');
        
        console.log('   ✅ Generated address:', mainnetWallet.address);
        console.log('   ✅ Network:', mainnetWallet.network);
        console.log('   ✅ Valid format:', mainnetWallet.address.startsWith('f1') ? 'YES' : 'NO');
        console.log('   ✅ Address validation:', mainnetService.validateAddress(mainnetWallet.address) ? 'PASS' : 'FAIL');
        
        // Test wallet loading
        console.log('\n3. Testing wallet loading:');
        const loadedWallet = await calibrationService.loadWallet(calibrationWallet.address);
        const loadTest = loadedWallet && loadedWallet.address === calibrationWallet.address;
        console.log('   ✅ Wallet loading:', loadTest ? 'PASS' : 'FAIL');
        
        // Test wallet listing
        console.log('\n4. Testing wallet listing:');
        const wallets = await calibrationService.listWallets();
        console.log('   ✅ Total wallets found:', wallets.length);
        console.log('   ✅ Wallet listing:', wallets.length > 0 ? 'PASS' : 'FAIL');
        console.log('   ✅ Max wallets (should be 2):', wallets.length <= 2 ? 'PASS' : 'FAIL');
        
        console.log('\n🎉 Test completed successfully!');
        console.log('\n📋 SUMMARY:');
        console.log(`- Calibration address: ${calibrationWallet.address}`);
        console.log(`- Mainnet address: ${mainnetWallet.address}`);
        console.log(`- Total wallets: ${wallets.length}/2`);
        
        return { 
            calibrationWallet, 
            mainnetWallet, 
            totalWallets: wallets.length,
            success: true 
        };
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run test if called directly
if (require.main === module) {
    testWalletGeneration()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testWalletGeneration };
