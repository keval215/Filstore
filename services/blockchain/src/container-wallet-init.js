#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Import our wallet manager
const WalletManager = require('./wallet-manager');

class ContainerWalletInitializer {
  constructor() {
    this.walletManager = new (require('./wallet-manager'))();
    this.configPath = '/app/data/config';
    this.walletConfigFile = path.join(this.configPath, 'default-wallet.json');
  }

  async initialize() {
    console.log('🚀 Initializing Filecoin Wallet System...');
    
    try {
      // Ensure config directory exists
      this.ensureConfigDirectory();
      
      // Check for existing wallet
      const existingWallet = this.loadExistingWallet();
      
      if (existingWallet) {
        console.log('✅ Found existing wallet:', existingWallet.address);
        await this.checkWalletStatus(existingWallet);
        return existingWallet;
      }
      
      // Generate new wallet
      const newWallet = await this.generateNewWallet();
      console.log('🎉 New wallet generated:', newWallet.address);
      
      // Save as default wallet
      this.saveDefaultWallet(newWallet);
      
      // Guide user through funding
      await this.guideFunding(newWallet);
      
      return newWallet;
      
    } catch (error) {
      console.error('❌ Wallet initialization failed:', error.message);
      throw error;
    }
  }

  ensureConfigDirectory() {
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
    }
  }

  loadExistingWallet() {
    if (fs.existsSync(this.walletConfigFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.walletConfigFile, 'utf8'));
        return config.defaultWallet;
      } catch (error) {
        console.warn('⚠️ Failed to load existing wallet config:', error.message);
        return null;
      }
    }
    return null;
  }

  async generateNewWallet() {
    const network = process.env.FILECOIN_NETWORK || 'calibration';
    console.log(`🔧 Generating wallet for ${network} network...`);
    
    const wallet = this.walletManager.generateWallet(network);
    
    console.log('📝 Wallet Details:');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Network: ${wallet.network}`);
    console.log(`   Created: ${wallet.created}`);
    
    return wallet;
  }

  saveDefaultWallet(wallet) {
    const config = {
      defaultWallet: wallet,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(this.walletConfigFile, JSON.stringify(config, null, 2));
    console.log('💾 Default wallet configuration saved');
  }

  async checkWalletStatus(wallet) {
    console.log('🔍 Checking wallet status...');
    
    try {
      const balance = await this.walletManager.checkBalance(wallet.address, wallet.network);
      
      if (parseFloat(balance.balance) > 0) {
        console.log(`💰 Wallet funded: ${balance.balance} FIL`);
        wallet.funded = true;
      } else {
        console.log('💸 Wallet not funded (0 FIL)');
        wallet.funded = false;
        
        if (wallet.network === 'calibration') {
          console.log('🎯 Testnet detected - you can use faucet to get test FIL');
        }
      }
      
      return balance;
      
    } catch (error) {
      console.warn('⚠️ Unable to check balance:', error.message);
      return null;
    }
  }

  async guideFunding(wallet) {
    console.log('\n📋 FUNDING INSTRUCTIONS');
    console.log('========================');
    
    if (wallet.network === 'calibration') {
      console.log('🧪 TESTNET FUNDING (Calibration Network)');
      console.log('');
      console.log('Option 1: Automatic Faucet (Recommended)');
      console.log('   Run: curl -X POST http://localhost:3001/api/v1/wallet-manager/' + wallet.id + '/faucet');
      console.log('');
      console.log('Option 2: Manual Faucet');
      console.log('   Visit: https://faucet.calibnet.chainsafe-fil.io/');
      console.log('   Enter address: ' + wallet.address);
      console.log('   Request test FIL');
      console.log('');
      
      // Attempt automatic faucet
      await this.attemptAutoFaucet(wallet);
      
    } else {
      console.log('💰 MAINNET FUNDING');
      console.log('');
      console.log('Option 1: Transfer from Exchange');
      console.log('   • Buy FIL on Coinbase, Binance, Kraken, etc.');
      console.log('   • Withdraw to: ' + wallet.address);
      console.log('');
      console.log('Option 2: Transfer from Another Wallet');
      console.log('   • Send FIL from existing wallet');
      console.log('   • To address: ' + wallet.address);
      console.log('');
    }
    
    console.log('🔄 Monitoring wallet for incoming funds...');
    this.startMonitoring(wallet);
  }

  async attemptAutoFaucet(wallet) {
    console.log('🤖 Attempting automatic faucet request...');
    
    try {
      const result = await this.walletManager.requestFaucetFunds(wallet.address, wallet.network);
      
      if (result.success) {
        console.log('✅ Faucet request successful! Funds should arrive in 1-2 minutes.');
        
        // Wait and check balance
        setTimeout(async () => {
          const balance = await this.checkWalletStatus(wallet);
          if (balance && parseFloat(balance.balance) > 0) {
            console.log('🎉 Funding confirmed! Wallet ready for use.');
          }
        }, 60000); // Check after 1 minute
        
      } else {
        console.log('⚠️ Automatic faucet failed. Please use manual faucet.');
        console.log('Faucet results:', result.faucetResults);
      }
      
    } catch (error) {
      console.warn('⚠️ Auto-faucet error:', error.message);
      console.log('Please use manual faucet instead.');
    }
  }

  startMonitoring(wallet) {
    // Monitor for 10 minutes
    let checks = 0;
    const maxChecks = 20; // 20 checks * 30 seconds = 10 minutes
    
    const interval = setInterval(async () => {
      checks++;
      
      try {
        const balance = await this.walletManager.checkBalance(wallet.address, wallet.network);
        
        if (parseFloat(balance.balance) > 0) {
          console.log(`🎉 FUNDING DETECTED! Balance: ${balance.balance} FIL`);
          console.log('✅ Wallet is now ready for backup operations!');
          clearInterval(interval);
          
          // Update wallet config
          wallet.funded = true;
          this.saveDefaultWallet(wallet);
          
          return;
        }
        
        if (checks >= maxChecks) {
          console.log('⏰ Monitoring timeout. Wallet may still receive funds later.');
          console.log('💡 You can check balance manually: docker-compose exec blockchain node src/check-wallet.js');
          clearInterval(interval);
        }
        
      } catch (error) {
        console.warn('⚠️ Monitoring error:', error.message);
      }
    }, 30000); // Check every 30 seconds
  }

  // Get current default wallet
  getCurrentWallet() {
    return this.loadExistingWallet();
  }
}

// CLI usage
if (require.main === module) {
  const initializer = new ContainerWalletInitializer();
  
  initializer.initialize()
    .then(wallet => {
      console.log('\n🏁 Wallet initialization complete!');
      console.log('Default wallet address:', wallet.address);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    });
}

module.exports = ContainerWalletInitializer;
