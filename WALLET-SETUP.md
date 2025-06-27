# Filecoin Wallet Setup Guide

## Overview

This guide explains how the Filecoin wallet system works in your container and how to fund your wallet for different scenarios.

## How It Works

### 1. **Automatic Wallet Generation**
When the container starts for the first time:
- ✅ Checks for existing wallet in `/app/data/config/default-wallet.json`
- ✅ If none exists, generates a new Filecoin wallet automatically
- ✅ Creates secure private key using secp256k1 cryptography
- ✅ Derives Filecoin address from public key
- ✅ Stores wallet securely with encryption

### 2. **No On-Chain Registration Required**
- ✅ Filecoin addresses exist immediately after generation
- ✅ No blockchain transaction needed to "register" the address
- ✅ Address becomes active once it receives FIL tokens

### 3. **Automatic Network Detection**
- 🧪 **Testnet (Calibration)**: For development/testing
- 💰 **Mainnet**: For production use
- Set via `FILECOIN_NETWORK` environment variable

## Funding Your Wallet

### Scenario 1: Testnet (Calibration Network) 🧪

#### Option A: Automatic Faucet (Recommended)
```bash
# The container attempts this automatically on startup
curl -X POST http://localhost:3001/api/v1/wallet-manager/{wallet-id}/faucet
```

#### Option B: Manual Faucet
1. **ChainSafe Faucet**: https://faucet.calibnet.chainsafe-fil.io/
2. **Zondax Faucet**: https://beryx.zondax.ch/faucet/
3. **Forest Faucet**: https://forest-explorer.chainsafe.dev/faucet/calibnet

**Steps:**
1. Visit any faucet URL
2. Enter your wallet address (shown in container logs)
3. Request test FIL
4. Wait 1-2 minutes for funds to arrive

### Scenario 2: User HAS Another Wallet 💰

#### Transfer from Existing Wallet
1. **From Lotus CLI:**
   ```bash
   lotus wallet send <your-address> <amount>
   ```

2. **From Web Wallet:**
   - Open your existing wallet (Glif, etc.)
   - Send FIL to the generated address
   - Confirm transaction

3. **From Hardware Wallet:**
   - Use Ledger/Trezor with supported software
   - Send to the container's address

### Scenario 3: User Has NO Wallet 🆕

#### Option A: Buy from Exchange
1. **Supported Exchanges:**
   - Coinbase Pro
   - Binance
   - Kraken
   - Gemini
   - KuCoin

2. **Steps:**
   ```
   1. Create account on exchange
   2. Complete KYC verification
   3. Buy FIL with fiat/crypto
   4. Withdraw to container address
   5. Wait for confirmations
   ```

#### Option B: Get from Someone Else
1. Ask someone to send FIL to your address
2. Use peer-to-peer platforms
3. Community faucets (for small amounts)

## Container Commands

### Check Wallet Status
```bash
# Inside container
node src/check-wallet.js

# From host
docker-compose exec blockchain node src/check-wallet.js
```

### Manual Wallet Generation
```bash
# Generate new wallet
curl -X POST http://localhost:3001/api/v1/wallet-manager/generate \
  -H "Content-Type: application/json" \
  -d '{"network": "calibration"}'
```

### Check Balance
```bash
# Get wallet balance
curl http://localhost:3001/api/v1/wallet-manager/{wallet-id}/balance
```

### Get Funding Instructions
```bash
# Get detailed funding instructions
curl http://localhost:3001/api/v1/wallet-manager/{wallet-id}/funding-instructions
```

## Wallet File Structure

```
data/
├── wallets/           # Encrypted wallet files
│   └── {uuid}.json   # Individual wallet data
├── config/           # Configuration files
│   └── default-wallet.json  # Default wallet reference
└── logs/             # Application logs
```

## Security Features

- 🔐 **Private keys encrypted** with AES-256
- 🔑 **Secure key generation** using secp256k1
- 📁 **Isolated storage** in container volumes
- 🚫 **No private keys in logs** or API responses
- 🔄 **Automatic backup** of wallet config

## Monitoring

The container automatically:
- 👀 **Monitors wallet balance** every 30 seconds
- 📊 **Logs funding events** when FIL arrives
- ✅ **Updates wallet status** when funded
- 🔔 **Provides notifications** via logs

## Troubleshooting

### Wallet Not Found
```bash
# Reinitialize wallet
docker-compose exec blockchain node src/container-wallet-init.js
```

### Balance Check Fails
```bash
# Check network connectivity
curl -X POST https://api.calibration.node.glif.io/rpc/v1 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"Filecoin.ChainHead","params":[],"id":1}'
```

### Faucet Fails
1. Try different faucets manually
2. Check if address is valid Filecoin format
3. Ensure you're on testnet (calibration)
4. Wait between requests (rate limiting)

### Mainnet Setup
```bash
# Set environment for mainnet
FILECOIN_NETWORK=mainnet
FILECOIN_NODE_URL=https://api.node.glif.io/rpc/v1
```

## Example Workflow

### First Time Setup (Testnet)
```bash
1. docker-compose up -d
   # ✅ Container generates wallet automatically
   # ✅ Shows wallet address in logs
   # ✅ Attempts auto-faucet

2. # Wait 1-2 minutes for faucet
   docker-compose logs blockchain

3. # Verify funding
   docker-compose exec blockchain node src/check-wallet.js
   # ✅ Shows balance > 0 FIL

4. # Ready for backup operations!
```

### Production Setup (Mainnet)
```bash
1. # Set environment
   FILECOIN_NETWORK=mainnet

2. docker-compose up -d
   # ✅ Generates mainnet wallet

3. # Fund wallet from exchange
   # Send FIL to address shown in logs

4. # Verify funding
   docker-compose exec blockchain node src/check-wallet.js

5. # Ready for production!
```

## API Endpoints

- `POST /api/v1/wallet-manager/generate` - Generate new wallet
- `GET /api/v1/wallet-manager/list` - List all wallets
- `GET /api/v1/wallet-manager/{id}` - Get wallet details
- `GET /api/v1/wallet-manager/{id}/balance` - Check balance
- `POST /api/v1/wallet-manager/{id}/faucet` - Request testnet funds
- `GET /api/v1/wallet-manager/{id}/funding-instructions` - Get funding help

This system ensures that users can get started quickly regardless of their Web3 experience level!
