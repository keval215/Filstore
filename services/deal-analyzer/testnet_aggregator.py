#!/usr/bin/env python3
"""
Testnet/Calibration Filecoin Deal Data Aggregator
Comprehensive data aggregation for testnet and calibration networks
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

class TestnetDealDataAggregator:
    """
    Comprehensive testnet/calibration deal data aggregator
    Focuses on testnet-specific data sources and metrics
    """
    
    def __init__(self):
        # Testnet/Calibration RPC endpoints
        self.calibration_rpc = "https://api.zondax.ch/fil/node/calibration/rpc/v1"
        self.testnet_rpc = "https://api.zondax.ch/fil/node/testnet/rpc/v1"
        
        # Testnet-specific data sources
        self.testnet_filfox_url = "https://calibration.filfox.info/api/v1"
        self.testnet_explorer_url = "https://calibration.filfox.info"
        
        # Testnet metrics (if available)
        self.testnet_metrics_url = None  # Add if testnet metrics become available
        
    def get_testnet_chain_info(self) -> Dict[str, Any]:
        """
        Get basic chain information from testnet/calibration
        """
        try:
            headers = {"Content-Type": "application/json"}
            
            # Test calibration network
            payload = {
                "jsonrpc": "2.0",
                "method": "Filecoin.StateNetworkName",
                "params": [],
                "id": 1
            }
            
            # Try calibration first
            try:
                resp = requests.post(self.calibration_rpc, data=json.dumps(payload), headers=headers, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                network_name = data.get("result", "unknown")
                
                # Get chain head
                head_payload = {
                    "jsonrpc": "2.0",
                    "method": "Filecoin.ChainHead",
                    "params": [],
                    "id": 1
                }
                
                head_resp = requests.post(self.calibration_rpc, data=json.dumps(head_payload), headers=headers, timeout=10)
                head_resp.raise_for_status()
                head_data = head_resp.json()
                chain_head = head_data.get("result", {})
                
                return {
                    "network": network_name,
                    "endpoint": self.calibration_rpc,
                    "chain_head": {
                        "height": chain_head.get("Height", 0),
                        "timestamp": chain_head.get("Timestamp", 0),
                        "tipset_key": [cid.get("/", "") for cid in chain_head.get("Cids", [])]
                    },
                    "status": "active"
                }
                
            except Exception as e:
                logger.warning(f"Calibration RPC failed: {e}")
                
                # Try testnet as fallback
                try:
                    resp = requests.post(self.testnet_rpc, data=json.dumps(payload), headers=headers, timeout=10)
                    resp.raise_for_status()
                    data = resp.json()
                    network_name = data.get("result", "unknown")
                    
                    return {
                        "network": network_name,
                        "endpoint": self.testnet_rpc,
                        "status": "active"
                    }
                    
                except Exception as e2:
                    logger.error(f"Testnet RPC also failed: {e2}")
                    return {"error": "Both testnet endpoints failed"}
                    
        except Exception as e:
            logger.error(f"Error getting testnet chain info: {e}")
            return {"error": str(e)}
    
    def get_testnet_deals(self, limit: int = 50) -> Dict[str, Any]:
        """
        Get recent deals from testnet/calibration network
        """
        try:
            # Try to get deals from testnet Filfox API
            url = f"{self.testnet_filfox_url}/deal/list"
            params = {"limit": limit}
            
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            deals = data.get("deals", [])
            
            # Analyze testnet deals
            analytics = self._analyze_testnet_deals(deals)
            
            return {
                "source": "testnet_filfox",
                "network": "calibration",
                "timestamp": datetime.now().isoformat(),
                "total_deals": len(deals),
                "total_count": data.get("totalCount", 0),
                "deals": deals[:10],  # Return first 10 for detailed view
                "analytics": analytics
            }
            
        except Exception as e:
            logger.error(f"Error fetching testnet deals: {e}")
            return {"error": str(e)}
    
    def _analyze_testnet_deals(self, deals: List[Dict]) -> Dict[str, Any]:
        """Analyze testnet deals data for insights"""
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
    
    def get_testnet_network_metrics(self) -> Dict[str, Any]:
        """
        Get network metrics from testnet/calibration
        """
        try:
            headers = {"Content-Type": "application/json"}
            
            # Get various network metrics
            metrics = {}
            
            # 1. Get miner power
            power_payload = {
                "jsonrpc": "2.0",
                "method": "Filecoin.StateMinerPower",
                "params": ["t01000", None],  # Example miner ID
                "id": 1
            }
            
            try:
                resp = requests.post(self.calibration_rpc, data=json.dumps(power_payload), headers=headers, timeout=10)
                resp.raise_for_status()
                power_data = resp.json()
                metrics["miner_power"] = power_data.get("result", {})
            except Exception as e:
                logger.warning(f"Could not get miner power: {e}")
            
            # 2. Get network stats
            stats_payload = {
                "jsonrpc": "2.0",
                "method": "Filecoin.StateNetworkVersion",
                "params": [None],
                "id": 1
            }
            
            try:
                resp = requests.post(self.calibration_rpc, data=json.dumps(stats_payload), headers=headers, timeout=10)
                resp.raise_for_status()
                stats_data = resp.json()
                metrics["network_version"] = stats_data.get("result", 0)
            except Exception as e:
                logger.warning(f"Could not get network version: {e}")
            
            # 3. Get circulating supply
            supply_payload = {
                "jsonrpc": "2.0",
                "method": "Filecoin.StateCirculatingSupply",
                "params": [None],
                "id": 1
            }
            
            try:
                resp = requests.post(self.calibration_rpc, data=json.dumps(supply_payload), headers=headers, timeout=10)
                resp.raise_for_status()
                supply_data = resp.json()
                metrics["circulating_supply"] = supply_data.get("result", "0")
            except Exception as e:
                logger.warning(f"Could not get circulating supply: {e}")
            
            return {
                "source": "testnet_rpc",
                "timestamp": datetime.now().isoformat(),
                "metrics": metrics
            }
            
        except Exception as e:
            logger.error(f"Error getting testnet network metrics: {e}")
            return {"error": str(e)}
    
    def get_testnet_provider_info(self, provider_id: str = None) -> Dict[str, Any]:
        """
        Get information about testnet storage providers
        """
        try:
            headers = {"Content-Type": "application/json"}
            
            # If no provider specified, get a list of active providers
            if not provider_id:
                # Try to get recent deals to find active providers
                deals_data = self.get_testnet_deals(limit=100)
                if "error" in deals_data:
                    return {"error": "Could not fetch deals to find providers"}
                
                deals = deals_data.get("deals", [])
                providers = list(set([deal.get("provider", "") for deal in deals if deal.get("provider")]))
                
                return {
                    "source": "testnet_analysis",
                    "timestamp": datetime.now().isoformat(),
                    "active_providers": providers[:10],  # Top 10 providers
                    "total_providers_found": len(providers)
                }
            
            # Get specific provider info
            provider_payload = {
                "jsonrpc": "2.0",
                "method": "Filecoin.StateMinerInfo",
                "params": [provider_id, None],
                "id": 1
            }
            
            resp = requests.post(self.calibration_rpc, data=json.dumps(provider_payload), headers=headers, timeout=10)
            resp.raise_for_status()
            provider_data = resp.json()
            
            return {
                "source": "testnet_rpc",
                "timestamp": datetime.now().isoformat(),
                "provider_id": provider_id,
                "provider_info": provider_data.get("result", {})
            }
            
        except Exception as e:
            logger.error(f"Error getting testnet provider info: {e}")
            return {"error": str(e)}
    
    def get_comprehensive_testnet_analysis(self) -> Dict[str, Any]:
        """
        Get comprehensive testnet analysis combining all data sources
        """
        logger.info("Starting comprehensive testnet analysis...")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "network": "testnet/calibration",
            "sources": {}
        }
        
        # Get chain information
        try:
            results["sources"]["chain_info"] = self.get_testnet_chain_info()
        except Exception as e:
            logger.error(f"Chain info error: {e}")
            results["sources"]["chain_info"] = {"error": str(e)}
        
        # Get recent deals
        try:
            results["sources"]["deals"] = self.get_testnet_deals()
        except Exception as e:
            logger.error(f"Deals error: {e}")
            results["sources"]["deals"] = {"error": str(e)}
        
        # Get network metrics
        try:
            results["sources"]["network_metrics"] = self.get_testnet_network_metrics()
        except Exception as e:
            logger.error(f"Network metrics error: {e}")
            results["sources"]["network_metrics"] = {"error": str(e)}
        
        # Get provider information
        try:
            results["sources"]["providers"] = self.get_testnet_provider_info()
        except Exception as e:
            logger.error(f"Provider info error: {e}")
            results["sources"]["providers"] = {"error": str(e)}
        
        # Generate insights
        results["insights"] = self._generate_testnet_insights(results["sources"])
        
        return results
    
    def _generate_testnet_insights(self, sources: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from testnet data sources"""
        insights = {
            "network_health": {},
            "deal_activity": {},
            "recommendations": []
        }
        
        # Network health insights
        if "chain_info" in sources and "error" not in sources["chain_info"]:
            chain_data = sources["chain_info"]
            insights["network_health"] = {
                "network_name": chain_data.get("network", "unknown"),
                "status": chain_data.get("status", "unknown"),
                "endpoint": chain_data.get("endpoint", "unknown")
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
                    "message": "High FIL+ adoption in testnet. Consider verified deals for testing.",
                    "action": "Test with verified deals to understand FIL+ mechanics"
                })
        
        # Provider insights
        if "providers" in sources and "error" not in sources["providers"]:
            provider_data = sources["providers"]
            active_providers = provider_data.get("active_providers", [])
            
            if len(active_providers) > 0:
                insights["recommendations"].append({
                    "category": "Testing",
                    "priority": "High",
                    "message": f"Found {len(active_providers)} active testnet providers.",
                    "action": "Test deals with multiple providers to understand differences"
                })
        
        return insights

# Example usage
if __name__ == "__main__":
    aggregator = TestnetDealDataAggregator()
    
    print("🧪 Testnet/Calibration Filecoin Deal Data Aggregator")
    print("=" * 60)
    
    # Test individual components
    print("\n1. Testing Chain Information...")
    chain_info = aggregator.get_testnet_chain_info()
    if "error" not in chain_info:
        print(f"   ✓ Network: {chain_info.get('network', 'unknown')}")
        print(f"   ✓ Status: {chain_info.get('status', 'unknown')}")
        if "chain_head" in chain_info:
            print(f"   ✓ Height: {chain_info['chain_head'].get('height', 0)}")
    else:
        print(f"   ✗ Error: {chain_info['error']}")
    
    print("\n2. Testing Recent Deals...")
    deals_data = aggregator.get_testnet_deals(limit=20)
    if "error" not in deals_data:
        print(f"   ✓ Retrieved {deals_data['total_deals']} recent deals")
        analytics = deals_data.get("analytics", {})
        print(f"   ✓ Verified deals: {analytics.get('verified_deals_percentage', 0):.1f}%")
        print(f"   ✓ Avg piece size: {analytics.get('average_piece_size_gb', 0):.2f} GB")
    else:
        print(f"   ✗ Error: {deals_data['error']}")
    
    print("\n3. Testing Network Metrics...")
    network_metrics = aggregator.get_testnet_network_metrics()
    if "error" not in network_metrics:
        print(f"   ✓ Retrieved network metrics")
        metrics = network_metrics.get("metrics", {})
        if "network_version" in metrics:
            print(f"   ✓ Network version: {metrics['network_version']}")
    else:
        print(f"   ✗ Error: {network_metrics['error']}")
    
    print("\n4. Testing Provider Information...")
    provider_info = aggregator.get_testnet_provider_info()
    if "error" not in provider_info:
        print(f"   ✓ Found {provider_info.get('total_providers_found', 0)} active providers")
        providers = provider_info.get("active_providers", [])
        if providers:
            print(f"   ✓ Sample providers: {providers[:3]}")
    else:
        print(f"   ✗ Error: {provider_info['error']}")
    
    print("\n5. Generating Comprehensive Analysis...")
    comprehensive = aggregator.get_comprehensive_testnet_analysis()
    print("   ✓ Analysis complete!")
    print(f"   ✓ Generated {len(comprehensive['insights']['recommendations'])} recommendations")
    
    # Show insights
    insights = comprehensive.get("insights", {})
    if insights.get("deal_activity"):
        activity = insights["deal_activity"]
        print(f"\n📊 Testnet Deal Activity:")
        print(f"   Total deals: {activity.get('total_deals', 0)}")
        print(f"   Verified deals: {activity.get('verified_deals_percentage', 0):.1f}%")
        print(f"   Avg piece size: {activity.get('average_piece_size_gb', 0):.2f} GB")
    
    if insights.get("recommendations"):
        print(f"\n💡 Recommendations:")
        for i, rec in enumerate(insights["recommendations"], 1):
            print(f"   {i}. [{rec['priority']}] {rec['message']}")
            print(f"      Action: {rec['action']}") 