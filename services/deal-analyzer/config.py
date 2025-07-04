import os

# List of Mainnet endpoints for fallback
LOTUS_RPC_MAINNETS = [
    "https://api.node.glif.io/rpc/v1",
    "https://rpc.lighthouse.storage/rpc/v1",
    "https://rpc.filecoin.ankr.com/rpc/v1",
    "https://filecoin-mainnet.chainstacklabs.com/rpc/v1",
    # "https://filecoin-mainnet.blastapi.io/rpc/v1",  # Add API key support if needed
]
# List of Calibration endpoints for fallback
LOTUS_RPC_TESTNETS = [
    "https://api.calibration.node.glif.io/rpc/v1",
    "https://rpc.calibration.lighthouse.storage/rpc/v1",
    "https://rpc.calibration.filecoin.ankr.com/rpc/v1",
]
# Pre-cached Calibration deals S3 file
CALIBRATION_DEALS_S3 = "https://marketdeals-calibration.s3.amazonaws.com/StateMarketDeals.json.zst"
# Pre-cached Mainnet deals S3 files (all are for mainnet)
MAINNET_DEALS_S3_URLS = [
    "https://marketdeals.s3.amazonaws.com/StateMarketDeals.json.zst",  # Glif official
    "https://data.filecoin.green/marketdeals/StateMarketDeals.json.zst",  # Filecoin Green
    "https://fil-chain-snapshots.s3.amazonaws.com/mainnet/StateMarketDeals.json.zst"  # Starboard Ventures
]
# Local cache settings for S3 files
S3_CACHE_PATH = "cache/StateMarketDeals_mainnet.json"
S3_CACHE_EXPIRY = 3600  # seconds (1 hour)
S3_RATE_LIMIT_SECONDS = 300  # Minimum seconds between S3 downloads (5 min)

# Default S3 fallback limits
S3_TESTNET_LIMIT = 20
S3_MAINNET_LIMIT = 5

BOOST_GRAPHQL_MAINNET = os.getenv('BOOST_GRAPHQL_MAINNET', 'http://localhost:8080/graphql')
BOOST_GRAPHQL_TESTNET = os.getenv('BOOST_GRAPHQL_TESTNET', 'http://localhost:8080/graphql')

DEFAULT_NETWORK = os.getenv('DEFAULT_NETWORK', 'mainnet')
CACHE_TTL = int(os.getenv('CACHE_TTL', '600'))  # seconds 