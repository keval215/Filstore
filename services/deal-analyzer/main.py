from fastapi import FastAPI, Query
from deal_fetcher import DealFetcher
from selector import select_best_deals
from reputation import ReputationScorer
from config import DEFAULT_NETWORK

app = FastAPI()

@app.get("/api/deals/all")
def get_all_deals(network: str = Query(DEFAULT_NETWORK)):
    try:
        fetcher = DealFetcher(network)
        deals = fetcher.fetch_lotus_deals()
        return {"deals": deals, "count": len(deals)}
    except Exception as e:
        print("Error in /api/deals/all:", e)
        return {"error": str(e)}

@app.get("/api/deals/best")
def get_best_deals(
    network: str = Query(DEFAULT_NETWORK, description="Network to use: 'mainnet' or 'testnet'"),
    verified: bool = Query(False),
    max_price: int = Query(None),
    limit: int = Query(5, description="Number of top deals to return (mainnet: top N by ID, testnet: filter and rank)")
):
    try:
        fetcher = DealFetcher(network)
        deals = fetcher.fetch_lotus_deals(limit=limit)
        # If deals is not a dict or contains error/info/tip, return as is
        if not isinstance(deals, dict) or any(k in deals for k in ("error", "info", "tip", "s3_info")):
            return {"deals": deals, "count": len(deals) if isinstance(deals, dict) else 0, "network": network}
        preferences = {"verified": verified, "max_price": max_price, "limit": limit}
        best = select_best_deals(deals, preferences)
        return {"deals": best, "count": len(best), "network": network}
    except Exception as e:
        print("Error in /api/deals/best:", e)
        return {"error": str(e), "network": network}

@app.get("/api/providers/{address}/reputation")
def get_provider_reputation(address: str):
    scorer = ReputationScorer()
    score = scorer.get_score(address)
    return {"address": address, "reputation": score} 