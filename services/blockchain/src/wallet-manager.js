const express = require('express');
const crypto = require('crypto');
const secp256k1 = require('secp256k1');
const { blake2b } = require('blakejs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Filecoin address types
const ADDRESS_TYPES = {
  SECP256K1: 1,  // Most common for user wallets
  ACTOR: 2,      // For smart contracts
  BLS: 3,        // For consensus participants
  ID: 0          // Short form
};

// Base32 alphabet for Filecoin addresses
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

// Testnet and Mainnet faucets
const FAUCETS = {
  calibration: [
    'https://faucet.calibnet.chainsafe-fil.io/',
    'https://beryx.zondax.ch/faucet/',
    'https://forest-explorer.chainsafe.dev/faucet/calibnet'
  ]
};

// Storage path for wallets
const WALLET_STORAGE_PATH = '/app/data/wallets';

class FilecoinWallet {
  constructor() {
    this.ensureWalletDirectory();
  }

  ensureWalletDirectory() {
    if (!fs.existsSync(WALLET_STORAGE_PATH)) {
      fs.mkdirSync(WALLET_STORAGE_PATH, { recursive: true });
    }
  }

  // Generate a new Filecoin wallet
  generateWallet(network = 'calibration') {
    try {
      // Generate 32-byte private key
      let privateKey;
      do {
        privateKey = crypto.randomBytes(32);
      } while (!secp256k1.privateKeyVerify(privateKey));

      // Generate public key from private key
      const publicKey = secp256k1.publicKeyCreate(privateKey, false);

      // Generate Filecoin address
      const address = this.generateFilecoinAddress(publicKey, network);

      const wallet = {
        id: crypto.randomUUID(),
        network: network,
        address: address,
        privateKey: privateKey.toString('hex'),
        publicKey: publicKey.toString('hex'),
        balance: '0',
        created: new Date().toISOString(),
        funded: false
      };

      // Save wallet securely
      this.saveWallet(wallet);

      // Return wallet without private key for security
      const { privateKey: _, ...safeWallet } = wallet;
      return safeWallet;

    } catch (error) {
      throw new Error(`Failed to generate wallet: ${error.message}`);
    }
  }

  // Generate Filecoin address from public key
  generateFilecoinAddress(publicKey, network = 'calibration') {
    try {
      // Create payload: [type, payload]
      const addressType = ADDRESS_TYPES.SECP256K1;
      
      // Hash the public key with Blake2b (20 bytes)
      const hash = blake2b(publicKey, null, 20);
      
      // Combine type and hash
      const payload = Buffer.concat([Buffer.from([addressType]), hash]);
      
      // Calculate checksum
      const checksum = blake2b(payload, null, 4);
      
      // Combine payload and checksum
      const addressBytes = Buffer.concat([payload, checksum]);
      
      // Encode with base32
      const encoded = this.base32Encode(addressBytes);
      
      // Add network prefix
      const prefix = network === 'mainnet' ? 'f' : 't';
      return `${prefix}${addressType}${encoded}`;

    } catch (error) {
      throw new Error(`Failed to generate address: ${error.message}`);
    }
  }

  // Base32 encoding for Filecoin
  base32Encode(data) {
    let result = '';
    let buffer = 0;
    let bitsLeft = 0;

    for (const byte of data) {
      buffer = (buffer << 8) | byte;
      bitsLeft += 8;

      while (bitsLeft >= 5) {
        result += BASE32_ALPHABET[(buffer >> (bitsLeft - 5)) & 31];
        bitsLeft -= 5;
      }
    }

    if (bitsLeft > 0) {
      result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 31];
    }

    return result;
  }

  // Save wallet to secure storage
  saveWallet(wallet) {
    const walletPath = path.join(WALLET_STORAGE_PATH, `${wallet.id}.json`);
    const encryptedWallet = this.encryptWalletData(wallet);
    fs.writeFileSync(walletPath, JSON.stringify(encryptedWallet, null, 2));
  }

  // Load wallet from storage
  loadWallet(walletId) {
    const walletPath = path.join(WALLET_STORAGE_PATH, `${walletId}.json`);
    if (!fs.existsSync(walletPath)) {
      throw new Error('Wallet not found');
    }
    
    const encryptedData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    return this.decryptWalletData(encryptedData);
  }

  // List all wallets (without private keys)
  listWallets() {
    const walletFiles = fs.readdirSync(WALLET_STORAGE_PATH)
      .filter(file => file.endsWith('.json'));
    
    return walletFiles.map(file => {
      const walletId = file.replace('.json', '');
      const wallet = this.loadWallet(walletId);
      const { privateKey, ...safeWallet } = wallet;
      return safeWallet;
    });
  }

  // Encrypt wallet data
  encryptWalletData(wallet) {
    const key = process.env.WALLET_ENCRYPTION_KEY || 'default_key_change_this_in_production';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(JSON.stringify(wallet), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted };
  }

  // Decrypt wallet data
  decryptWalletData(encryptedWallet) {
    const key = process.env.WALLET_ENCRYPTION_KEY || 'default_key_change_this_in_production';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedWallet.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  // Check wallet balance
  async checkBalance(address, network = 'calibration') {
    try {
      const nodeUrl = network === 'mainnet' 
        ? 'https://api.node.glif.io/rpc/v1'
        : 'https://api.calibration.node.glif.io/rpc/v1';

      const response = await axios.post(nodeUrl, {
        jsonrpc: '2.0',
        method: 'Filecoin.WalletBalance',
        params: [address],
        id: 1
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      // Convert from attoFIL to FIL
      const balanceAttoFIL = response.data.result;
      const balanceFIL = (BigInt(balanceAttoFIL) / BigInt('1000000000000000000')).toString();
      
      return {
        address,
        balance: balanceFIL,
        balanceAttoFIL: balanceAttoFIL,
        network
      };

    } catch (error) {
      console.error(`Balance check failed: ${error.message}`);
      return {
        address,
        balance: '0',
        balanceAttoFIL: '0',
        network,
        error: error.message
      };
    }
  }

  // Request funds from testnet faucet
  async requestFaucetFunds(address, network = 'calibration') {
    if (network === 'mainnet') {
      throw new Error('Faucet not available for mainnet');
    }

    const faucetResults = [];
    
    for (const faucetUrl of FAUCETS[network]) {
      try {
        // Each faucet has different API endpoints
        let response;
        
        if (faucetUrl.includes('chainsafe')) {
          response = await axios.post(`${faucetUrl}api/v1/send`, {
            address: address
          });
        } else if (faucetUrl.includes('zondax')) {
          response = await axios.post(`${faucetUrl}api/v1/faucet`, {
            address: address
          });
        } else {
          // Generic faucet request
          response = await axios.post(faucetUrl, {
            address: address,
            amount: '100'  // Request 100 tFIL
          });
        }

        faucetResults.push({
          faucet: faucetUrl,
          success: true,
          response: response.data
        });

        // If one succeeds, we can break
        break;

      } catch (error) {
        faucetResults.push({
          faucet: faucetUrl,
          success: false,
          error: error.message
        });
      }
    }

    return {
      address,
      network,
      faucetResults,
      success: faucetResults.some(r => r.success)
    };
  }

  // Monitor address for incoming funds
  async monitorAddress(address, network = 'calibration', callback) {
    let previousBalance = '0';
    
    const checkForFunds = async () => {
      try {
        const balanceInfo = await this.checkBalance(address, network);
        
        if (balanceInfo.balance !== previousBalance) {
          previousBalance = balanceInfo.balance;
          if (callback) {
            callback(balanceInfo);
          }
        }
      } catch (error) {
        console.error(`Monitoring error: ${error.message}`);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkForFunds, 30000);
    
    // Initial check
    checkForFunds();
    
    return interval;
  }
}

// Initialize wallet service
const walletService = new FilecoinWallet();

// API Routes

// Generate new wallet
router.post('/generate', async (req, res) => {
  try {
    const { network = 'calibration' } = req.body;
    const wallet = walletService.generateWallet(network);
    
    res.json({
      success: true,
      wallet: wallet,
      message: 'Wallet generated successfully',
      nextSteps: {
        testnet: 'Use the faucet endpoint to request test FIL',
        mainnet: 'Transfer FIL from an exchange or another wallet'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List all wallets
router.get('/list', (req, res) => {
  try {
    const wallets = walletService.listWallets();
    res.json({
      success: true,
      wallets: wallets,
      count: wallets.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get wallet details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = walletService.loadWallet(id);
    const { privateKey, ...safeWallet } = wallet;
    
    // Get current balance
    const balanceInfo = await walletService.checkBalance(wallet.address, wallet.network);
    safeWallet.currentBalance = balanceInfo;
    
    res.json({
      success: true,
      wallet: safeWallet
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Check wallet balance
router.get('/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = walletService.loadWallet(id);
    const balance = await walletService.checkBalance(wallet.address, wallet.network);
    
    res.json({
      success: true,
      balance: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Request faucet funds (testnet only)
router.post('/:id/faucet', async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = walletService.loadWallet(id);
    
    if (wallet.network === 'mainnet') {
      return res.status(400).json({
        success: false,
        error: 'Faucet not available for mainnet. Please transfer FIL from an exchange or another wallet.'
      });
    }
    
    const faucetResult = await walletService.requestFaucetFunds(wallet.address, wallet.network);
    
    res.json({
      success: faucetResult.success,
      result: faucetResult,
      message: faucetResult.success 
        ? 'Faucet request successful. Funds should arrive in 1-2 minutes.'
        : 'Faucet request failed. Please try again or use manual faucet.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start monitoring wallet
router.post('/:id/monitor', async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = walletService.loadWallet(id);
    
    const interval = walletService.monitorAddress(
      wallet.address, 
      wallet.network,
      (balanceInfo) => {
        console.log(`Wallet ${id} balance updated:`, balanceInfo);
        // Here you could emit WebSocket events or store in database
      }
    );
    
    res.json({
      success: true,
      message: 'Monitoring started for wallet',
      walletId: id,
      address: wallet.address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get funding instructions
router.get('/:id/funding-instructions', (req, res) => {
  try {
    const { id } = req.params;
    const wallet = walletService.loadWallet(id);
    
    const instructions = {
      address: wallet.address,
      network: wallet.network,
      instructions: {
        testnet: {
          method1: {
            title: 'Automatic Faucet (Recommended)',
            description: 'Use our API to request test FIL automatically',
            endpoint: `/api/v1/wallet/${id}/faucet`,
            method: 'POST'
          },
          method2: {
            title: 'Manual Faucet',
            description: 'Visit faucet websites manually',
            faucets: FAUCETS.calibration,
            steps: [
              '1. Visit any of the faucet URLs',
              '2. Enter your address: ' + wallet.address,
              '3. Request test FIL',
              '4. Wait 1-2 minutes for funds to arrive'
            ]
          }
        },
        mainnet: {
          method1: {
            title: 'Transfer from Exchange',
            description: 'Buy FIL on an exchange and transfer to your address',
            exchanges: ['Coinbase', 'Binance', 'Kraken', 'Gemini'],
            steps: [
              '1. Buy FIL on a supported exchange',
              '2. Withdraw to address: ' + wallet.address,
              '3. Wait for network confirmations',
              '4. Check balance in wallet'
            ]
          },
          method2: {
            title: 'Transfer from Another Wallet',
            description: 'Send FIL from another Filecoin wallet',
            steps: [
              '1. Open your existing Filecoin wallet',
              '2. Send FIL to address: ' + wallet.address,
              '3. Confirm transaction',
              '4. Wait for network confirmations'
            ]
          }
        }
      }
    };
    
    res.json({
      success: true,
      instructions: instructions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
