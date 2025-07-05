# Data Retrieval Implementation Guide

This guide explains how the data retrieval system works in the Deal Analyzer service and how to use it.

## 🏗️ Architecture Overview

The data retrieval system consists of several components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Layer     │    │  Data Fetcher   │    │   Cache Layer   │
│   (main.py)     │◄──►│ (deal_fetcher.py)│◄──►│   (cache.py)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Data Sources   │
                       │ • Lotus RPC     │
                       │ • Boost GraphQL │
                       │ • S3 Files      │
                       └─────────────────┘
```

## 📁 File Structure

```
deal-analyzer/
├── main.py                    # FastAPI application with endpoints
├── deal_fetcher.py           # Main data retrieval engine
├── cache.py                  # Caching system
├── config.py                 # Configuration and endpoints
├── selector.py               # Deal selection logic
├── reputation.py             # Provider reputation scoring
├── requirements.txt          # Python dependencies
├── setup.py                  # Setup script
├── test_data_retrieval.py    # Test script
└── cache/                    # Cache directory (created automatically)
```

## 🚀 Quick Start

### Step 1: Setup Environment

```bash
# Navigate to the deal-analyzer directory
cd services/deal-analyzer

# Run the setup script
python setup.py
```

### Step 2: Test Data Retrieval

```bash
# Test the data retrieval functionality
python test_data_retrieval.py
```

### Step 3: Run the API Server

```bash
# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Access the API

- **API Documentation**: http://localhost:8000/docs
- **Root Endpoint**: http://localhost:8000/
- **All Deals**: http://localhost:8000/api/deals/all
- **Best Deals**: http://localhost:8000/api/deals/best
- **Deal Statistics**: http://localhost:8000/api/deals/stats

## 🔧 How Data Retrieval Works

### 1. Data Sources

The system fetches data from multiple sources:

#### **Lotus RPC Endpoints**
- **Mainnet**: Real Filecoin network with actual deals
- **Testnet**: Calibration network for testing
- **Fallback**: Multiple endpoints for reliability

#### **Boost GraphQL**
- Alternative data source for deal information
- Requires a running Boost instance

#### **S3 Files**
- Pre-cached deal data for faster access
- Compressed with zstandard for efficiency
- Automatic fallback when RPC endpoints fail

### 2. Caching System

The system uses a two-level caching approach:

#### **Memory Cache**
- Stores API responses in memory
- Configurable TTL (Time To Live)
- Thread-safe implementation

#### **File Cache**
- Stores downloaded S3 files locally
- Prevents repeated downloads
- Rate limiting to avoid abuse

### 3. Error Handling

The system implements robust error handling:

- **Multiple Endpoints**: Tries different sources if one fails
- **Graceful Degradation**: Falls back to S3 if RPC fails
- **Rate Limiting**: Prevents overwhelming external services
- **Detailed Logging**: Helps with debugging

## 📊 API Endpoints

### GET `/api/deals/all`
Fetches all available deals from the specified network.

**Parameters:**
- `network` (string): `mainnet` or `testnet` (default: `mainnet`)

**Example:**
```bash
curl "http://localhost:8000/api/deals/all?network=testnet"
```

### GET `/api/deals/best`
Fetches the best deals based on user preferences.

**Parameters:**
- `network` (string): `mainnet` or `testnet`
- `verified` (boolean): Only verified deals
- `max_price` (integer): Maximum price per epoch
- `limit` (integer): Number of deals to return

**Example:**
```bash
curl "http://localhost:8000/api/deals/best?network=testnet&verified=true&limit=10"
```

### GET `/api/deals/stats`
Returns statistics about deals on the network.

**Parameters:**
- `network` (string): `mainnet` or `testnet`

**Example:**
```bash
curl "http://localhost:8000/api/deals/stats?network=testnet"
```

### GET `/api/deals/boost`
Fetches deals from Boost GraphQL endpoint.

**Parameters:**
- `network` (string): `mainnet` or `testnet`

**Example:**
```bash
curl "http://localhost:8000/api/deals/boost?network=testnet"
```

## 🔍 Understanding Deal Data

### Deal Structure

Each deal contains the following information:

```json
{
  "Proposal": {
    "Provider": "f01234...",
    "Client": "f05678...",
    "StoragePricePerEpoch": "1000000",
    "VerifiedDeal": true,
    "PieceSize": "34359738368",
    "StartEpoch": 123456,
    "EndEpoch": 1234560
  },
  "State": {
    "SectorStartEpoch": 123456,
    "LastUpdatedEpoch": 123456
  }
}
```

### Key Fields Explained

- **Provider**: Storage provider's address
- **Client**: Client's address
- **StoragePricePerEpoch**: Price per epoch in attoFIL
- **VerifiedDeal**: Whether this is a verified deal
- **PieceSize**: Size of the data piece in bytes
- **StartEpoch/EndEpoch**: Deal duration

## 🛠️ Configuration

### Environment Variables

You can configure the service using environment variables:

```bash
# Network configuration
export DEFAULT_NETWORK=testnet

# Cache settings
export CACHE_TTL=600

# Boost GraphQL endpoints
export BOOST_GRAPHQL_MAINNET=http://localhost:8080/graphql
export BOOST_GRAPHQL_TESTNET=http://localhost:8080/graphql
```

### Configuration File

The `config.py` file contains all the endpoints and settings:

```python
# RPC Endpoints
LOTUS_RPC_MAINNETS = [
    "https://api.node.glif.io/rpc/v1",
    "https://rpc.lighthouse.storage/rpc/v1",
    # ... more endpoints
]

# S3 Files
MAINNET_DEALS_S3_URLS = [
    "https://marketdeals.s3.amazonaws.com/StateMarketDeals.json.zst",
    # ... more URLs
]

# Cache Settings
S3_CACHE_EXPIRY = 3600  # 1 hour
S3_RATE_LIMIT_SECONDS = 300  # 5 minutes
```

## 🧪 Testing

### Running Tests

```bash
# Run the test script
python test_data_retrieval.py
```

### Test Coverage

The test script covers:

1. **Testnet Deal Fetching**: Basic functionality test
2. **Mainnet Deal Fetching**: Real network test
3. **Deal Statistics**: Data analysis test
4. **Cache Functionality**: Caching system test
5. **Boost Integration**: GraphQL endpoint test

### Manual Testing

You can also test manually using curl:

```bash
# Test basic functionality
curl "http://localhost:8000/"

# Test deal fetching
curl "http://localhost:8000/api/deals/all?network=testnet"

# Test with parameters
curl "http://localhost:8000/api/deals/best?network=testnet&limit=5&verified=true"
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Import Errors
```
ModuleNotFoundError: No module named 'zstandard'
```
**Solution**: Run `python setup.py` to install dependencies.

#### 2. Network Timeouts
```
requests.exceptions.Timeout
```
**Solution**: The system will automatically retry with different endpoints.

#### 3. Rate Limiting
```
Rate limit: S3 file was downloaded less than 300 seconds ago
```
**Solution**: Wait a few minutes or use cached data.

#### 4. Boost Connection Errors
```
Failed to fetch from Boost GraphQL
```
**Solution**: This is normal if Boost is not configured. The system will work without it.

### Debug Mode

Enable debug logging by modifying the logging level in `deal_fetcher.py`:

```python
logging.basicConfig(level=logging.DEBUG)
```

## 📈 Performance Optimization

### Caching Strategy

1. **Memory Cache**: Fast access to recent data
2. **File Cache**: Persistent storage for large datasets
3. **TTL Management**: Automatic cache expiration

### Rate Limiting

- **S3 Downloads**: Limited to once per 5 minutes
- **RPC Calls**: Automatic retry with exponential backoff
- **Cache Usage**: Reduces external API calls

### Data Sources Priority

1. **Lotus RPC**: Primary source (fastest)
2. **S3 Files**: Fallback (most reliable)
3. **Boost GraphQL**: Alternative (requires setup)

## 🔮 Future Enhancements

### Planned Features

1. **Database Integration**: Store deals in a database
2. **Real-time Updates**: WebSocket connections for live data
3. **Advanced Filtering**: More sophisticated deal selection
4. **Provider Analytics**: Detailed provider performance metrics
5. **Deal History**: Historical deal data analysis

### Contributing

To contribute to the data retrieval system:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests
5. Submit a pull request

## 📚 Additional Resources

- [Filecoin Documentation](https://docs.filecoin.io/)
- [Lotus RPC API](https://lotus.filecoin.io/developers/apis/json-rpc/)
- [Boost Documentation](https://boost.filecoin.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

This guide should help you understand and use the data retrieval system effectively. If you have questions or need help, please refer to the troubleshooting section or create an issue in the repository.
