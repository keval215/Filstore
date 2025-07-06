#!/usr/bin/env python3
"""
Filecoin Deal Analyzer API Server
Provides REST API endpoints for deal analysis and recommendations
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import uvicorn
import logging
from datetime import datetime, timezone
import time

# Import our aggregators
from data_aggregator import FilecoinDealDataAggregator
from testnet_aggregator import TestnetDealDataAggregator
from unified_aggregator import UnifiedFilecoinAggregator
from user_storage_advisor import FilecoinStorageAdvisor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Filecoin Deal Analyzer API",
    description="Comprehensive Filecoin deal analysis for mainnet and testnet",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize aggregators
mainnet_aggregator = FilecoinDealDataAggregator()
testnet_aggregator = TestnetDealDataAggregator()
storage_advisor = FilecoinStorageAdvisor()

# Pydantic models for API responses
class DealInfo(BaseModel):
    id: int
    provider: str
    client: str
    piece_size: int
    verified_deal: bool
    storage_price: Optional[str]
    start_epoch: int
    end_epoch: int
    duration_days: float

class MarketInsights(BaseModel):
    daily_new_deals: int
    verified_deals_percentage: float
    average_piece_size_gb: float
    average_storage_price: float
    market_activity_level: str

class NetworkHealth(BaseModel):
    total_active_deals: int
    data_stored_pibs: float
    network_utilization: float
    fil_plus_adoption: float
    active_providers: int
    active_clients: int

class Recommendation(BaseModel):
    category: str
    priority: str
    message: str
    action: str

class AnalysisResponse(BaseModel):
    timestamp: str
    network: str
    market_insights: MarketInsights
    network_health: Optional[NetworkHealth]
    recommendations: List[Recommendation]
    deals: List[DealInfo]

# Helper to convert Filecoin epoch to timestamp (approximate)
EPOCH_DURATION_SECONDS = 30
FILECOIN_GENESIS_TIMESTAMP = 1598306400  # Mainnet genesis (2020-08-25T06:00:00Z)

def epoch_to_datetime(epoch: int) -> str:
    ts = FILECOIN_GENESIS_TIMESTAMP + epoch * EPOCH_DURATION_SECONDS
    return datetime.utcfromtimestamp(ts).replace(tzinfo=timezone.utc).isoformat()

def get_deal_status(start_epoch: int, end_epoch: int, current_epoch: int) -> str:
    if current_epoch < start_epoch:
        return "Pending"
    elif start_epoch <= current_epoch <= end_epoch:
        return "Active"
    else:
        return "Expired"

# API Routes

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Filecoin Deal Analyzer API",
        "version": "2.0.0",
        "networks": ["mainnet", "testnet"],
        "endpoints": {
            "mainnet": {
                "recent_deals": "/api/mainnet/deals",
                "market_analysis": "/api/mainnet/market",
                "comprehensive": "/api/mainnet/analysis"
            },
            "testnet": {
                "recent_deals": "/api/testnet/deals",
                "network_info": "/api/testnet/network",
                "comprehensive": "/api/testnet/analysis"
            },
            "user_advisor": "/api/advisor/market-analysis",
            "health": "/api/health"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Filecoin Deal Analyzer API"
    }

# Mainnet Endpoints

@app.get("/api/mainnet/deals")
async def get_mainnet_deals(limit: int = Query(50, ge=1, le=100)):
    """Get recent mainnet deals"""
    try:
        result = mainnet_aggregator.get_recent_deals_from_filfox(limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        # Get current epoch (approximate)
        now = int(time.time())
        current_epoch = (now - FILECOIN_GENESIS_TIMESTAMP) // EPOCH_DURATION_SECONDS
        deals = []
        for deal in result.get("deals", []):
            duration_epochs = deal['endEpoch'] - deal['startEpoch']
            duration_days = duration_epochs * 30 / (24 * 60 * 60)
            start_time = epoch_to_datetime(deal['startEpoch'])
            end_time = epoch_to_datetime(deal['endEpoch'])
            status = get_deal_status(deal['startEpoch'], deal['endEpoch'], current_epoch)
            deals.append({
                "id": deal['id'],
                "provider": deal['provider'],
                "client": deal['client'],
                "piece_size": deal['pieceSize'],
                "verified_deal": deal['verifiedDeal'],
                "storage_price": deal.get('stroagePrice'),
                "start_epoch": deal['startEpoch'],
                "end_epoch": deal['endEpoch'],
                "duration_days": duration_days,
                "start_time": start_time,
                "end_time": end_time,
                "status": status
            })
        return {
            "network": "mainnet",
            "timestamp": result["timestamp"],
            "total_deals": result["total_deals"],
            "deals": deals,
            "analytics": result["analytics"]
        }
    except Exception as e:
        logger.error(f"Error fetching mainnet deals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/mainnet/market")
async def get_mainnet_market_analysis(days: int = Query(7, ge=1, le=30)):
    """Get mainnet market analysis"""
    try:
        result = mainnet_aggregator.get_historical_metrics_from_parquet(days=days)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        insights = result["market_insights"]
        
        return {
            "network": "mainnet",
            "timestamp": result["timestamp"],
            "analysis_period_days": result["analysis_period_days"],
            "market_insights": MarketInsights(
                daily_new_deals=insights["current_market"]["daily_new_deals"],
                verified_deals_percentage=insights["current_market"]["verified_deals_percentage"],
                average_piece_size_gb=insights["current_market"]["data_onboarded_today_pibs"] * 1024,  # Convert PiB to GB
                average_storage_price=insights["pricing"]["current_storage_cost"],
                market_activity_level=insights["market_activity"]["market_activity_level"]
            ),
            "recommendations": result["recommendations"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching mainnet market analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/mainnet/analysis")
async def get_mainnet_comprehensive_analysis():
    """Get comprehensive mainnet analysis"""
    try:
        result = mainnet_aggregator.get_comprehensive_deal_analysis()
        
        # Extract insights
        insights = result.get("insights", {})
        market_health = insights.get("market_health", {})
        
        # Convert deals to response format
        deals = []
        if "filfox" in result["sources"] and "error" not in result["sources"]["filfox"]:
            for deal in result["sources"]["filfox"].get("deals", []):
                duration_epochs = deal['endEpoch'] - deal['startEpoch']
                duration_days = duration_epochs * 30 / (24 * 60 * 60)
                
                deals.append(DealInfo(
                    id=deal['id'],
                    provider=deal['provider'],
                    client=deal['client'],
                    piece_size=deal['pieceSize'],
                    verified_deal=deal['verifiedDeal'],
                    storage_price=deal.get('stroagePrice'),
                    start_epoch=deal['startEpoch'],
                    end_epoch=deal['endEpoch'],
                    duration_days=duration_days
                ))
        
        return AnalysisResponse(
            timestamp=result["timestamp"],
            network="mainnet",
            market_insights=MarketInsights(
                daily_new_deals=market_health.get("daily_deal_activity", 0),
                verified_deals_percentage=insights.get("trends", {}).get("recent_deals", {}).get("verified_deal_percentage", 0),
                average_piece_size_gb=insights.get("trends", {}).get("recent_deals", {}).get("average_piece_size", 0),
                average_storage_price=insights.get("trends", {}).get("recent_deals", {}).get("average_storage_price", 0),
                market_activity_level="High" if market_health.get("daily_deal_activity", 0) > 50000 else "Moderate"
            ),
            network_health=NetworkHealth(
                total_active_deals=market_health.get("total_active_deals", 0),
                data_stored_pibs=0,  # Would need to extract from Dune data
                network_utilization=market_health.get("network_utilization", 0),
                fil_plus_adoption=market_health.get("fil_plus_adoption", 0),
                active_providers=0,  # Would need to extract from Dune data
                active_clients=0  # Would need to extract from Dune data
            ) if market_health else None,
            recommendations=[Recommendation(**rec) for rec in insights.get("recommendations", [])],
            deals=deals
        )
        
    except Exception as e:
        logger.error(f"Error fetching mainnet comprehensive analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Testnet Endpoints

@app.get("/api/testnet/deals")
async def get_testnet_deals(limit: int = Query(50, ge=1, le=100)):
    """Get recent testnet deals"""
    try:
        result = testnet_aggregator.get_testnet_deals(limit=limit)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        now = int(time.time())
        current_epoch = (now - FILECOIN_GENESIS_TIMESTAMP) // EPOCH_DURATION_SECONDS
        deals = []
        for deal in result.get("deals", []):
            duration_epochs = deal['endEpoch'] - deal['startEpoch']
            duration_days = duration_epochs * 30 / (24 * 60 * 60)
            start_time = epoch_to_datetime(deal['startEpoch'])
            end_time = epoch_to_datetime(deal['endEpoch'])
            status = get_deal_status(deal['startEpoch'], deal['endEpoch'], current_epoch)
            deals.append({
                "id": deal['id'],
                "provider": deal['provider'],
                "client": deal['client'],
                "piece_size": deal['pieceSize'],
                "verified_deal": deal['verifiedDeal'],
                "storage_price": deal.get('stroagePrice'),
                "start_epoch": deal['startEpoch'],
                "end_epoch": deal['endEpoch'],
                "duration_days": duration_days,
                "start_time": start_time,
                "end_time": end_time,
                "status": status
            })
        return {
            "network": result["network"],
            "timestamp": result["timestamp"],
            "total_deals": result["total_deals"],
            "deals": deals,
            "analytics": result["analytics"]
        }
    except Exception as e:
        logger.error(f"Error fetching testnet deals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/testnet/network")
async def get_testnet_network_info():
    """Get testnet network information"""
    try:
        result = testnet_aggregator.get_testnet_chain_info()
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "network": result["network"],
            "status": result["status"],
            "endpoint": result.get("endpoint"),
            "chain_head": result.get("chain_head"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching testnet network info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/testnet/analysis")
async def get_testnet_comprehensive_analysis():
    """Get comprehensive testnet analysis"""
    try:
        result = testnet_aggregator.get_comprehensive_testnet_analysis()
        
        # Extract insights
        insights = result.get("insights", {})
        deal_activity = insights.get("deal_activity", {})
        
        # Convert deals to response format
        deals = []
        if "deals" in result["sources"] and "error" not in result["sources"]["deals"]:
            for deal in result["sources"]["deals"].get("deals", []):
                duration_epochs = deal['endEpoch'] - deal['startEpoch']
                duration_days = duration_epochs * 30 / (24 * 60 * 60)
                
                deals.append(DealInfo(
                    id=deal['id'],
                    provider=deal['provider'],
                    client=deal['client'],
                    piece_size=deal['pieceSize'],
                    verified_deal=deal['verifiedDeal'],
                    storage_price=deal.get('stroagePrice'),
                    start_epoch=deal['startEpoch'],
                    end_epoch=deal['endEpoch'],
                    duration_days=duration_days
                ))
        
        return AnalysisResponse(
            timestamp=result["timestamp"],
            network=result["network"],
            market_insights=MarketInsights(
                daily_new_deals=deal_activity.get("total_deals", 0),
                verified_deals_percentage=deal_activity.get("verified_deals_percentage", 0),
                average_piece_size_gb=deal_activity.get("average_piece_size_gb", 0),
                average_storage_price=deal_activity.get("average_storage_price", 0),
                market_activity_level="High" if deal_activity.get("total_deals", 0) > 20 else "Moderate"
            ),
            network_health=None,  # Testnet doesn't have comprehensive network health data
            recommendations=[Recommendation(**rec) for rec in insights.get("recommendations", [])],
            deals=deals
        )
        
    except Exception as e:
        logger.error(f"Error fetching testnet comprehensive analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User Advisor Endpoints

@app.get("/api/advisor/market-analysis")
async def get_user_market_analysis(days: int = Query(7, ge=1, le=30)):
    """Get user-focused market analysis and recommendations"""
    try:
        result = storage_advisor.get_market_analysis(days=days)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        insights = result["market_insights"]
        
        return {
            "timestamp": result["timestamp"],
            "analysis_period_days": result["analysis_period_days"],
            "market_insights": MarketInsights(
                daily_new_deals=insights["current_market"]["daily_new_deals"],
                verified_deals_percentage=insights["current_market"]["verified_deals_percentage"],
                average_piece_size_gb=insights["current_market"]["data_onboarded_today_pibs"] * 1024,
                average_storage_price=insights["pricing"]["current_storage_cost"],
                market_activity_level=insights["market_activity"]["market_activity_level"]
            ),
            "recommendations": result["recommendations"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching user market analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Unified Endpoints

@app.get("/api/unified/{network}/analysis")
async def get_unified_analysis(network: str):
    """Get unified analysis for specified network"""
    if network not in ["mainnet", "testnet"]:
        raise HTTPException(status_code=400, detail="Network must be 'mainnet' or 'testnet'")
    
    try:
        aggregator = UnifiedFilecoinAggregator(network)
        result = aggregator.get_comprehensive_analysis()
        
        return {
            "network": network,
            "timestamp": result["timestamp"],
            "sources": result["sources"],
            "insights": result["insights"]
        }
        
    except Exception as e:
        logger.error(f"Error fetching unified analysis for {network}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 