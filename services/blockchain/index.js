const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Import our new services
const { CARGenerator } = require('./src/car-generator.js');
const { DealTransactionManager } = require('./src/deal-transaction-manager.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './data/uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
})

// Serve CAR files for provider download
app.use('/car', express.static('./data/car'));

// Initialize services
const carGenerator = new CARGenerator('./data/uploads', './data/car');
const dealManager = new DealTransactionManager();

// Store active deals in memory (in production, use database)
const activeDeals = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy', 
    service: 'blockchain',
    timestamp: new Date().toISOString()
  });
});

// Upload file and start deal creation process
app.post('/upload-and-deal', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { walletAddress, useDataCap } = req.body
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' })
    }

    console.log(`🚀 Starting deal creation process for: ${req.file.filename}`)
    console.log(`   Wallet: ${walletAddress}`)
    console.log(`   Use DataCap: ${useDataCap}`)

    // Step 1: Check wallet readiness
    const walletStatus = await dealManager.checkWalletReadiness(walletAddress)
    
    if (!walletStatus.canMakeDeals) {
      return res.status(400).json({ 
        error: 'Wallet not ready for deals',
        walletStatus,
        recommendations: walletStatus.recommendations
      })
    }

    // Step 2: Generate CAR file
    console.log(`📦 Generating CAR file...`)
    const carInfo = await carGenerator.generateCAR(req.file.filename)
    carInfo.downloadUrl = carGenerator.getCarDownloadUrl(carInfo.carFileName)

    // Step 3: Create deal transaction for MetaMask signing
    console.log(`🔨 Creating deal transaction...`)
    const dealTransaction = await dealManager.createDealTransaction(
      carInfo, 
      walletAddress, 
      { useDataCap: useDataCap === 'true' }
    )

    // Store deal info for tracking
    const dealId = `deal-${Date.now()}`
    activeDeals.set(dealId, {
      dealId,
      carInfo,
      walletAddress,
      useDataCap: useDataCap === 'true',
      status: 'ready_for_signing',
      createdAt: new Date().toISOString(),
      transaction: dealTransaction
    })

    res.json({
      success: true,
      dealId,
      carInfo: {
        rootCID: carInfo.rootCID,
        carSize: carInfo.carSize,
        pieceSize: carInfo.pieceSize,
        originalFile: carInfo.originalFile
      },
      walletStatus,
      dealTransaction,
      message: 'Ready to sign transaction with MetaMask'
    })

  } catch (error) {
    console.error('❌ Upload and deal creation failed:', error)
    res.status(500).json({ 
      error: 'Deal creation failed',
      details: error.message 
    })
  }
});

// Confirm deal after MetaMask signing
app.post('/confirm-deal', async (req, res) => {
  try {
    const { dealId, transactionHash, walletAddress } = req.body

    if (!dealId || !transactionHash) {
      return res.status(400).json({ error: 'Deal ID and transaction hash required' })
    }

    const dealInfo = activeDeals.get(dealId)
    if (!dealInfo) {
      return res.status(404).json({ error: 'Deal not found' })
    }

    console.log(`✅ Deal confirmed with transaction: ${transactionHash}`)

    // Submit deal to PiKNiK provider
    const submission = await dealManager.submitDealToPiKNiK(
      dealInfo.transaction.data, 
      dealInfo.carInfo.downloadUrl
    )

    // Update deal status
    dealInfo.status = 'submitted'
    dealInfo.transactionHash = transactionHash
    dealInfo.submission = submission
    dealInfo.submittedAt = new Date().toISOString()

    activeDeals.set(dealId, dealInfo)

    res.json({
      success: true,
      dealId,
      transactionHash,
      submission,
      message: 'Deal submitted to PiKNiK provider successfully!'
    })

  } catch (error) {
    console.error('❌ Deal confirmation failed:', error)
    res.status(500).json({ 
      error: 'Deal confirmation failed',
      details: error.message 
    })
  }
});

// Get deal status
app.get('/deal-status/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params
    const dealInfo = activeDeals.get(dealId)
    
    if (!dealInfo) {
      return res.status(404).json({ error: 'Deal not found' })
    }

    // Get current status from network (simulated for testnet)
    const networkStatus = await dealManager.getDealStatus(dealId)
    
    res.json({
      dealId,
      status: dealInfo.status,
      networkStatus,
      carInfo: dealInfo.carInfo,
      transactionHash: dealInfo.transactionHash,
      createdAt: dealInfo.createdAt,
      submittedAt: dealInfo.submittedAt
    })

  } catch (error) {
    console.error('❌ Failed to get deal status:', error)
    res.status(500).json({ 
      error: 'Failed to get deal status',
      details: error.message 
    })
  }
});

// Check wallet readiness
app.post('/check-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' })
    }

    const walletStatus = await dealManager.checkWalletReadiness(walletAddress)
    
    res.json({
      success: true,
      walletAddress,
      ...walletStatus
    })

  } catch (error) {
    console.error('❌ Wallet check failed:', error)
    res.status(500).json({ 
      error: 'Wallet check failed',
      details: error.message 
    })
  }
});

// List active deals
app.get('/deals', (req, res) => {
  const deals = Array.from(activeDeals.values()).map(deal => ({
    dealId: deal.dealId,
    originalFile: deal.carInfo.originalFile,
    rootCID: deal.carInfo.rootCID,
    status: deal.status,
    walletAddress: deal.walletAddress,
    createdAt: deal.createdAt,
    submittedAt: deal.submittedAt
  }));

  res.json({
    success: true,
    deals,
    total: deals.length
  });
});

app.listen(PORT, () => {
  console.log(`🔗 Blockchain service running on port ${PORT}`);
  console.log(`📁 Upload directory: ./data/uploads`);
  console.log(`📦 CAR directory: ./data/car`);
  console.log(`🎯 Target provider: t017840 (PiKNiK auto-accept)`);
});
