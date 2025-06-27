const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const router = express.Router();

const IPFS_URL = process.env.IPFS_URL || 'https://ipfs.infura.io:5001';

// Upload data to IPFS
router.post('/ipfs/upload', async (req, res) => {
  try {
    const { data, filename } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Create form data for IPFS upload
    const form = new FormData();
    form.append('file', Buffer.from(data), { filename: filename || 'backup.dat' });

    const response = await axios.post(`${IPFS_URL}/api/v0/add`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`
      }
    });

    const ipfsHash = response.data.Hash;

    res.json({
      success: true,
      ipfsHash: ipfsHash,
      size: response.data.Size,
      name: response.data.Name,
      gateway: `https://ipfs.io/ipfs/${ipfsHash}`
    });
  } catch (error) {
    console.error('IPFS upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload to IPFS', message: error.message });
  }
});

// Get data from IPFS
router.get('/ipfs/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    const response = await axios.get(`${IPFS_URL}/api/v0/cat?arg=${hash}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`
      }
    });

    res.json({
      success: true,
      data: response.data,
      hash: hash
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve from IPFS', message: error.message });
  }
});

// Pin data to IPFS
router.post('/ipfs/pin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    const response = await axios.post(`${IPFS_URL}/api/v0/pin/add?arg=${hash}`, {}, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`
      }
    });

    res.json({
      success: true,
      pinned: response.data.Pins,
      hash: hash
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pin to IPFS', message: error.message });
  }
});

// List pinned files
router.get('/ipfs/pins', async (req, res) => {
  try {
    const response = await axios.post(`${IPFS_URL}/api/v0/pin/ls`, {}, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`
      }
    });

    res.json({
      success: true,
      pins: response.data.Keys || {}
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list pins', message: error.message });
  }
});

// Storage providers management
router.get('/providers', async (req, res) => {
  try {
    // Mock storage providers data
    const providers = [
      {
        id: 'f01234',
        name: 'Storage Provider 1',
        location: 'US-East',
        price: '0.0001',
        reputation: 4.8,
        capacity: '100TB',
        available: true
      },
      {
        id: 'f05678',
        name: 'Storage Provider 2',
        location: 'EU-West',
        price: '0.0002',
        reputation: 4.9,
        capacity: '500TB',
        available: true
      },
      {
        id: 'f09012',
        name: 'Storage Provider 3',
        location: 'Asia-Pacific',
        price: '0.00015',
        reputation: 4.7,
        capacity: '250TB',
        available: false
      }
    ];

    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get storage providers', message: error.message });
  }
});

// Get storage provider details
router.get('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Mock provider details
    const provider = {
      id: id,
      name: `Storage Provider ${id}`,
      location: 'US-East',
      price: '0.0001',
      reputation: 4.8,
      capacity: '100TB',
      used: '45TB',
      available: true,
      deals: 1250,
      uptime: '99.9%',
      lastSeen: new Date().toISOString()
    };

    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get provider details', message: error.message });
  }
});

module.exports = router;
