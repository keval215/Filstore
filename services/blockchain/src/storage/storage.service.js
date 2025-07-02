const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class StorageService {
    constructor() {
        this.ipfsUrl = process.env.IPFS_URL || 'https://ipfs.infura.io:5001';
        this.pinataApiKey = process.env.PINATA_API_KEY;
        this.pinataSecretKey = process.env.PINATA_SECRET_API_KEY;
        this.web3StorageToken = process.env.WEB3_STORAGE_TOKEN;
    }

    // Upload to IPFS
    async uploadToIPFS(data, filename = 'backup.dat') {
        try {
            const form = new FormData();
            
            if (typeof data === 'string') {
                form.append('file', Buffer.from(data), { filename });
            } else if (Buffer.isBuffer(data)) {
                form.append('file', data, { filename });
            } else {
                throw new Error('Data must be string or Buffer');
            }

            const response = await axios.post(`${this.ipfsUrl}/api/v0/add`, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET
                        ? `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`
                        : undefined
                },
                timeout: 30000
            });

            return {
                hash: response.data.Hash,
                size: response.data.Size,
                name: response.data.Name,
                gateway: `https://ipfs.io/ipfs/${response.data.Hash}`
            };
        } catch (error) {
            console.error('IPFS upload error:', error.message);
            throw new Error(`Failed to upload to IPFS: ${error.message}`);
        }
    }

    // Pin to Pinata
    async pinToPinata(filePath, metadata = {}) {
        if (!this.pinataApiKey || !this.pinataSecretKey) {
            throw new Error('Pinata API keys not configured');
        }

        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));
            
            if (metadata.name) {
                form.append('pinataMetadata', JSON.stringify({ name: metadata.name }));
            }

            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
                headers: {
                    ...form.getHeaders(),
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                },
                timeout: 60000
            });

            return response.data;
        } catch (error) {
            throw new Error(`Pinata upload failed: ${error.response?.data?.error || error.message}`);
        }
    }

    // Pin hash to Pinata
    async pinHashToPinata(ipfsHash, metadata = {}) {
        if (!this.pinataApiKey || !this.pinataSecretKey) {
            throw new Error('Pinata API keys not configured');
        }

        try {
            const response = await axios.post('https://api.pinata.cloud/pinning/pinByHash', {
                hashToPin: ipfsHash,
                pinataMetadata: metadata
            }, {
                headers: {
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Pin hash failed: ${error.response?.data?.error || error.message}`);
        }
    }

    // Get data from IPFS
    async getFromIPFS(hash) {
        try {
            const response = await axios.get(`${this.ipfsUrl}/api/v0/cat?arg=${hash}`, {
                headers: process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET
                    ? { 'Authorization': `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}` }
                    : {},
                timeout: 30000
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
        }
    }

    // List pinned files from Pinata
    async listPinnedFiles() {
        if (!this.pinataApiKey || !this.pinataSecretKey) {
            throw new Error('Pinata API keys not configured');
        }

        try {
            const response = await axios.get('https://api.pinata.cloud/data/pinList', {
                headers: {
                    'pinata_api_key': this.pinataApiKey,
                    'pinata_secret_api_key': this.pinataSecretKey
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`List pins failed: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = StorageService;
