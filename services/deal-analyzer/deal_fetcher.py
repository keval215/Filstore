import requests
from config import (
    LOTUS_RPC_MAINNETS, LOTUS_RPC_TESTNETS, BOOST_GRAPHQL_MAINNET, BOOST_GRAPHQL_TESTNET,
    CALIBRATION_DEALS_S3, MAINNET_DEALS_S3_URLS, S3_TESTNET_LIMIT, S3_MAINNET_LIMIT,
    S3_CACHE_PATH, S3_CACHE_EXPIRY, S3_RATE_LIMIT_SECONDS
)
import io
import json
import os
import time

try:
    import zstandard as zstd
except ImportError:
    zstd = None

class DealFetcher:
    def __init__(self, network='mainnet'):
        self.network = network
        self.lotus_rpc_mainnets = LOTUS_RPC_MAINNETS if network == 'mainnet' else []
        self.lotus_rpc_testnets = LOTUS_RPC_TESTNETS if network == 'testnet' else []
        self.boost_graphql = BOOST_GRAPHQL_MAINNET if network == 'mainnet' else BOOST_GRAPHQL_TESTNET

    def fetch_lotus_deals(self, limit=None):
        payload = {
            'jsonrpc': '2.0',
            'method': 'Filecoin.StateMarketDeals',
            'params': [None],
            'id': 1
        }
        endpoints = self.lotus_rpc_mainnets if self.network == 'mainnet' else self.lotus_rpc_testnets
        last_error = None
        for endpoint in endpoints:
            if not endpoint:
                continue
            try:
                if self.network == 'mainnet':
                    n = limit if limit is not None else S3_MAINNET_LIMIT
                    deals = {}
                    for deal_id in range(1, n + 1):
                        small_payload = {
                            'jsonrpc': '2.0',
                            'method': 'Filecoin.StateMarketStorageDeal',
                            'params': [deal_id, None],
                            'id': deal_id
                        }
                        try:
                            resp = requests.post(endpoint, json=small_payload, timeout=10)
                            resp.raise_for_status()
                            deal = resp.json().get('result', {})
                            if deal:
                                deals[str(deal_id)] = deal
                        except Exception as e:
                            continue
                    if deals:
                        return deals
                    else:
                        return {'info': f'Mainnet endpoint cannot return all deals, and fetching the first {n} deals by ID returned empty. The endpoint is up but may be rate-limited or restricted.'}
                else:
                    resp = requests.post(endpoint, json=payload, timeout=30)
                    resp.raise_for_status()
                    return resp.json().get('result', {})
            except Exception as e:
                last_error = e
                continue
        # S3 fallback for testnet/mainnet
        if self.network == 'testnet' and CALIBRATION_DEALS_S3:
            n = limit if limit is not None else S3_TESTNET_LIMIT
            s3_result = self._fetch_s3_deals(CALIBRATION_DEALS_S3, n)
            if isinstance(s3_result, dict):
                return s3_result
            else:
                return {'error': s3_result, 'tip': f'For heavy queries, you can use the pre-cached S3 file: {CALIBRATION_DEALS_S3}'}
        elif self.network == 'mainnet' and MAINNET_DEALS_S3_URLS:
            n = limit if limit is not None else S3_MAINNET_LIMIT
            s3_result = self._fetch_mainnet_s3_deals(n)
            if isinstance(s3_result, dict):
                return s3_result
            else:
                return {'error': s3_result, 'tip': 'For heavy queries, use a pre-cached S3 file if available.', 's3_info': MAINNET_DEALS_S3_URLS}
        if self.network == 'mainnet':
            return {
                'error': f"All mainnet RPC endpoints failed. Last error: {last_error}.",
                'tip': 'Mainnet endpoints may be overloaded or rate-limited. For heavy queries, use a pre-cached S3 file if available.',
                's3_info': MAINNET_DEALS_S3_URLS
            }
        elif self.network == 'testnet':
            return {
                'error': f"All Calibration RPC endpoints failed. Last error: {last_error}.",
                'tip': f'For heavy queries, you can use the pre-cached S3 file: {CALIBRATION_DEALS_S3}'
            }
        else:
            raise Exception(f"All {self.network} RPC endpoints failed. Last error: {last_error}.")

    def _fetch_mainnet_s3_deals(self, limit):
        if not zstd:
            return 'zstandard module not installed. Please install with `pip install zstandard`.'
        # Ensure cache dir exists
        cache_dir = os.path.dirname(S3_CACHE_PATH)
        if cache_dir and not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
        # Check cache freshness and rate limit
        now = time.time()
        if os.path.exists(S3_CACHE_PATH):
            mtime = os.path.getmtime(S3_CACHE_PATH)
            if now - mtime < S3_CACHE_EXPIRY:
                try:
                    with open(S3_CACHE_PATH, 'r', encoding='utf-8') as f:
                        deals = json.load(f)
                        return self._limit_deals(deals, limit)
                except Exception as e:
                    pass  # If cache is corrupt, re-download
            # Rate limit: don't re-download too often
            if now - mtime < S3_RATE_LIMIT_SECONDS:
                return f'Rate limit: S3 file was downloaded less than {S3_RATE_LIMIT_SECONDS} seconds ago.'
        # Try all S3 URLs in order
        last_error = None
        for url in MAINNET_DEALS_S3_URLS:
            try:
                resp = requests.get(url, timeout=60)
                resp.raise_for_status()
                dctx = zstd.ZstdDecompressor()
                with dctx.stream_reader(io.BytesIO(resp.content)) as reader:
                    text = reader.read().decode('utf-8')
                    deals = json.loads(text)
                    # Cache the full file
                    with open(S3_CACHE_PATH, 'w', encoding='utf-8') as f:
                        json.dump(deals, f)
                    return self._limit_deals(deals, limit)
            except Exception as e:
                last_error = e
                continue
        return f'Failed to fetch or parse any mainnet S3 file. Last error: {last_error}'

    def _fetch_s3_deals(self, url, limit):
        if not zstd:
            return 'zstandard module not installed. Please install with `pip install zstandard`.'
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            dctx = zstd.ZstdDecompressor()
            with dctx.stream_reader(io.BytesIO(resp.content)) as reader:
                text = reader.read().decode('utf-8')
                deals = json.loads(text)
                return self._limit_deals(deals, limit)
        except Exception as e:
            return f'Failed to fetch or parse S3 file: {e}'

    def _limit_deals(self, deals, limit):
        result = {}
        for i, (deal_id, deal) in enumerate(deals.items()):
            if i >= limit:
                break
            result[deal_id] = deal
        return result

    def fetch_boost_deals(self):
        query = '{ deals(limit: 100, offset: 0) { deals { ID DealStatus PieceCid PieceSize IsVerified Client Provider StartEpoch EndEpoch StoragePricePerEpoch } } }'
        resp = requests.post(self.boost_graphql, json={'query': query})
        resp.raise_for_status()
        return resp.json().get('data', {}).get('deals', {}).get('deals', []) 