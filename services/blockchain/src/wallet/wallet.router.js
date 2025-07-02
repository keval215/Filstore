const express = require('express');
const WalletService = require('./wallet.service');
const FilecoinService = require('../filecoin/filecoin.service');

const router = express.Router();
const walletService = new WalletService();
const filecoinService = new FilecoinService();

// Generate new wallet
router.post('/generate', async (req, res) => {
    try {
        const wallet = await walletService.generateWallet();
        res.json({
            success: true,
            wallet: {
                address: wallet.address,
                network: wallet.network,
                created: wallet.created
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// List all wallets
router.get('/', async (req, res) => {
    try {
        const wallets = await walletService.listWallets();
        res.json({ success: true, wallets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get wallet details
router.get('/:address', async (req, res) => {
    try {
        const wallet = await walletService.loadWallet(req.params.address);
        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Wallet not found' });
        }
        
        let balance = '0';
        try {
            balance = await filecoinService.getBalance(wallet.address);
        } catch (error) {
            console.warn('Could not fetch balance:', error.message);
        }

        res.json({
            success: true,
            wallet: {
                address: wallet.address,
                network: wallet.network,
                created: wallet.created,
                balance
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get faucet information for testnet
router.get('/:address/faucet-info', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!walletService.validateAddress(address)) {
            return res.status(400).json({ success: false, error: 'Invalid address format' });
        }

        const network = process.env.FILECOIN_NETWORK || 'calibration';
        
        if (network === 'mainnet') {
            return res.status(400).json({ 
                success: false, 
                error: 'Faucet not available for mainnet' 
            });
        }

        const faucetUrls = [
            'https://faucet.calibnet.chainsafe-fil.io/',
            'https://beryx.zondax.ch/faucet/',
            'https://forest-explorer.chainsafe.dev/faucet/calibnet'
        ];

        res.json({
            success: true,
            address,
            network,
            faucets: faucetUrls,
            instructions: [
                'Copy your wallet address',
                'Open one of the faucet URLs in your browser',
                'Paste your address and request tokens',
                'Wait for the transaction to confirm'
            ]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validate address format
router.post('/validate', (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ success: false, error: 'Address is required' });
        }

        const isValid = walletService.validateAddress(address);
        res.json({ success: true, isValid, address });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
