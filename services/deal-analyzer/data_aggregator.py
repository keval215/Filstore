import requests
import json
import pandas as pd
import io
import time
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FilecoinDealDataAggregator:
    """
    Comprehensive Filecoin deal data aggregator that combines multiple data sources:
    - Filfox API for recent deals
    - Filecoin Data Portal Parquet for historical metrics
    - Dune Analytics for comprehensive network data
    
    Note: Mainnet RPC functionality removed due to reliability issues
    """
    
    def __init__(self):
        self.filfox_base_url = "https://filfox.info/api/v1"
        self.parquet_url = "https://data.filecoindataportal.xyz/filecoin_daily_metrics.parquet"
        self.dune_api_key = "yUFhkcCEsErWy5fZ8XQLt8tsKlSG4I0q"
        self.dune_query_id = 3302707
        
    def get_recent_deals_from_filfox(self, limit: int = 100) -> Dict[str, Any]:
        """
        Fetch recent deals from Filfox API with enhanced analytics
        """
        try:
            url = f"{self.filfox_base_url}/deal/list"
            params = {"limit": limit}
            
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            deals = data.get("deals", [])

            # Deduplicate deals by id
            seen = set()
            unique_deals = []
            for d in deals:
                deal_id = d.get('id')
                if deal_id not in seen:
                    seen.add(deal_id)
                    unique_deals.append(d)
                if len(unique_deals) >= limit:
                    break

            # Enhanced analytics
            analytics = self._analyze_filfox_deals(unique_deals)
            
            return {
                "source": "filfox",
                "timestamp": datetime.now().isoformat(),
                "total_deals": len(unique_deals),
                "total_count": data.get("totalCount", 0),
                "deals": unique_deals,
                "analytics": analytics
            }
            
        except Exception as e:
            logger.error(f"Error fetching from Filfox: {e}")
            return {"error": str(e)}
    
    def _analyze_filfox_deals(self, deals: List[Dict]) -> Dict[str, Any]:
        """Analyze Filfox deals data for insights"""
        if not deals:
            return {}
            
        # Basic statistics
        verified_deals = [d for d in deals if d.get('verifiedDeal', False)]
        total_size_gb = sum(d.get('pieceSize', 0) for d in deals) / (1024**3)
        
        # Price analysis
        prices = [float(d.get('stroagePrice', 0)) for d in deals if d.get('stroagePrice') and d.get('stroagePrice') != '0']
        avg_price = sum(prices) / len(prices) if prices else 0
        
        # Duration analysis
        durations = []
        for deal in deals:
            if deal.get('startEpoch') and deal.get('endEpoch'):
                duration_epochs = deal['endEpoch'] - deal['startEpoch']
                duration_days = duration_epochs * 30 / (24 * 60 * 60)  # Approximate
                durations.append(duration_days)
        
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        return {
            "verified_deals_count": len(verified_deals),
            "verified_deals_percentage": (len(verified_deals) / len(deals)) * 100,
            "total_size_gb": total_size_gb,
            "average_piece_size_gb": total_size_gb / len(deals),
            "average_storage_price": avg_price,
            "average_deal_duration_days": avg_duration,
            "price_range": {
                "min": min(prices) if prices else 0,
                "max": max(prices) if prices else 0
            },
            "duration_range": {
                "min": min(durations) if durations else 0,
                "max": max(durations) if durations else 0
            }
        }
    
    def get_historical_metrics_from_parquet(self, days: int = 30) -> Dict[str, Any]:
        """
        Fetch historical deal metrics from Filecoin Data Portal Parquet
        """
        try:
            response = requests.get(self.parquet_url, timeout=30)
            response.raise_for_status()
            
            df = pd.read_parquet(io.BytesIO(response.content))
            df["date"] = pd.to_datetime(df["date"])
            
            # Filter for recent days
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_df = df[df["date"] >= cutoff_date].copy()
            
            if recent_df.empty:
                return {"error": "No recent data available"}
            
            # Calculate key metrics for users
            analysis = self._analyze_for_users(recent_df)
            
            return {
                "source": "filecoin_data_portal",
                "timestamp": datetime.now().isoformat(),
                "analysis_period_days": days,
                "market_insights": analysis,
                "recommendations": self._generate_recommendations(analysis)
            }
            
        except Exception as e:
            return {"error": f"Failed to fetch market data: {e}"}
    
    def _analyze_for_users(self, df: pd.DataFrame):
        """Analyze data from a user's perspective"""
        
        # Get latest data
        latest = df.iloc[-1]
        
        # Calculate averages over the period
        avg_deals = df['deals'].mean()
        avg_storage_cost = df['deal_storage_cost_fil'].mean() if 'deal_storage_cost_fil' in df.columns else 0
        avg_verified_ratio = (df['verified_deals'] / df['deals']).mean() * 100
        
        # Price trends
        if len(df) >= 7:
            recent_avg_cost = df['deal_storage_cost_fil'].tail(7).mean() if 'deal_storage_cost_fil' in df.columns else 0
            previous_avg_cost = df['deal_storage_cost_fil'].head(7).mean() if 'deal_storage_cost_fil' in df.columns else 0
            price_trend = "increasing" if recent_avg_cost > previous_avg_cost else "decreasing"
            price_change = ((recent_avg_cost - previous_avg_cost) / previous_avg_cost * 100) if previous_avg_cost > 0 else 0
        else:
            price_trend = "stable"
            price_change = 0
        
        return {
            "current_market": {
                "daily_new_deals": int(latest['deals']),
                "verified_deals_percentage": float((latest['verified_deals'] / latest['deals']) * 100) if latest['deals'] > 0 else 0,
                "regular_deals_percentage": float((latest['regular_deals'] / latest['deals']) * 100) if latest['deals'] > 0 else 0,
                "unique_content_daily": int(latest['unique_piece_cids']),
                "data_onboarded_today_pibs": float(latest['onboarded_data_pibs']) if 'onboarded_data_pibs' in latest else 0
            },
            "pricing": {
                "current_storage_cost": float(latest['deal_storage_cost_fil']) if 'deal_storage_cost_fil' in latest else 0,
                "average_cost_period": float(avg_storage_cost),
                "price_trend": price_trend,
                "price_change_percent": float(price_change)
            },
            "market_activity": {
                "average_daily_deals": float(avg_deals),
                "average_verified_ratio": float(avg_verified_ratio),
                "market_activity_level": self._get_activity_level(avg_deals),
                "total_deals_period": int(df['deals'].sum())
            },
            "data_efficiency": {
                "unique_data_ratio": float(latest['unique_data_onboarded_ratio']) if 'unique_data_onboarded_ratio' in latest else 0,
                "data_deduplication_efficiency": self._get_efficiency_level(latest.get('unique_data_onboarded_ratio', 0))
            }
        }
    
    def _get_activity_level(self, avg_deals: float) -> str:
        """Determine market activity level"""
        if avg_deals > 100000:
            return "Very High"
        elif avg_deals > 50000:
            return "High"
        elif avg_deals > 10000:
            return "Moderate"
        else:
            return "Low"
    
    def _get_efficiency_level(self, ratio: float) -> str:
        """Determine data efficiency level"""
        if ratio > 0.8:
            return "Excellent"
        elif ratio > 0.6:
            return "Good"
        elif ratio > 0.4:
            return "Fair"
        else:
            return "Poor"
    
    def _generate_recommendations(self, analysis: dict) -> list:
        """Generate personalized recommendations for users"""
        recommendations = []
        
        market = analysis.get("current_market", {})
        pricing = analysis.get("pricing", {})
        activity = analysis.get("market_activity", {})
        
        # Pricing recommendations
        if pricing.get("price_trend") == "increasing":
            recommendations.append({
                "category": "Pricing",
                "priority": "High",
                "message": "Storage costs are trending upward. Consider making deals soon to lock in current rates.",
                "action": "Act quickly to secure current pricing"
            })
        elif pricing.get("price_trend") == "decreasing":
            recommendations.append({
                "category": "Pricing",
                "priority": "Medium",
                "message": "Storage costs are decreasing. You might get better rates by waiting.",
                "action": "Monitor prices for optimal timing"
            })
        
        # Deal type recommendations
        verified_ratio = market.get("verified_deals_percentage", 0)
        if verified_ratio > 60:
            recommendations.append({
                "category": "Deal Type",
                "priority": "High",
                "message": f"High FIL+ adoption ({verified_ratio:.1f}%). Verified deals offer better provider incentives.",
                "action": "Consider verified deals for better reliability"
            })
        
        # Market activity recommendations
        activity_level = activity.get("market_activity_level", "")
        if activity_level in ["High", "Very High"]:
            recommendations.append({
                "category": "Market Timing",
                "priority": "Medium",
                "message": f"High market activity ({activity_level}). Many providers are actively making deals.",
                "action": "Good time to shop around for providers"
            })
        
        # Data efficiency recommendations
        efficiency = analysis.get("data_efficiency", {})
        unique_ratio = efficiency.get("unique_data_ratio", 0)
        if unique_ratio < 0.5:
            recommendations.append({
                "category": "Data Optimization",
                "priority": "Medium",
                "message": f"Low data uniqueness ratio ({unique_ratio:.1%}). Consider deduplication to reduce costs.",
                "action": "Implement data deduplication strategies"
            })
        
        return recommendations
    
    def get_network_metrics_from_dune(self) -> Dict[str, Any]:
        """
        Fetch comprehensive network metrics from Dune Analytics
        """
        try:
            headers = {
                "x-dune-api-key": self.dune_api_key,
                "Content-Type": "application/json"
            }
            
            # Start execution
            start_url = f"https://api.dune.com/api/v1/query/{self.dune_query_id}/execute"
            resp = requests.post(start_url, headers=headers, timeout=30)
            resp.raise_for_status()
            execution_id = resp.json()["execution_id"]
            
            # Poll for completion
            max_attempts = 30
            for attempt in range(max_attempts):
                status_url = f"https://api.dune.com/api/v1/execution/{execution_id}/status"
                status = requests.get(status_url, headers=headers).json()
                
                if status["state"] == "QUERY_STATE_COMPLETED":
                    break
                elif status["state"].startswith("QUERY_STATE_FAILED"):
                    raise Exception("Dune query failed")
                
                time.sleep(2)
            
            # Fetch results
            results_url = f"https://api.dune.com/api/v1/execution/{execution_id}/results"
            results = requests.get(results_url, headers=headers).json()
            rows = results["result"]["rows"]
            
            if not rows:
                return {"error": "No data returned from Dune"}
            
            # Get latest data (most recent date)
            latest_data = rows[0]  # Assuming sorted by date descending
            
            # Extract key metrics
            key_metrics = {
                "active_deals": latest_data.get("active_deals", 0),
                "daily_new_deals": latest_data.get("deals", 0),
                "daily_ending_deals": latest_data.get("deal_ends", 0),
                "verified_deals": latest_data.get("verified_deals", 0),
                "data_stored_pibs": latest_data.get("data_on_active_deals_pibs", 0),
                "unique_data_stored_pibs": latest_data.get("unique_data_on_active_deals_pibs", 0),
                "active_providers": latest_data.get("providers_with_active_deals", 0),
                "active_clients": latest_data.get("clients_with_active_deals", 0),
                "average_deal_duration_days": latest_data.get("mean_deal_duration_days", 0),
                "storage_cost_fil": latest_data.get("deal_storage_cost_fil", 0),
                "fil_plus_share": latest_data.get("fil_plus_bytes_share", 0),
                "network_utilization": latest_data.get("network_utilization_ratio", 0),
                "replication_factor": latest_data.get("average_piece_replication_factor", 0)
            }
            
            return {
                "source": "dune_analytics",
                "timestamp": datetime.now().isoformat(),
                "data_date": latest_data.get("date", ""),
                "metrics": key_metrics,
                "raw_data": rows[:5]  # Include first 5 rows for reference
            }
            
        except Exception as e:
            logger.error(f"Error fetching from Dune: {e}")
            return {"error": str(e)}
    
    def get_comprehensive_deal_analysis(self) -> Dict[str, Any]:
        """
        Get comprehensive deal analysis combining all data sources
        """
        logger.info("Starting comprehensive deal analysis...")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "sources": {}
        }
        
        # Fetch from all sources
        try:
            results["sources"]["filfox"] = self.get_recent_deals_from_filfox()
        except Exception as e:
            logger.error(f"Filfox error: {e}")
            results["sources"]["filfox"] = {"error": str(e)}
        
        try:
            results["sources"]["historical"] = self.get_historical_metrics_from_parquet()
        except Exception as e:
            logger.error(f"Historical error: {e}")
            results["sources"]["historical"] = {"error": str(e)}
        
        try:
            results["sources"]["network"] = self.get_network_metrics_from_dune()
        except Exception as e:
            logger.error(f"Dune error: {e}")
            results["sources"]["network"] = {"error": str(e)}
        
        # Generate insights
        results["insights"] = self._generate_insights(results["sources"])
        
        return results
    
    def _generate_insights(self, sources: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from combined data sources"""
        insights = {
            "market_health": {},
            "trends": {},
            "recommendations": []
        }
        
        # Network health insights
        if "network" in sources and "error" not in sources["network"]:
            network_data = sources["network"].get("metrics", {})
            
            # Market health indicators
            insights["market_health"] = {
                "total_active_deals": network_data.get("active_deals", 0),
                "daily_deal_activity": network_data.get("daily_new_deals", 0),
                "network_utilization": network_data.get("network_utilization", 0),
                "fil_plus_adoption": network_data.get("fil_plus_share", 0),
                "average_deal_duration": network_data.get("average_deal_duration_days", 0)
            }
            
            # Generate recommendations
            if network_data.get("network_utilization", 0) < 0.5:
                insights["recommendations"].append("Network utilization is below 50% - consider incentives for more data onboarding")
            
            if network_data.get("fil_plus_share", 0) < 0.6:
                insights["recommendations"].append("FIL+ adoption could be improved - consider promoting verified deals")
        
        # Recent deal insights
        if "filfox" in sources and "error" not in sources["filfox"]:
            filfox_data = sources["filfox"].get("analytics", {})
            
            insights["trends"]["recent_deals"] = {
                "verified_deal_percentage": filfox_data.get("verified_deals_percentage", 0),
                "average_piece_size": filfox_data.get("average_piece_size_gb", 0),
                "average_storage_price": filfox_data.get("average_storage_price", 0)
            }
        
        return insights

# Example usage
if __name__ == "__main__":
    aggregator = FilecoinDealDataAggregator()
    
    print("=== Filecoin Deal Data Aggregator (Mainnet) ===")
    print("Note: Mainnet RPC functionality removed due to reliability issues")
    print("Using reliable data sources: Filfox API, Data Portal Parquet, Dune Analytics\n")
    
    # Test individual sources
    print("1. Testing Filfox API...")
    filfox_data = aggregator.get_recent_deals_from_filfox(limit=50)
    if "error" not in filfox_data:
        print(f"   ✓ Retrieved {filfox_data['total_deals']} recent deals")
        print(f"   ✓ Verified deals: {filfox_data['analytics']['verified_deals_percentage']:.1f}%")
    else:
        print(f"   ✗ Error: {filfox_data['error']}")
    
    print("\n2. Testing Historical Metrics...")
    historical_data = aggregator.get_historical_metrics_from_parquet(days=7)
    if "error" not in historical_data:
        print(f"   ✓ Retrieved {len(historical_data['market_insights'])} days of data")
        print(f"   ✓ Total deals in period: {historical_data['market_insights']['market_activity']['total_deals_period']}")
    else:
        print(f"   ✗ Error: {historical_data['error']}")
    
    print("\n3. Testing Network Metrics...")
    network_data = aggregator.get_network_metrics_from_dune()
    if "error" not in network_data:
        print(f"   ✓ Retrieved network metrics for {network_data['data_date']}")
        print(f"   ✓ Active deals: {network_data['metrics']['active_deals']:,}")
        print(f"   ✓ Data stored: {network_data['metrics']['data_stored_pibs']:.1f} PiB")
    else:
        print(f"   ✗ Error: {network_data['error']}")
    
    print("\n4. Generating Comprehensive Analysis...")
    comprehensive = aggregator.get_comprehensive_deal_analysis()
    print("   ✓ Analysis complete!")
    print(f"   ✓ Generated {len(comprehensive['insights']['recommendations'])} recommendations") 