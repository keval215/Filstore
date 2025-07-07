const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const fetch = require('node-fetch');
const multer = require('multer');
const DataUpdater = require('./src/data-updater');

const cliRoutes = require('./src/cli');
const webRoutes = require('./src/web/app');
const apiClient = require('./src/api/client');

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL: JavaScript file routes MUST be FIRST before any middleware
// to prevent helmet CSP and other middleware from interfering
app.get('/ethers.min.js', (req, res) => {
  console.log(`🚨 ROUTE HIT: ethers.min.js requested at ${new Date().toISOString()}`);
  const filePath = path.join(__dirname, 'src/web/public/ethers.min.js');
  console.log(`🔧 Serving ethers.min.js from: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } else {
    console.error('ethers.min.js not found');
    res.status(404).send('ethers.min.js not found');
  }
});

app.get('/deal-creator.js', (req, res) => {
  const filePath = path.join(__dirname, 'src/web/public/deal-creator.js');
  console.log(`🔧 Serving deal-creator.js from: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } else {
    console.error('deal-creator.js not found');
    res.status(404).send('deal-creator.js not found');
  }
});

app.get('/metamask.js', (req, res) => {
  const filePath = path.join(__dirname, 'src/web/public/metamask.js');
  console.log(`🔧 Serving metamask.js from: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } else {
    console.error('metamask.js not found');
    res.status(404).send('metamask.js not found');
  }
});

app.get('/ui.js', (req, res) => {
  const filePath = path.join(__dirname, 'src/web/public/ui.js');
  console.log(`🔧 Serving ui.js from: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } else {
    console.error('ui.js not found');
    res.status(404).send('ui.js not found');
  }
});

app.get('/dashboard.js', (req, res) => {
  const filePath = path.join(__dirname, 'src/web/public/dashboard.js');
  console.log(`🔧 Serving dashboard.js from: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } else {
    console.error('dashboard.js not found');
    res.status(404).send('dashboard.js not found');
  }
});

// Initialize the data updater
const dataUpdater = new DataUpdater();

// Configure multer for file uploads (for proxying to blockchain service)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './temp-uploads'
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

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts and self-hosted scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"], // Allow external CSS CDNs
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:3001"], // Allow connections to blockchain service
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API endpoints for deals data from JSON files
app.get('/api/mainnet/deals', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const filePath = path.join(__dirname, 'src/web/public', 'deals-mainnet.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Mainnet deals data not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Apply limit if specified
    if (limit && limit < data.deals.length) {
      const limitedData = {
        ...data,
        deals: data.deals.slice(0, limit),
        total_deals: limit
      };
      return res.json(limitedData);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error serving mainnet deals:', error);
    res.status(500).json({ error: 'Failed to load mainnet deals data' });
  }
});

app.get('/api/testnet/deals', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const filePath = path.join(__dirname, 'src/web/public', 'deals-testnet.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Testnet deals data not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Apply limit if specified
    if (limit && limit < data.deals.length) {
      const limitedData = {
        ...data,
        deals: data.deals.slice(0, limit),
        total_deals: limit
      };
      return res.json(limitedData);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error serving testnet deals:', error);
    res.status(500).json({ error: 'Failed to load testnet deals data' });
  }
});

// General API endpoint for network-specific deals
app.get('/api/:network/deals', (req, res) => {
  const { network } = req.params;
  
  if (!['mainnet', 'testnet'].includes(network)) {
    return res.status(400).json({ error: 'Invalid network. Use mainnet or testnet.' });
  }
  
  try {
    const limit = parseInt(req.query.limit) || (network === 'mainnet' ? 50 : 25);
    const filePath = path.join(__dirname, 'src/web/public', `deals-${network}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `${network.charAt(0).toUpperCase() + network.slice(1)} deals data not found` });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Apply limit if specified
    if (limit && limit < data.deals.length) {
      const limitedData = {
        ...data,
        deals: data.deals.slice(0, limit),
        total_deals: limit
      };
      return res.json(limitedData);
    }
    
    res.json(data);
  } catch (error) {
    console.error(`Error serving ${network} deals:`, error);
    res.status(500).json({ error: `Failed to load ${network} deals data` });
  }
});

// Storage Advisor API endpoint
app.get('/api/storage-advisor', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    console.log(`📊 Storage Advisor: Analyzing ${days} days of market data...`);
    
    // Try to call the Python storage advisor service
    const { spawn } = require('child_process');
    const advisorPath = path.join(__dirname, '../deal-analyzer/user_storage_advisor.py');
    
    // Check if Python script exists
    if (!fs.existsSync(advisorPath)) {
      console.warn('⚠️ Python storage advisor not found, using fallback data');
      console.log('💡 This error is likely due to missing Python environment setup.');
      console.log('📋 To fix this issue, try installing dependencies:');
      console.log('   1. Ensure Python environment is activated: myenv\\Scripts\\activate');
      console.log('   2. Install required packages: pip install -r requirements.txt');
      console.log('   3. Check if deal-analyzer directory exists with user_storage_advisor.py');
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        analysis: getMockStorageAdvice(),
        fallback: true,
        fallback_reason: 'Python advisor script not found - check environment setup'
      });
    }
    
    const python = spawn('d:/Filstore/myenv/Scripts/python.exe', [advisorPath, '--days', days.toString(), '--json']);
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      clearTimeout(timeoutHandle); // Clear timeout to prevent double response
      
      if (code !== 0) {
        console.error('Storage Advisor error:', error);
        console.warn('⚠️ Python storage advisor failed, using fallback data');
        console.log('💡 This error is likely due to missing Python dependencies.');
        console.log('📋 To fix this issue, try:');
        console.log('   1. Activate Python environment: myenv\\Scripts\\activate');
        console.log('   2. Install dependencies: pip install pandas numpy requests');
        console.log('   3. Check Python path and script permissions');
        console.log('   Error details:', error);
        return res.json({
          success: true,
          timestamp: new Date().toISOString(),
          analysis: getMockStorageAdvice(),
          fallback: true,
          fallback_reason: 'Python advisor execution failed - check dependencies'
        });
      }
      
      try {
        const analysis = JSON.parse(output);
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          analysis: analysis
        });
      } catch (parseError) {
        console.error('Failed to parse advisor output:', parseError);
        console.warn('⚠️ Storage advisor parse failed, using fallback data');
        console.log('💡 This error might be due to incomplete Python environment setup.');
        console.log('📋 The Python script ran but returned invalid JSON. Try:');
        console.log('   1. Check if all Python dependencies are installed');
        console.log('   2. Test the script manually: python user_storage_advisor.py --json');
        console.log('   3. Verify Python environment has: pandas, numpy, requests, json');
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          analysis: getMockStorageAdvice(),
          fallback: true,
          fallback_reason: 'Python advisor output parsing failed - check dependencies'
        });
      }
    });
    
    // Set a timeout for the Python process
    const timeoutHandle = setTimeout(() => {
      python.kill();
      console.warn('⚠️ Storage advisor timeout, using fallback data');
      console.log('💡 Python advisor process timed out after 10 seconds.');
      console.log('📋 This could indicate missing dependencies or slow environment:');
      console.log('   1. Check if Python environment is properly activated');
      console.log('   2. Ensure all required packages are installed');
      console.log('   3. Test script execution speed manually');
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        analysis: getMockStorageAdvice(),
        fallback: true,
        fallback_reason: 'Python advisor timeout - check environment performance'
      });
    }, 10000); // 10 second timeout
    
  } catch (error) {
    console.error('Storage Advisor API error:', error);
    console.log('💡 General Storage Advisor error - likely environment issue.');
    console.log('📋 To resolve this issue:');
    console.log('   1. Check if Python is installed and accessible');
    console.log('   2. Verify myenv virtual environment exists');
    console.log('   3. Install dependencies: pip install pandas numpy requests');
    console.log('   4. Ensure deal-analyzer directory and scripts exist');
    console.log('   Error:', error.message);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis: getMockStorageAdvice(),
      fallback: true,
      fallback_reason: 'Storage Advisor API error - check Python environment',
      error: error.message
    });
  }
});

// Mock storage advice for fallback
function getMockStorageAdvice() {
  return {
    market_insights: {
      current_market: {
        daily_new_deals: 45234,
        verified_deals_percentage: 67.8,
        regular_deals_percentage: 32.2,
        unique_content_daily: 12456,
        data_onboarded_today_pibs: 156.7
      },
      pricing: {
        current_storage_cost: 1.23e15,
        average_cost_period: 1.45e15,
        price_trend: "decreasing",
        price_change_percent: -5.2
      },
      market_activity: {
        average_daily_deals: 42000,
        average_verified_ratio: 65.4,
        market_activity_level: "High",
        total_deals_period: 294000
      },
      data_efficiency: {
        unique_data_ratio: 0.78,
        data_deduplication_efficiency: "Good"
      }
    },
    recommendations: [
      {
        category: "Pricing",
        priority: "Medium",
        message: "Storage costs are decreasing. You might get better rates by waiting.",
        action: "Monitor prices for optimal timing"
      },
      {
        category: "Deal Type",
        priority: "High",
        message: "High FIL+ adoption (67.8%). Verified deals offer better provider incentives.",
        action: "Consider verified deals for better reliability"
      },
      {
        category: "Market Timing",
        priority: "Medium",
        message: "High market activity. Many providers are actively making deals.",
        action: "Good time to shop around for providers"
      }
    ],
    decision_framework: {
      decision_factors: {
        cost: {
          description: "Storage price per GB",
          importance: "High",
          considerations: [
            "Current market rates",
            "Price trends (increasing/decreasing)",
            "Long-term vs short-term deals"
          ]
        },
        reliability: {
          description: "Provider reputation and uptime",
          importance: "High",
          considerations: [
            "Provider track record",
            "Geographic distribution",
            "Redundancy (multiple providers)"
          ]
        },
        deal_type: {
          description: "Verified vs regular deals",
          importance: "Medium",
          considerations: [
            "FIL+ verified deals offer better incentives",
            "Regular deals may be cheaper",
            "Provider preference for verified deals"
          ]
        }
      },
      decision_checklist: [
        "What's your budget per GB?",
        "How long do you need to store the data?",
        "Is data redundancy important?",
        "Do you qualify for FIL+ verified deals?",
        "What's your data access pattern?",
        "Are you comfortable with provider selection?"
      ]
    }
  };
}

// Storage decision framework endpoint
app.get('/api/storage-framework', (req, res) => {
  res.json({
    decision_factors: {
      cost: {
        description: "Storage price per GB",
        importance: "High",
        considerations: [
          "Current market rates",
          "Price trends (increasing/decreasing)",
          "Long-term vs short-term deals"
        ]
      },
      reliability: {
        description: "Provider reputation and uptime",
        importance: "High",
        considerations: [
          "Provider track record",
          "Geographic distribution",
          "Redundancy (multiple providers)"
        ]
      },
      deal_type: {
        description: "Verified vs regular deals",
        importance: "Medium",
        considerations: [
          "FIL+ verified deals offer better incentives",
          "Regular deals may be cheaper",
          "Provider preference for verified deals"
        ]
      },
      duration: {
        description: "Deal length and flexibility",
        importance: "Medium",
        considerations: [
          "Longer deals often have better rates",
          "Consider data lifecycle needs",
          "Early termination costs"
        ]
      },
      data_size: {
        description: "Amount of data to store",
        importance: "High",
        considerations: [
          "Larger deals may get volume discounts",
          "Consider breaking into multiple deals",
          "Piece size optimization"
        ]
      }
    },
    decision_checklist: [
      "What's your budget per GB?",
      "How long do you need to store the data?",
      "Is data redundancy important?",
      "Do you qualify for FIL+ verified deals?",
      "What's your data access pattern?",
      "Are you comfortable with provider selection?"
    ]
  });
});

// Manual data update endpoints
app.post('/api/update/:network', async (req, res) => {
  const { network } = req.params;
  
  if (!['mainnet', 'testnet'].includes(network)) {
    return res.status(400).json({ error: 'Invalid network. Use mainnet or testnet.' });
  }
  
  try {
    const result = await dataUpdater.triggerManualUpdate(network);
    res.json({
      message: `Manual update triggered for ${network}`,
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update', async (req, res) => {
  try {
    const result = await dataUpdater.triggerManualUpdate();
    res.json({
      message: 'Manual update triggered for all networks',
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Data update status endpoint
app.get('/api/update/status', (req, res) => {
  try {
    const status = dataUpdater.getUpdateStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files with proper MIME types
const staticOptions = {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
};

app.use('/static', express.static(path.join(__dirname, 'src/web/public'), staticOptions));

// Health check
// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'frontend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/cli', cliRoutes);
app.use('/api/v1/web', webRoutes);

// Debug middleware for API routes
app.use('/api/*', (req, res, next) => {
  console.log(`🔍 API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Test API client connectivity
app.get('/api/v1/test', async (req, res) => {
  try {
    const gatewayStatus = await apiClient.getGatewayStatus();
    res.json({
      status: 'connected',
      gateway: gatewayStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

// Save deals to local file
app.post('/save-deals', (req, res) => {
  const network = req.query.network;
  if (!network || (network !== 'mainnet' && network !== 'testnet')) {
    return res.status(400).json({ error: 'Invalid network' });
  }
  const deals = req.body;
  const filePath = path.join(__dirname, 'src/web/public', `deals-${network}.json`);
  fs.writeFile(filePath, JSON.stringify(deals), err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save file' });
    }
    res.json({ status: 'ok' });
  });
});

// Proxy endpoints for blockchain service
app.post('/check-wallet', async (req, res) => {
  try {
    const response = await fetch('http://blockchain:3001/check-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to blockchain service:', error);
    res.status(500).json({ error: 'Failed to connect to blockchain service' });
  }
});

app.post('/upload-and-deal', upload.single('file'), async (req, res) => {
  try {
    // Create a FormData object to forward the file
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Add the file if it exists
    if (req.file) {
      formData.append('file', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
    }
    
    // Add other form fields
    Object.keys(req.body).forEach(key => {
      formData.append(key, req.body[key]);
    });
    
    const response = await fetch('http://blockchain:3001/upload-and-deal', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying file upload to blockchain service:', error);
    res.status(500).json({ error: 'Failed to connect to blockchain service' });
  }
});

app.post('/confirm-deal', async (req, res) => {
  try {
    const response = await fetch('http://blockchain:3001/confirm-deal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to blockchain service:', error);
    res.status(500).json({ error: 'Failed to connect to blockchain service' });
  }
});

app.get('/deal-status/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    const response = await fetch(`http://blockchain:3001/deal-status/${dealId}`);
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to blockchain service:', error);
    res.status(500).json({ error: 'Failed to connect to blockchain service' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Serve web dashboard (SPA) - THIS MUST BE LAST!
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/web/public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend service running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
