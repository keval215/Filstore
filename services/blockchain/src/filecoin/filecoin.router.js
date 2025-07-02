const express = require('express');
const FilecoinService = require('./filecoin.service');

const router = express.Router();
const filecoinService = new FilecoinService();

// Get network status
router.get('/status', async (req, res) => {
    try {
        const chainHead = await filecoinService.getChainHead();
        const version = await filecoinService.getVersion();
        
        res.json({
            success: true,
            network: await filecoinService.getNetworkName(),
            height: chainHead.Height,
            version: version.Version,
            timestamp: new Date().toISOString(),
            status: 'connected'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to get network status', 
            message: error.message,
            status: 'disconnected'
        });
    }
});

// Get account balance
router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const balance = await filecoinService.getBalance(address);
        
        res.json({
            success: true,
            address,
            balance,
            network: await filecoinService.getNetworkName()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get balance',
            message: error.message
        });
    }
});

// Get chain head information
router.get('/chain-head', async (req, res) => {
    try {
        const chainHead = await filecoinService.getChainHead();
        res.json({
            success: true,
            chainHead
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get chain head',
            message: error.message
        });
    }
});

// Get network version
router.get('/version', async (req, res) => {
    try {
        const version = await filecoinService.getVersion();
        res.json({
            success: true,
            version
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get version',
            message: error.message
        });
    }
});

module.exports = router;
