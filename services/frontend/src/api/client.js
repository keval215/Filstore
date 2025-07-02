const axios = require('axios');

class APIClient {
    constructor() {
        this.gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
        this.timeout = 30000; // 30 seconds
        this.walletAddress = null;
    }

    // Set wallet address for authentication
    setWalletAddress(address) {
        this.walletAddress = address;
    }

    // Sign a message with Web3 wallet
    async signMessage(message) {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Web3 wallet not available');
        }

        if (!this.walletAddress) {
            throw new Error('Wallet not connected');
        }

        try {
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.walletAddress]
            });
            return signature;
        } catch (error) {
            throw new Error('Failed to sign message with wallet');
        }
    }

    // Create authenticated headers for requests
    async getAuthHeaders(requireSignature = false, customMessage = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.walletAddress) {
            headers['X-Wallet-Address'] = this.walletAddress;
        }

        if (requireSignature) {
            const message = customMessage || `Filecoin Backup Operation at ${new Date().toISOString()}`;
            const signature = await this.signMessage(message);
            headers['X-Wallet-Signature'] = signature;
            headers['X-Signed-Message'] = message;
        }

        return headers;
    }

    // Gateway API calls with Web3 authentication
    async getGatewayStatus() {
        try {
            const headers = await this.getAuthHeaders(false);
            const response = await axios.get(`${this.gatewayUrl}/api/v1/status`, {
                timeout: this.timeout,
                headers
            });
            return response.data;
        } catch (error) {
            throw new Error(`Gateway API error: ${error.message}`);
        }
    }

    async createBackup(backupData) {
        try {
            const headers = await this.getAuthHeaders(true, `Create backup: ${JSON.stringify(backupData)}`);
            const response = await axios.post(`${this.gatewayUrl}/api/v1/backup`, backupData, {
                timeout: this.timeout,
                headers
            });
            return response.data;
        } catch (error) {
            throw new Error(`Backup creation failed: ${error.response?.data?.error || error.message}`);
        }
    }

    async getBackupStatus(backupId) {
        try {
            const headers = await this.getAuthHeaders(false);
            const response = await axios.get(`${this.gatewayUrl}/api/v1/backup/${backupId}`, {
                timeout: this.timeout,
                headers
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get backup status: ${error.response?.data?.error || error.message}`);
        }
    }

    async getSystemHealth() {
        try {
            const response = await axios.get(`${this.gatewayUrl}/api/v1/health`, {
                timeout: this.timeout
            });
            return response.data;
        } catch (error) {
            throw new Error(`Health check failed: ${error.message}`);
        }
    }

    // Engine API calls (through Gateway)
    async compressData(data, level = 6) {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/compress`, {
                data: data,
                level: level
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    async encryptData(data, key) {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/encrypt`, {
                data: data,
                key: key
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    // Blockchain API calls (through Gateway)
    async storeOnFilecoin(data, options = {}) {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/filecoin/store`, {
                data: data,
                duration: options.duration || 180,
                price: options.price || '0.0001'
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Filecoin storage failed: ${error.message}`);
        }
    }

    async retrieveFromFilecoin(cid) {
        try {
            const response = await axios.get(`${this.gatewayUrl}/api/v1/filecoin/retrieve/${cid}`, {
                timeout: this.timeout,
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Filecoin retrieval failed: ${error.message}`);
        }
    }

    async uploadToIPFS(data, filename) {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/ipfs/upload`, {
                data: data,
                filename: filename
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }

    // Wallet management
    async createWallet() {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/wallet/create`, {}, {
                timeout: this.timeout,
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Wallet creation failed: ${error.message}`);
        }
    }

    async getWalletBalance(walletId) {
        try {
            const response = await axios.get(`${this.gatewayUrl}/api/v1/wallet/${walletId}/balance`, {
                timeout: this.timeout,
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get wallet balance: ${error.message}`);
        }
    }

    // Storage optimization
    async optimizeStorage(files, requirements) {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/optimize/storage`, {
                files: files,
                requirements: requirements
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Storage optimization failed: ${error.message}`);
        }
    }

    async optimizeCost(storageSize, duration, priority) {
        try {
            const response = await axios.post(`${this.gatewayUrl}/api/v1/optimize/cost`, {
                storageSize: storageSize,
                duration: duration,
                priority: priority
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Cost optimization failed: ${error.message}`);
        }
    }

    // Utility methods
    isWalletConnected() {
        return !!this.walletAddress;
    }

    getWalletAddress() {
        return this.walletAddress;
    }

    disconnect() {
        this.walletAddress = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('wallet_address');
        }
    }

    // Batch operations
    async batchBackup(backups) {
        const results = [];
        for (const backup of backups) {
            try {
                const result = await this.createBackup(backup);
                results.push({ success: true, backup: backup.name, result });
            } catch (error) {
                results.push({ success: false, backup: backup.name, error: error.message });
            }
        }
        return results;
    }

    // Health monitoring
    async performHealthCheck() {
        const services = ['gateway', 'engine', 'blockchain'];
        const results = {};

        for (const service of services) {
            try {
                switch (service) {
                    case 'gateway':
                        await this.getSystemHealth();
                        results[service] = { status: 'healthy', timestamp: new Date().toISOString() };
                        break;
                    case 'engine':
                        // Try to compress some test data
                        await this.compressData('test data');
                        results[service] = { status: 'healthy', timestamp: new Date().toISOString() };
                        break;
                    case 'blockchain':
                        // Try to get Filecoin network status (mock for now)
                        results[service] = { status: 'healthy', timestamp: new Date().toISOString() };
                        break;
                }
            } catch (error) {
                results[service] = { 
                    status: 'unhealthy', 
                    error: error.message, 
                    timestamp: new Date().toISOString() 
                };
            }
        }

        return results;
    }
}

module.exports = new APIClient();
