const express = require('express');
const crypto = require('crypto');
const { Wallet } = require('@ethersproject/wallet');
const { providers } = require('@ethersproject/providers');

const router = express.Router();

// In-memory wallet storage (use database in production)
const wallets = new Map();

// Create new wallet
router.post('/create', async (req, res) => {
  try {
    const wallet = Wallet.createRandom();
    const walletData = {
      id: crypto.randomUUID(),
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      createdAt: new Date().toISOString()
    };

    wallets.set(walletData.id, walletData);

    // Don't return private key in response for security
    const response = {
      id: walletData.id,
      address: walletData.address,
      mnemonic: walletData.mnemonic,
      createdAt: walletData.createdAt
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create wallet', message: error.message });
  }
});

// Import wallet from private key
router.post('/import', async (req, res) => {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({ error: 'Private key is required' });
    }

    const wallet = new Wallet(privateKey);
    const walletData = {
      id: crypto.randomUUID(),
      address: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString()
    };

    wallets.set(walletData.id, walletData);

    const response = {
      id: walletData.id,
      address: walletData.address,
      createdAt: walletData.createdAt
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import wallet', message: error.message });
  }
});

// Get wallet balance
router.get('/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    const walletData = wallets.get(id);

    if (!walletData) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // TODO: Implement actual balance checking with Filecoin node
    const mockBalance = {
      balance: '1000.5',
      currency: 'FIL',
      usdValue: '5000.25'
    };

    res.json(mockBalance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance', message: error.message });
  }
});

// List all wallets
router.get('/', (req, res) => {
  try {
    const walletList = Array.from(wallets.values()).map(wallet => ({
      id: wallet.id,
      address: wallet.address,
      createdAt: wallet.createdAt
    }));

    res.json(walletList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list wallets', message: error.message });
  }
});

// Delete wallet
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (wallets.delete(id)) {
      res.json({ message: 'Wallet deleted successfully' });
    } else {
      res.status(404).json({ error: 'Wallet not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete wallet', message: error.message });
  }
});

module.exports = router;
