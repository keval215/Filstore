const axios = require('axios');

class FilecoinService {
    constructor() {
        this.network = process.env.FILECOIN_NETWORK || 'calibration';
        this.rpcUrl = this.network === 'mainnet' 
            ? process.env.FILECOIN_NODE_URL || 'https://api.node.glif.io/rpc/v1'
            : process.env.FILECOIN_NODE_URL || 'https://api.calibration.node.glif.io/rpc/v1';
    }

    async makeRPCCall(method, params = []) {
        try {
            const response = await axios.post(this.rpcUrl, {
                jsonrpc: '2.0',
                method,
                params,
                id: 1
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message}`);
            }

            return response.data.result;
        } catch (error) {
            console.error(`RPC call failed for ${method}:`, error.message);
            throw error;
        }
    }

    async getBalance(address) {
        try {
            const result = await this.makeRPCCall('Filecoin.WalletBalance', [address]);
            return result || '0';
        } catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    }

    async getChainHead() {
        return await this.makeRPCCall('Filecoin.ChainHead');
    }

    async getVersion() {
        return await this.makeRPCCall('Filecoin.Version');
    }

    async getNetworkName() {
        try {
            const version = await this.getVersion();
            return version.Network || this.network;
        } catch (error) {
            return this.network;
        }
    }

    async getBlockByHeight(height) {
        const chainHead = await this.getChainHead();
        const tipset = chainHead.Cids || [];
        
        if (tipset.length === 0) {
            throw new Error('No tipset found');
        }

        return await this.makeRPCCall('Filecoin.ChainGetBlock', [tipset[0]]);
    }

    async sendTransaction(signedTx) {
        return await this.makeRPCCall('Filecoin.MpoolPush', [signedTx]);
    }
}

module.exports = FilecoinService;
