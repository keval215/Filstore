#!/usr/bin/env node

const ContainerWalletInitializer = require('./container-wallet-init');

async function checkWallet() {
  console.log('🔍 Checking wallet status...');
  
  try {
    const initializer = new ContainerWalletInitializer();
    const wallet = initializer.getCurrentWallet();
    
    if (!wallet) {
      console.log('❌ No wallet found. Run initialization first.');
      return;
    }
    
    console.log('📋 Wallet Information:');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Network: ${wallet.network}`);
    console.log(`   Created: ${wallet.created}`);
    
    // Check current balance
    const balance = await initializer.walletManager.checkBalance(wallet.address, wallet.network);
    console.log(`   Balance: ${balance.balance} FIL`);
    
    if (parseFloat(balance.balance) > 0) {
      console.log('✅ Wallet is funded and ready!');
    } else {
      console.log('💸 Wallet needs funding');
      
      if (wallet.network === 'calibration') {
        console.log('💡 Get test FIL: curl -X POST http://localhost:3001/api/v1/wallet-manager/' + wallet.id + '/faucet');
      } else {
        console.log('💡 Transfer FIL from exchange or another wallet');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking wallet:', error.message);
  }
}

checkWallet();
