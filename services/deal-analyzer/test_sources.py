import requests
import json
import zstandard as zstd
import io
import sys
import pandas as pd
import time

# --- CONFIG ---
# Removed mainnet RPC URLs since they're not working reliably

CALIBRATION_RPC_URLS = [
    # Zondax calibration/testnet endpoint
    "https://api.zondax.ch/fil/node/calibration/rpc/v1",
]

S3_SNAPSHOT_URLS = [
    # Glif snapshot (update if needed)
    "https://snapshots.mainnet.filops.net/minimal/latest-minimal-snapshot.zst",
    # Filecoin Green (update if needed)
    "https://filecoin.filecoin.green/lotus/chain/export/latest.car.zst",
    # Starboard (update if needed)
    "https://snapshots.starboard.ventures/mainnet/minimal/latest-minimal-snapshot.zst",
]

# --- TEST CALIBRATION/TESTNET RPCS ---
def test_calibration_rpcs():
    print("\n--- Testing Calibration/Testnet Lotus RPCs ---")
    payload = {
        "jsonrpc": "2.0",
        "method": "Filecoin.StateNetworkName",
        "params": [],
        "id": 1
    }
    headers = {"Content-Type": "application/json"}
    for url in CALIBRATION_RPC_URLS:
        print(f"\nTesting Calibration RPC: {url}")
        try:
            resp = requests.post(url, data=json.dumps(payload), headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            print("  Success:", data.get("result"))
        except Exception as e:
            print("  Error:", e)

def test_s3_snapshots():
    print("\n--- Testing S3 Snapshots ---")
    for url in S3_SNAPSHOT_URLS:
        print(f"\nFetching S3 snapshot: {url}")
        try:
            resp = requests.get(url, stream=True, timeout=30)
            resp.raise_for_status()
            dctx = zstd.ZstdDecompressor()
            with dctx.stream_reader(resp.raw) as reader:
                # Read first 1024 bytes and print as text (may be JSONL or CAR header)
                chunk = reader.read(1024)
                print("  First 1KB (raw):", chunk[:200], "...")
                # Try to decode as text for JSONL
                try:
                    text = chunk.decode("utf-8", errors="ignore")
                    print("  First 200 chars (utf-8):", text[:200], "...")
                except Exception as e:
                    print("  Could not decode as utf-8:", e)
        except Exception as e:
            print("  Error:", e)

def test_filfox_recent_deals():
    print("\n--- Testing Recent Deals from Filfox API ---")
    url = "https://filfox.info/api/v1/deal/list"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        deals = data.get("deals", [])
        print(f"  Total deals returned: {len(deals)}")
        print(f"  Total count from API: {data.get('totalCount', 'N/A')}")
        
        # Enhanced deal details
        for i, deal in enumerate(deals[:5]):
            print(f"\n  Deal #{i+1}:")
            print(f"    Deal ID: {deal['id']}")
            print(f"    Provider: {deal['provider']}")
            print(f"    Client: {deal['client']}")
            print(f"    Piece Size: {deal['pieceSize']} bytes ({deal['pieceSize'] / (1024**3):.2f} GB)")
            print(f"    Verified Deal: {deal['verifiedDeal']}")
            print(f"    Storage Price: {deal.get('stroagePrice', 'N/A')} attoFIL")
            print(f"    Start Epoch: {deal['startEpoch']} (Timestamp: {deal['startTimestamp']})")
            print(f"    End Epoch: {deal['endEpoch']} (Timestamp: {deal['endTimestamp']})")
            print(f"    Deal Height: {deal['height']}")
            print(f"    Deal Timestamp: {deal['timestamp']}")
            
            # Calculate deal duration
            duration_epochs = deal['endEpoch'] - deal['startEpoch']
            duration_days = duration_epochs * 30 / (24 * 60 * 60)  # Approximate
            print(f"    Duration: {duration_epochs} epochs (~{duration_days:.1f} days)")
            
            # Calculate storage cost per GB per year
            if deal.get('stroagePrice') and deal.get('stroagePrice') != '0':
                try:
                    price_per_epoch = float(deal['stroagePrice'])
                    price_per_gb_per_year = (price_per_epoch * duration_epochs) / (deal['pieceSize'] / (1024**3)) * 365 / duration_days
                    print(f"    Cost per GB/year: {price_per_gb_per_year:.2f} attoFIL")
                except:
                    print(f"    Cost per GB/year: Could not calculate")
        
        # Summary statistics
        verified_deals = [d for d in deals if d['verifiedDeal']]
        active_deals = [d for d in deals if d['startEpoch'] <= 5114283 and d['endEpoch'] >= 5114283]  # Current epoch approximation
        
        print(f"\n  Summary:")
        print(f"    Verified deals: {len(verified_deals)}/{len(deals)} ({len(verified_deals)/len(deals)*100:.1f}%)")
        print(f"    Active deals: {len(active_deals)}/{len(deals)} ({len(active_deals)/len(deals)*100:.1f}%)")
        
        # Average piece size
        avg_piece_size = sum(d['pieceSize'] for d in deals) / len(deals)
        print(f"    Average piece size: {avg_piece_size / (1024**3):.2f} GB")
        
    except Exception as e:
        print("  Error fetching from Filfox API:", e)

# --- FILECOIN DAILY METRICS PARQUET ---
def test_filecoin_daily_metrics_parquet():
    print("\n--- Testing Filecoin Daily Metrics Parquet ---")
    url = 'https://data.filecoindataportal.xyz/filecoin_daily_metrics.parquet'
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        df = pd.read_parquet(io.BytesIO(response.content))
        df["date"] = pd.to_datetime(df["date"])
        # Only keep deal-related columns
        deal_cols = [
            "date",
            "deals",
            "unique_piece_cids",
            "unique_deal_making_clients",
            "unique_deal_making_providers",
            "data_on_active_deals_pibs",
            "unique_data_on_active_deals_pibs"
        ]
        df_deals = df[deal_cols]
        print(df_deals.tail(5))
    except Exception as e:
        print("  Error fetching or processing parquet:", e)

# --- DUNE ANALYTICS API ---
def get_dune_api_key_and_query_id():
    # Use the provided API key and query URL directly
    api_key = "yUFhkcCEsErWy5fZ8XQLt8tsKlSG4I0q"
    query_url = "https://dune.com/queries/3302707/5530901"
    # Extract query ID from URL
    import re
    m = re.search(r"/queries/(\d+)", query_url)
    query_id = int(m.group(1)) if m else None
    return api_key, query_id

def test_dune_filecoin_deals():
    print("\n--- Testing Dune Analytics Filecoin Deals API ---")
    api_key, query_id = get_dune_api_key_and_query_id()
    if not api_key or not query_id:
        print("  Missing API key or query ID.")
        return
    headers = {
        "x-dune-api-key": api_key,
        "Content-Type": "application/json"
    }
    # Start execution
    start_url = f"https://api.dune.com/api/v1/query/{query_id}/execute"
    try:
        resp = requests.post(start_url, headers=headers)
        resp.raise_for_status()
        execution_id = resp.json()["execution_id"]
        # Poll for completion
        while True:
            status_url = f"https://api.dune.com/api/v1/execution/{execution_id}/status"
            status = requests.get(status_url, headers=headers).json()
            if status["state"] == "QUERY_STATE_COMPLETED":
                break
            elif status["state"].startswith("QUERY_STATE_FAILED"):
                print("  Dune query failed.")
                return
            time.sleep(2)
        # Fetch results
        results_url = f"https://api.dune.com/api/v1/execution/{execution_id}/results"
        results = requests.get(results_url, headers=headers).json()
        rows = results["result"]["rows"]
        print(f"  Dune returned {len(rows)} rows. Showing up to 5:")
        for row in rows[:5]:
            print("   ", row)
    except Exception as e:
        print("  Error querying Dune API:", e)

def main():
    test_calibration_rpcs()
    test_s3_snapshots()
    test_filfox_recent_deals()
    test_filecoin_daily_metrics_parquet()
    test_dune_filecoin_deals()

if __name__ == "__main__":
    main() 