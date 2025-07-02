const express = require('express');
const multer = require('multer');
const path = require('path');
const StorageService = require('./storage.service');
const OptimizeService = require('./optimize.service');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

const storageService = new StorageService();
const optimizeService = new OptimizeService();

// Upload file to IPFS
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        const filename = req.body.name || req.file.originalname;
        const data = require('fs').readFileSync(req.file.path);
        
        const result = await storageService.uploadToIPFS(data, filename);
        
        // Clean up uploaded file
        require('fs').unlinkSync(req.file.path);

        res.json({ 
            success: true, 
            result: {
                ...result,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });
    } catch (error) {
        // Clean up file if it exists
        if (req.file?.path) {
            try {
                require('fs').unlinkSync(req.file.path);
            } catch {}
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload data (text/json) to IPFS
router.post('/upload-data', async (req, res) => {
    try {
        const { data, filename } = req.body;
        
        if (!data) {
            return res.status(400).json({ success: false, error: 'Data is required' });
        }

        const result = await storageService.uploadToIPFS(data, filename || 'data.json');
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Pin file to Pinata
router.post('/pin', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        const metadata = {
            name: req.body.name || req.file.originalname,
            description: req.body.description
        };

        const result = await storageService.pinToPinata(req.file.path, metadata);
        
        // Clean up uploaded file
        require('fs').unlinkSync(req.file.path);

        res.json({ success: true, result });
    } catch (error) {
        // Clean up file if it exists
        if (req.file?.path) {
            try {
                require('fs').unlinkSync(req.file.path);
            } catch {}
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Pin existing IPFS hash
router.post('/pin-hash', async (req, res) => {
    try {
        const { hash, metadata } = req.body;
        
        if (!hash) {
            return res.status(400).json({ success: false, error: 'IPFS hash required' });
        }

        const result = await storageService.pinHashToPinata(hash, metadata);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get data from IPFS
router.get('/ipfs/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const data = await storageService.getFromIPFS(hash);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// List pinned files
router.get('/pins', async (req, res) => {
    try {
        const pins = await storageService.listPinnedFiles();
        res.json({ success: true, pins });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get storage optimization recommendations
router.post('/optimize', async (req, res) => {
    try {
        const { fileSize, requirements } = req.body;
        
        if (!fileSize || fileSize <= 0) {
            return res.status(400).json({ success: false, error: 'Valid file size required' });
        }

        const optimization = optimizeService.optimizeStorage(fileSize, requirements);
        res.json({ success: true, optimization });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recommendations by file type
router.post('/optimize/:fileType', async (req, res) => {
    try {
        const { fileType } = req.params;
        const { fileSize } = req.body;
        
        if (!fileSize || fileSize <= 0) {
            return res.status(400).json({ success: false, error: 'Valid file size required' });
        }

        const optimization = optimizeService.getRecommendationsByFileType(fileType, fileSize);
        res.json({ success: true, fileType, optimization });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calculate storage costs
router.post('/cost', async (req, res) => {
    try {
        const { fileSize, duration } = req.body;
        
        if (!fileSize || fileSize <= 0) {
            return res.status(400).json({ success: false, error: 'Valid file size required' });
        }

        const costs = optimizeService.calculateStorageCosts(fileSize, duration);
        res.json({ success: true, costs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Compare providers
router.get('/providers/compare', (req, res) => {
    try {
        const comparison = optimizeService.compareProviders();
        res.json({ success: true, comparison });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available providers
router.get('/providers', (req, res) => {
    try {
        const providers = optimizeService.getProviders();
        res.json({ success: true, providers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
