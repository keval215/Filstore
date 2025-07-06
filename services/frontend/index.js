const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const DataUpdater = require('./src/data-updater');

const cliRoutes = require('./src/cli');
const webRoutes = require('./src/web/app');
const apiClient = require('./src/api/client');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the data updater
const dataUpdater = new DataUpdater();

// Middleware
app.use(helmet());
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
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        analysis: getMockStorageAdvice()
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
        return res.json({
          success: true,
          timestamp: new Date().toISOString(),
          analysis: getMockStorageAdvice(),
          fallback: true
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
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          analysis: getMockStorageAdvice(),
          fallback: true
        });
      }
    });
    
    // Set a timeout for the Python process
    const timeoutHandle = setTimeout(() => {
      python.kill();
      console.warn('⚠️ Storage advisor timeout, using fallback data');
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        analysis: getMockStorageAdvice(),
        fallback: true
      });
    }, 10000); // 10 second timeout
    
  } catch (error) {
    console.error('Storage Advisor API error:', error);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis: getMockStorageAdvice(),
      fallback: true,
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

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'src/web/public')));

// Also serve JS files directly from root for compatibility
app.use('/metamask.js', express.static(path.join(__dirname, 'src/web/public/metamask.js')));
app.use('/ui.js', express.static(path.join(__dirname, 'src/web/public/ui.js')));
app.use('/dashboard.js', express.static(path.join(__dirname, 'src/web/public/dashboard.js')));
app.use('/styles.css', express.static(path.join(__dirname, 'src/web/public/styles.css')));

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
