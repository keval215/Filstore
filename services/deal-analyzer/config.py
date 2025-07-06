import os


 
# List of Calibration endpoints for fallback
LOTUS_RPC_TESTNETS = [
    "https://api.calibration.node.glif.io/rpc/v1",
    "https://rpc.calibration.lighthouse.storage/rpc/v1",
    "https://rpc.calibration.filecoin.ankr.com/rpc/v1",
]

CALIBRATION_DEALS_S3 = "https://marketdeals-calibration.s3.amazonaws.com/StateMarketDeals.json.zst"


# Local cache settings for S3 files
S3_CACHE_PATH = "cache/StateMarketDeals_mainnet.json"
S3_CACHE_EXPIRY = 3600  # seconds (1 hour)
S3_RATE_LIMIT_SECONDS = 300  # Minimum seconds between S3 downloads (5 min)

# Default S3 fallback limits
S3_TESTNET_LIMIT = 20
S3_MAINNET_LIMIT = 5



BOOST_GRAPHQL_TESTNET = os.getenv('BOOST_GRAPHQL_TESTNET', 'https://api.calibration.node.glif.io/graphql')



BOOST_GRAPHQL_TESTNET_FALLBACKS = [
    'https://api.calibration.node.glif.io/graphql',
    'https://rpc.calibration.lighthouse.storage/graphql'
]

DEFAULT_NETWORK = os.getenv('DEFAULT_NETWORK', 'mainnet')
CACHE_TTL = int(os.getenv('CACHE_TTL', '600'))  # seconds 