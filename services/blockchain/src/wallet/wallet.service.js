const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const secp256k1 = require('secp256k1');
const { blake2bHex } = require('blakejs');

class WalletService {
    constructor() {
        this.walletDir = path.resolve('./data/wallets');
        this.network = process.env.FILECOIN_NETWORK || 'calibration';
        this.addressPrefix = this.network === 'mainnet' ? 'f' : 't';
        
        // Faucet URLs for testnet tokens
        this.faucetUrls = {
            calibration: [
                'https://faucet.calibnet.chainsafe-fil.io/',
                'https://beryx.zondax.ch/faucet/',
                'https://forest-explorer.chainsafe.dev/faucet/calibnet'
            ]
        };
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fsSync.existsSync(this.walletDir)) {
            fsSync.mkdirSync(this.walletDir, { recursive: true });
            console.log(`📁 Created directory: ${this.walletDir}`);
        }
    }

    getWalletFileName(network = this.network) {
        return `wallet-${network}.json`;
    }

    getWalletPath(network = this.network) {
        return path.join(this.walletDir, this.getWalletFileName(network));
    }

    // Base32 encoding for Filecoin addresses
    base32Encode(data) {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
        let result = '';
        let bits = 0;
        let value = 0;

        for (let i = 0; i < data.length; i++) {
            value = (value << 8) | data[i];
            bits += 8;

            while (bits >= 5) {
                result += alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }

        if (bits > 0) {
            result += alphabet[(value << (5 - bits)) & 31];
        }

        return result;
    }

    // Calculate checksum for Filecoin address
    calculateChecksum(payload) {
        const hash = blake2bHex(payload, null, 4);
        return Buffer.from(hash, 'hex');
    }

    // Generate Filecoin address from public key
    generateFilecoinAddress(publicKey, addressType = 1) {
        // Create payload: [address_type, hash_of_pubkey]
        const pubkeyHash = blake2bHex(publicKey, null, 20);
        const payload = Buffer.concat([
            Buffer.from([addressType]),
            Buffer.from(pubkeyHash, 'hex')
        ]);

        // Calculate checksum
        const checksum = this.calculateChecksum(payload);
        
        // Combine payload and checksum
        const addressBytes = Buffer.concat([payload, checksum]);
        
        // Encode with base32
        const encoded = this.base32Encode(addressBytes);
        
        return `${this.addressPrefix}1${encoded}`;
    }

    // Generate a new wallet
    async generateWallet(network = this.network) {
        await this.ensureWalletDir();
        
        try {
            // Generate 32-byte private key
            let privateKey;
            do {
                privateKey = crypto.randomBytes(32);
            } while (!secp256k1.privateKeyVerify(privateKey));

            // Generate public key
            const publicKey = secp256k1.publicKeyCreate(privateKey, false);
            
            // Generate Filecoin address
            const addressPrefix = network === 'mainnet' ? 'f' : 't';
            const address = this.generateFilecoinAddress(publicKey, addressPrefix);

            const wallet = {
                address,
                privateKey: privateKey.toString('hex'),
                publicKey: publicKey.toString('hex'),
                network: network,
                created: new Date().toISOString()
            };

            // Save wallet to file with clean naming
            const walletPath = this.getWalletPath(network);
            await fs.writeFile(walletPath, JSON.stringify(wallet, null, 2));

            console.log(`💰 ${network.toUpperCase()} wallet created: ${wallet.address}`);
            
            // Show faucet information for testnet
            if (network === 'calibration') {
                this.showFaucetInfo(wallet.address);
            }

            return wallet;
        } catch (error) {
            console.error('Error generating wallet:', error);
            throw error;
        }
    }

    async ensureWalletDir() {
        try {
            await fs.access(this.walletDir);
        } catch {
            await fs.mkdir(this.walletDir, { recursive: true });
            console.log(`📁 Created wallet directory: ${this.walletDir}`);
        }
    }

    // Show faucet information
    showFaucetInfo(address) {
        console.log('\n🚰 FAUCET INFORMATION');
        console.log('=====================');
        console.log(`📋 Your wallet address: ${address}`);
        console.log('\n🌐 To get test tokens, visit any of these faucets:');
        
        this.faucetUrls[this.network]?.forEach((url, index) => {
            console.log(`   ${index + 1}. ${url}`);
        });
        
        console.log('\n📝 Instructions:');
        console.log('   1. Copy your wallet address above');
        console.log('   2. Open one of the faucet URLs in your browser');
        console.log('   3. Paste your address and request tokens');
        console.log('   4. Wait for the transaction to confirm');
        console.log('\n💡 Tip: Some faucets may require you to wait between requests\n');
    }

    // Load wallet by address (updated method)
    async loadWallet(address) {
        try {
            const wallets = await this.listWallets();
            const foundWallet = wallets.find(w => w.address === address);
            return foundWallet ? await this.loadWalletByNetwork(foundWallet.network) : null;
        } catch (error) {
            console.error('Error loading wallet by address:', error);
            return null;
        }
    }

    // Load wallet by network (updated method)
    async loadWalletByNetwork(network = this.network) {
        try {
            const walletPath = this.getWalletPath(network);
            const content = await fs.readFile(walletPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null; // Wallet doesn't exist
            }
            console.error('Error loading wallet:', error);
            return null;
        }
    }

    // Check if wallet exists for network
    async walletExists(network = this.network) {
        try {
            const walletPath = this.getWalletPath(network);
            await fs.access(walletPath);
            return true;
        } catch {
            return false;
        }
    }

    // Get or create wallet for specific network
    async getOrCreateWallet(network = this.network) {
        let wallet = await this.loadWalletByNetwork(network);
        
        if (!wallet) {
            console.log(`🏗️  Creating new ${network} wallet...`);
            wallet = await this.generateWallet(network);
        } else {
            console.log(`📝 Using existing ${network} wallet: ${wallet.address}`);
        }
        
        return wallet;
    }

    // Initialize both wallets (testnet and mainnet)
    async initializeBothWallets() {
        console.log('🚀 Initializing both wallets...');
        
        const testnetWallet = await this.getOrCreateWallet('calibration');
        const mainnetWallet = await this.getOrCreateWallet('mainnet');
        
        return {
            calibration: testnetWallet,
            mainnet: mainnetWallet
        };
    }

    // Delete wallet by network
    async deleteWallet(network) {
        try {
            const walletPath = this.getWalletPath(network);
            await fs.unlink(walletPath);
            console.log(`🗑️  Deleted ${network} wallet`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`⚠️  ${network} wallet doesn't exist`);
                return false;
            }
            throw error;
        }
    }

    // List all wallets (updated to use new structure - max 2 wallets)
    async listWallets() {
        const wallets = [];
        
        // Check for testnet wallet
        const testnetWallet = await this.loadWalletByNetwork('calibration');
        if (testnetWallet) {
            wallets.push({
                address: testnetWallet.address,
                network: testnetWallet.network,
                created: testnetWallet.created
            });
        }

        // Check for mainnet wallet  
        const mainnetWallet = await this.loadWalletByNetwork('mainnet');
        if (mainnetWallet) {
            wallets.push({
                address: mainnetWallet.address,
                network: mainnetWallet.network,
                created: mainnetWallet.created
            });
        }

        return wallets;
    }

    // Initialize wallet (updated method)
    async initializeWallet() {
        console.log(`� Initializing ${this.network.toUpperCase()} wallet...`);
        return await this.getOrCreateWallet(this.network);
    }

    // Validate Filecoin address format
    validateAddress(address) {
        const addressRegex = /^[ft][0-4][a-z2-7]+$/;
        return addressRegex.test(address);
    }
}

module.exports = WalletService;
