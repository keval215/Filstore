# Filecoin Deal Analyzer Service

## Overview

This service provides comprehensive Filecoin deal analysis for both mainnet and testnet networks. The service has been restructured to use reliable data sources and provide proper aggregation for both networks.

## 🏗️ Architecture

### Mainnet Data Sources (Reliable APIs)
- **Filfox API** - Recent deals and market activity
- **Filecoin Data Portal Parquet** - Historical metrics and trends
- **Dune Analytics** - Comprehensive network health data

### Testnet Data Sources (RPC + APIs)
- **Calibration RPC** - Zondax calibration network endpoint
- **Testnet RPC** - Zondax testnet network endpoint
- **Calibration Filfox** - Calibration network explorer API
- **Testnet Filfox** - Testnet network explorer API

## 📁 File Structure

```
services/deal-analyzer/
├── README.md                           # This file
├── test_sources.py                     # Test individual data sources
├── data_aggregator.py                  # Mainnet data aggregation (no RPCs)
├── testnet_aggregator.py               # Testnet-specific data aggregation
├── unified_aggregator.py               # Unified mainnet + testnet aggregator
├── user_storage_advisor.py             # User-focused storage recommendations
├── demo_data_sources.py                # Demo of data source capabilities
└── USER_GUIDE.md                       # User guide for storage decisions
```

## 🚀 Quick Start

### 1. Test Data Sources
```bash
cd services/deal-analyzer
python test_sources.py
```

### 2. Mainnet Analysis
```python
from data_aggregator import FilecoinDealDataAggregator

# Mainnet analysis (no RPCs, only reliable APIs)
aggregator = FilecoinDealDataAggregator()
analysis = aggregator.get_comprehensive_deal_analysis()
```

### 3. Testnet Analysis
```python
from testnet_aggregator import TestnetDealDataAggregator

# Testnet analysis
aggregator = TestnetDealDataAggregator()
analysis = aggregator.get_comprehensive_testnet_analysis()
```

### 4. Unified Analysis
```python
from unified_aggregator import UnifiedFilecoinAggregator

# Mainnet
mainnet_agg = UnifiedFilecoinAggregator("mainnet")
mainnet_analysis = mainnet_agg.get_comprehensive_analysis()

# Testnet
testnet_agg = UnifiedFilecoinAggregator("testnet")
testnet_analysis = testnet_agg.get_comprehensive_analysis()
```

## 📊 Data Sources

### Mainnet (Reliable APIs Only)
| Source | Purpose | Reliability |
|--------|---------|-------------|
| Filfox API | Recent deals, pricing, provider info | ✅ High |
| Data Portal Parquet | Historical trends, market metrics | ✅ High |
| Dune Analytics | Network health, comprehensive stats | ✅ High |

### Testnet (RPC + APIs)
| Source | Purpose | Reliability |
|--------|---------|-------------|
| Calibration RPC | Chain info, network metrics | ⚠️ Variable |
| Testnet RPC | Chain info, network metrics | ⚠️ Variable |
| Calibration Filfox | Recent deals, market activity | ✅ High |
| Testnet Filfox | Recent deals, market activity | ✅ High |

## 🔧 Key Features

### Mainnet Features
- ✅ **Recent Deal Analysis** - Latest deals with pricing and analytics
- ✅ **Historical Trends** - 30-day market trends and patterns
- ✅ **Network Health** - Comprehensive network metrics
- ✅ **User Recommendations** - Personalized storage advice
- ✅ **Market Insights** - Pricing trends and activity levels

### Testnet Features
- ✅ **Chain Information** - Network status and connectivity
- ✅ **Recent Deals** - Testnet deal activity and analytics
- ✅ **Network Metrics** - Chain height, timestamps, tipset info
- ✅ **Provider Information** - Active testnet providers
- ✅ **Comprehensive Analysis** - Combined insights and recommendations

## 📈 Data Analysis Capabilities

### Deal Analytics
- Deal count and activity levels
- Verified vs regular deal ratios
- Average piece sizes and storage prices
- Deal duration analysis
- Price range and trends

### Market Insights
- Network utilization metrics
- FIL+ adoption rates
- Provider and client activity
- Data storage growth trends
- Market health indicators

### User Recommendations
- Pricing trend analysis
- Optimal timing for deals
- Deal type recommendations (verified vs regular)
- Data optimization suggestions
- Provider selection guidance

## 🎯 Use Cases

### For Storage Providers
- Market rate analysis
- Competitor activity monitoring
- Network health assessment
- Capacity planning insights

### For Storage Clients
- Cost optimization strategies
- Provider selection criteria
- Market timing decisions
- Storage duration planning

### For Developers
- Network monitoring
- Anomaly detection
- Growth forecasting
- Performance analysis

## 🔍 Example Output

### Mainnet Analysis
```json
{
  "timestamp": "2025-01-XX...",
  "sources": {
    "filfox": {
      "total_deals": 100,
      "analytics": {
        "verified_deals_percentage": 65.4,
        "average_piece_size_gb": 2.3,
        "average_storage_price": 0.000001
      }
    },
    "historical": {
      "market_insights": {
        "current_market": {
          "daily_new_deals": 96963,
          "verified_deals_percentage": 100.0
        },
        "pricing": {
          "price_trend": "stable",
          "current_storage_cost": 0.0000017486790514880075
        }
      }
    },
    "network": {
      "metrics": {
        "active_deals": 28121188,
        "data_stored_pibs": 1107.9,
        "network_utilization": 0.327
      }
    }
  },
  "insights": {
    "market_health": {
      "total_active_deals": 28121188,
      "fil_plus_adoption": 0.654
    },
    "recommendations": [
      "High FIL+ adoption - consider verified deals for better reliability"
    ]
  }
}
```

### Testnet Analysis
```json
{
  "timestamp": "2025-01-XX...",
  "network": "calibration",
  "sources": {
    "chain_info": {
      "network": "calibration",
      "status": "active",
      "endpoint": "https://api.zondax.ch/fil/node/calibration/rpc/v1"
    },
    "deals": {
      "total_deals": 25,
      "analytics": {
        "verified_deals_percentage": 80.0,
        "average_piece_size_gb": 0.5
      }
    },
    "network_metrics": {
      "metrics": {
        "chain_height": 1234567,
        "chain_timestamp": 1234567890
      }
    }
  },
  "insights": {
    "network_health": {
      "network": "calibration",
      "status": "active"
    },
    "recommendations": [
      "High FIL+ adoption in testnet. Consider verified deals for testing."
    ]
  }
}
```

## 🚨 Important Notes

### Mainnet RPC Removal
- **Removed**: All mainnet RPC functionality due to reliability issues
- **Reason**: Mainnet RPCs were returning empty responses or timing out
- **Solution**: Using only reliable APIs (Filfox, Data Portal, Dune)

### Testnet Reliability
- **Calibration RPC**: Primary testnet endpoint (Zondax)
- **Fallback**: Testnet RPC if calibration fails
- **APIs**: Filfox explorers for both networks as backup

### Data Freshness
- **Filfox API**: Real-time deal data
- **Parquet Data**: Daily updates
- **Dune Analytics**: Daily aggregated metrics
- **RPC Data**: Real-time chain information

## 🔧 Configuration

### Environment Variables
```bash
# Dune Analytics API Key (for mainnet)
DUNE_API_KEY=yUFhkcCEsErWy5fZ8XQLt8tsKlSG4I0q

# Network selection
NETWORK=mainnet  # or testnet
```

### Customization
- Modify `mainnet_sources` in aggregators for different endpoints
- Adjust `testnet_sources` for different testnet networks
- Customize analysis periods in historical metrics functions

## 📝 Dependencies

```bash
pip install requests pandas pyarrow
```

## 🤝 Contributing

1. Test data sources before making changes
2. Update both mainnet and testnet aggregators
3. Maintain backward compatibility
4. Add proper error handling for network issues

## 📞 Support

For issues with:
- **Mainnet data**: Check Filfox API, Data Portal, or Dune Analytics status
- **Testnet data**: Verify RPC endpoint connectivity
- **Analysis**: Review data source availability and format changes 