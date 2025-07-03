import crypto from 'crypto';

/**
 * Web3 Wallet Authentication Middleware for Data-Prep Service
 * This implements the same Web3-only authentication as the gateway service
 */

// Middleware to validate Web3 wallet authentication
export function walletAuth(req, res, next) {
  // Skip authentication for health and status endpoints
  if (req.path === '/health' || req.path === '/status') {
    return next();
  }

  // Check if this is a write operation that requires signing
  if (isWriteOperation(req.method, req.path)) {
    try {
      validateWalletSignature(req);
    } catch (error) {
      return res.status(401).json({
        error: error.message,
        message: 'Web3 wallet signature required for this operation',
        type: 'authentication_required'
      });
    }
  } else {
    // For read operations, just check if wallet address is provided
    const walletAddress = req.headers['x-wallet-address'];
    if (walletAddress) {
      req.walletAddress = walletAddress;
      req.authenticated = true;
    }
  }

  next();
}

// Determine if operation requires Web3 signature
function isWriteOperation(method, path) {
  const writeOperations = [
    'POST /api/car/create',
    'POST /api/car/process',
    'DELETE /api/car/',
    'POST /api/watcher/start',
    'POST /api/watcher/stop',
    'POST /api/upload',
    'DELETE /api/upload/'
  ];

  const operation = `${method} ${path}`;
  return writeOperations.some(writeOp => operation.includes(writeOp));
}

// Validate Web3 wallet signature
function validateWalletSignature(req) {
  const walletAddress = req.headers['x-wallet-address'];
  const signature = req.headers['x-wallet-signature'];
  const message = req.headers['x-signed-message'];

  if (!walletAddress || !signature || !message) {
    throw new Error('Web3 wallet authentication required: missing wallet address, signature, or signed message');
  }

  // Verify the signature using the same logic as the gateway
  if (!verifyEthereumSignature(walletAddress, message, signature)) {
    throw new Error('Invalid Web3 wallet signature');
  }

  // Set wallet context
  req.walletAddress = walletAddress;
  req.authenticated = true;
}

// Verify Ethereum-style signature (compatible with MetaMask, Coinbase Wallet, etc.)
function verifyEthereumSignature(address, message, signature) {
  try {
    // This is a simplified version - in production you'd use a proper crypto library
    // like ethers.js or web3.js for signature verification
    
    // For now, we'll implement basic validation
    // Remove 0x prefix if present
    signature = signature.replace(/^0x/, '');
    address = address.replace(/^0x/, '');

    // Basic validation - signature should be 130 chars (65 bytes hex)
    if (signature.length !== 130) {
      return false;
    }

    // Basic address validation - should be 40 chars (20 bytes hex)
    if (address.length !== 40) {
      return false;
    }

    // In a real implementation, you would:
    // 1. Hash the message using Ethereum's signed message format
    // 2. Recover the public key from the signature
    // 3. Derive the address from the public key
    // 4. Compare with the provided address
    
    // For development, we'll accept any properly formatted signature
    return /^[0-9a-fA-F]+$/.test(signature) && /^[0-9a-fA-F]+$/.test(address);
    
  } catch (error) {
    return false;
  }
}

// Middleware to require authentication
export function requireAuth(req, res, next) {
  if (!req.authenticated) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'This endpoint requires Web3 wallet authentication',
      type: 'authentication_required'
    });
  }
  next();
}

// Helper to get wallet address from request
export function getWalletAddress(req) {
  return req.walletAddress;
}

// Validate wallet address format
export function isValidWalletAddress(address) {
  if (!address) return false;
  
  // Remove 0x prefix if present
  const cleanAddress = address.replace(/^0x/, '');
  
  // Should be 40 characters (20 bytes) of hex
  return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
}
