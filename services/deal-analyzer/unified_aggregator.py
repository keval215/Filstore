#!/usr/bin/env python3
"""
Unified Filecoin Deal Data Aggregator
Handles both mainnet and testnet data sources
"""

import requests
import json
import pandas as pd
import io
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UnifiedFilecoinAggregator:
    """
    Unified aggregator for both mainnet and testnet Filecoin data
    """
    
    def __init__(self, network: str = "mainnet"):
        """
        Initialize aggregator for specified network
        
        Args:
            network: "mainnet" or "testnet"
        """
        self.network = network
        
        # Mainnet data sources (reliable APIs)
        self.mainnet_sources = {
            "filfox": "https://filfox.info/api/v1",
            "parquet": "https://data.filecoindataportal.xyz/filecoin_daily_metrics.parquet",
            "dune_api_key": "yUFhkcCEsErWy5fZ8XQLt8tsKlSG4I0q",
            "dune_query_id": 3302707
        }
        
        # Testnet data sources
        self.testnet_sources = {
            "calibration_rpc": "https://api.zondax.ch/fil/node/calibration/rpc/v1",
            "testnet_rpc": "https://api.zondax.ch/fil/node/testnet/rpc/v1",
            "calibration_filfox": "https://calibration.filfox.info/api/v1",
            "testnet_filfox": "https://testnet.filfox.info/api/v1"
        }
    
    def get_network_info(self) -> Dict[str, Any]:
        """Get basic network information"""
        if self.network == "mainnet":
            return {
                "network": "mainnet",
                "description": "Filecoin Mainnet",
                "data_sources": ["Filfox API", "Data Portal Parquet", "Dune Analytics"],
                "status": "active"
            }
        else:
            # Test testnet connectivity
            try:
                headers = {"Content-Type": "application/json"}
                payload = {
                    "jsonrpc": "2.0",
                    "method": "Filecoin.StateNetworkName",
                    "params": [],
                    "id": 1
                }
                
                # Try calibration first
                try:
                    resp = requests.post(self.testnet_sources["calibration_rpc"], 
                                       data=json.dumps(payload), headers=headers, timeout=10)
                    resp.raise_for_status()
                    data = resp.json()
                    network_name = data.get("result", "calibration")
                    
                    return {
                        "network": network_name,
                        "description": f"Filecoin {network_name.title()}",
                        "data_sources": ["RPC API", "Filfox Explorer"],
                        "endpoint": self.testnet_sources["calibration_rpc"],
                        "status": "active"
                    }
                except:
                    # Try testnet as fallback
                    resp = requests.post(self.testnet_sources["testnet_rpc"], 
                                       data=json.dumps(payload), headers=headers, timeout=10)
                    resp.raise_for_status()
                    data = resp.json()
                    network_name = data.get("result", "testnet")
                    
                    return {
                        "network": network_name,
                        "description": f"Filecoin {network_name.title()}",
                        "data_sources": ["RPC API", "Filfox Explorer"],
                        "endpoint": self.testnet_sources["testnet_rpc"],
                        "status": "active"
                    }
                    
            except Exception as e:
                return {
                    "network": "testnet",
                    "description": "Filecoin Testnet",
                    "data_sources": ["RPC API", "Filfox Explorer"],
                    "status": "error",
                    "error": str(e)
                }
    
    def get_recent_deals(self, limit: int = 50) -> Dict[str, Any]:
        """Get recent deals from the specified network"""
        if self.network == "mainnet":
            return self._get_mainnet_deals(limit)
        else:
            return self._get_testnet_deals(limit)
    
    def _get_mainnet_deals(self, limit: int) -> Dict[str, Any]:
        """Get recent deals from mainnet using Filfox API"""
        try:
            url = f"{self.mainnet_sources['filfox']}/deal/list"
            params = {"limit": limit}
            
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            deals = data.get("deals", [])
            analytics = self._analyze_deals(deals)
            
            return {
                "source": "mainnet_filfox",
                "network": "mainnet",
                "timestamp": datetime.now().isoformat(),
                "total_deals": len(deals),
                "total_count": data.get("totalCount", 0),
                "deals": deals[:10],
                "analytics": analytics
            }
            
        except Exception as e:
            logger.error(f"Error fetching mainnet deals: {e}")
            return {"error": str(e)}
    
    def _get_testnet_deals(self, limit: int) -> Dict[str, Any]:
        """Get recent deals from testnet"""
        try:
            # Try calibration Filfox first
            try:
                url = f"{self.testnet_sources['calibration_filfox']}/deal/list"
                params = {"limit": limit}
                
                response = requests.get(url, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                deals = data.get("deals", [])
                analytics = self._analyze_deals(deals)
                
                return {
                    "source": "calibration_filfox",
                    "network": "calibration",
                    "timestamp": datetime.now().isoformat(),
                    "total_deals": len(deals),
                    "total_count": data.get("totalCount", 0),
                    "deals": deals[:10],
                    "analytics": analytics
                }
                
            except Exception as e:
                logger.warning(f"Calibration Filfox failed: {e}")
                
                # Try testnet Filfox as fallback
                url = f"{self.testnet_sources['testnet_filfox']}/deal/list"
                params = {"limit": limit}
                
                response = requests.get(url, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                deals = data.get("deals", [])
                analytics = self._analyze_deals(deals)
                
                return {
                    "source": "testnet_filfox",
                    "network": "testnet",
                    "timestamp": datetime.now().isoformat(),
                    "total_deals": len(deals),
                    "total_count": data.get("totalCount", 0),
                    "deals": deals[:10],
                    "analytics": analytics
                }
                
        except Exception as e:
            logger.error(f"Error fetching testnet deals: {e}")
            return {"error": str(e)}
    
    def _analyze_deals(self, deals: List[Dict]) -> Dict[str, Any]:
        """Analyze deals data for insights"""
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
    
    def get_historical_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Get historical metrics (mainnet only)"""
        if self.network != "mainnet":
            return {"error": "Historical metrics only available for mainnet"}
        
        try:
            response = requests.get(self.mainnet_sources["parquet"], timeout=30)
            response.raise_for_status()
            
            df = pd.read_parquet(io.BytesIO(response.content))
            df["date"] = pd.to_datetime(df["date"])
            
            # Filter for recent days
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_df = df[df["date"] >= cutoff_date].copy()
            
            if recent_df.empty:
                return {"error": "No recent data available"}
            
            # Get latest data
            latest = recent_df.iloc[-1]
            
            return {
                "source": "mainnet_parquet",
                "network": "mainnet",
                "timestamp": datetime.now().isoformat(),
                "analysis_period_days": days,
                "metrics": {
                    "daily_new_deals": int(latest['deals']),
                    "verified_deals_percentage": float((latest['verified_deals'] / latest['deals']) * 100) if latest['deals'] > 0 else 0,
                    "data_stored_pibs": float(latest['data_on_active_deals_pibs']) if 'data_on_active_deals_pibs' in latest else 0,
                    "unique_data_ratio": float(latest['unique_data_onboarded_ratio']) if 'unique_data_onboarded_ratio' in latest else 0
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to fetch historical data: {e}"}
    
    def get_network_metrics(self) -> Dict[str, Any]:
        """Get network metrics"""
        if self.network == "mainnet":
            return self._get_mainnet_network_metrics()
        else:
            return self._get_testnet_network_metrics()
    
    def _get_mainnet_network_metrics(self) -> Dict[str, Any]:
        """Get mainnet network metrics from Dune Analytics"""
        try:
            headers = {
                "x-dune-api-key": self.mainnet_sources["dune_api_key"],
                "Content-Type": "application/json"
            }
            
            # Start execution
            start_url = f"https://api.dune.com/api/v1/query/{self.mainnet_sources['dune_query_id']}/execute"
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
            
            # Get latest data
            latest_data = rows[0]
            
            return {
                "source": "mainnet_dune",
                "network": "mainnet",
                "timestamp": datetime.now().isoformat(),
                "data_date": latest_data.get("date", ""),
                "metrics": {
                    "active_deals": latest_data.get("active_deals", 0),
                    "daily_new_deals": latest_data.get("deals", 0),
                    "data_stored_pibs": latest_data.get("data_on_active_deals_pibs", 0),
                    "active_providers": latest_data.get("providers_with_active_deals", 0),
                    "active_clients": latest_data.get("clients_with_active_deals", 0),
                    "fil_plus_share": latest_data.get("fil_plus_bytes_share", 0),
                    "network_utilization": latest_data.get("network_utilization_ratio", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Error fetching mainnet network metrics: {e}")
            return {"error": str(e)}
    
    def _get_testnet_network_metrics(self) -> Dict[str, Any]:
        """Get testnet network metrics from RPC"""
        try:
            headers = {"Content-Type": "application/json"}
            
            # Get chain head
            head_payload = {
                "jsonrpc": "2.0",
                "method": "Filecoin.ChainHead",
                "params": [],
                "id": 1
            }
            
            # Try calibration first
            try:
                resp = requests.post(self.testnet_sources["calibration_rpc"], 
                                   data=json.dumps(head_payload), headers=headers, timeout=10)
                resp.raise_for_status()
                head_data = resp.json()
                chain_head = head_data.get("result", {})
                
                return {
                    "source": "calibration_rpc",
                    "network": "calibration",
                    "timestamp": datetime.now().isoformat(),
                    "metrics": {
                        "chain_height": chain_head.get("Height", 0),
                        "chain_timestamp": chain_head.get("Timestamp", 0),
                        "tipset_key": [cid.get("/", "") for cid in chain_head.get("Cids", [])]
                    }
                }
                
            except Exception as e:
                logger.warning(f"Calibration RPC failed: {e}")
                
                # Try testnet as fallback
                resp = requests.post(self.testnet_sources["testnet_rpc"], 
                                   data=json.dumps(head_payload), headers=headers, timeout=10)
                resp.raise_for_status()
                head_data = resp.json()
                chain_head = head_data.get("result", {})
                
                return {
                    "source": "testnet_rpc",
                    "network": "testnet",
                    "timestamp": datetime.now().isoformat(),
                    "metrics": {
                        "chain_height": chain_head.get("Height", 0),
                        "chain_timestamp": chain_head.get("Timestamp", 0),
                        "tipset_key": [cid.get("/", "") for cid in chain_head.get("Cids", [])]
                    }
                }
                
        except Exception as e:
            logger.error(f"Error fetching testnet network metrics: {e}")
            return {"error": str(e)}
    
    def get_comprehensive_analysis(self) -> Dict[str, Any]:
        """Get comprehensive analysis for the specified network"""
        logger.info(f"Starting comprehensive {self.network} analysis...")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "network": self.network,
            "sources": {}
        }
        
        # Get network info
        results["sources"]["network_info"] = self.get_network_info()
        
        # Get recent deals
        try:
            results["sources"]["deals"] = self.get_recent_deals()
        except Exception as e:
            logger.error(f"Deals error: {e}")
            results["sources"]["deals"] = {"error": str(e)}
        
        # Get network metrics
        try:
            results["sources"]["network_metrics"] = self.get_network_metrics()
        except Exception as e:
            logger.error(f"Network metrics error: {e}")
            results["sources"]["network_metrics"] = {"error": str(e)}
        
        # Get historical metrics (mainnet only)
        if self.network == "mainnet":
            try:
                results["sources"]["historical"] = self.get_historical_metrics()
            except Exception as e:
                logger.error(f"Historical error: {e}")
                results["sources"]["historical"] = {"error": str(e)}
        
        # Generate insights
        results["insights"] = self._generate_insights(results["sources"])
        
        return results
    
    def _generate_insights(self, sources: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from data sources"""
        insights = {
            "network_health": {},
            "deal_activity": {},
            "recommendations": []
        }
        
        # Network health insights
        if "network_info" in sources and "error" not in sources["network_info"]:
            network_info = sources["network_info"]
            insights["network_health"] = {
                "network": network_info.get("network", "unknown"),
                "status": network_info.get("status", "unknown"),
                "data_sources": network_info.get("data_sources", [])
            }
        
        # Deal activity insights
        if "deals" in sources and "error" not in sources["deals"]:
            deals_data = sources["deals"]
            analytics = deals_data.get("analytics", {})
            
            insights["deal_activity"] = {
                "total_deals": deals_data.get("total_deals", 0),
                "verified_deals_percentage": analytics.get("verified_deals_percentage", 0),
                "average_piece_size_gb": analytics.get("average_piece_size_gb", 0),
                "average_storage_price": analytics.get("average_storage_price", 0)
            }
            
            # Generate recommendations
            if analytics.get("verified_deals_percentage", 0) > 50:
                insights["recommendations"].append({
                    "category": "Deal Type",
                    "priority": "Medium",
                    "message": f"High FIL+ adoption ({analytics.get('verified_deals_percentage', 0):.1f}%). Consider verified deals.",
                    "action": "Test with verified deals for better provider incentives"
                })
        
        return insights

# Example usage
if __name__ == "__main__":
    print("=== Unified Filecoin Deal Data Aggregator ===\n")
    
    # Test mainnet
    print("🌐 Testing Mainnet Analysis:")
    mainnet_agg = UnifiedFilecoinAggregator("mainnet")
    
    network_info = mainnet_agg.get_network_info()
    print(f"   Network: {network_info['network']}")
    print(f"   Status: {network_info['status']}")
    
    deals_data = mainnet_agg.get_recent_deals(limit=20)
    if "error" not in deals_data:
        print(f"   ✓ Retrieved {deals_data['total_deals']} recent deals")
        analytics = deals_data.get("analytics", {})
        print(f"   ✓ Verified deals: {analytics.get('verified_deals_percentage', 0):.1f}%")
    
    print("\n🧪 Testing Testnet Analysis:")
    testnet_agg = UnifiedFilecoinAggregator("testnet")
    
    network_info = testnet_agg.get_network_info()
    print(f"   Network: {network_info['network']}")
    print(f"   Status: {network_info['status']}")
    
    deals_data = testnet_agg.get_recent_deals(limit=20)
    if "error" not in deals_data:
        print(f"   ✓ Retrieved {deals_data['total_deals']} recent deals")
        analytics = deals_data.get("analytics", {})
        print(f"   ✓ Verified deals: {analytics.get('verified_deals_percentage', 0):.1f}%")
    
    print("\n📊 Generating Comprehensive Analysis...")
    mainnet_analysis = mainnet_agg.get_comprehensive_analysis()
    testnet_analysis = testnet_agg.get_comprehensive_analysis()
    
    print(f"   ✓ Mainnet analysis complete!")
    print(f"   ✓ Testnet analysis complete!")
    print(f"   ✓ Generated insights for both networks") 