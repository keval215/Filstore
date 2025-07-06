#!/usr/bin/env python3
"""
Filecoin Storage Advisor for Users
Helps users make informed decisions about storing data on Filecoin
"""

import requests
import pandas as pd
import io
from datetime import datetime, timedelta
import json

class FilecoinStorageAdvisor:
    """
    Advisor that helps users understand Filecoin storage market
    and make informed decisions about data storage
    """
    
    def __init__(self):
        self.parquet_url = "https://data.filecoindataportal.xyz/filecoin_daily_metrics.parquet"
        
    def get_market_analysis(self, days: int = 30):
        """Get comprehensive market analysis for storage decisions"""
        try:
            import sys
            # Don't print to stdout when called from API (stderr is fine)
            print("Fetching Filecoin storage market data...", file=sys.stderr)
            response = requests.get(self.parquet_url, timeout=30)
            response.raise_for_status()
            
            df = pd.read_parquet(io.BytesIO(response.content))
            df["date"] = pd.to_datetime(df["date"])
            
            # Get recent data
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_df = df[df["date"] >= cutoff_date].copy()
            
            if recent_df.empty:
                return {"error": "No recent data available"}
            
            # Calculate key metrics for users
            analysis = self._analyze_for_users(recent_df)
            
            return {
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
    
    def get_storage_decision_framework(self):
        """Provide a framework for making storage decisions"""
        return {
            "decision_factors": {
                "cost": {
                    "description": "Storage price per GB",
                    "importance": "High",
                    "considerations": [
                        "Current market rates",
                        "Price trends (increasing/decreasing)",
                        "Long-term vs short-term deals"
                    ]
                },
                "reliability": {
                    "description": "Provider reputation and uptime",
                    "importance": "High",
                    "considerations": [
                        "Provider track record",
                        "Geographic distribution",
                        "Redundancy (multiple providers)"
                    ]
                },
                "deal_type": {
                    "description": "Verified vs regular deals",
                    "importance": "Medium",
                    "considerations": [
                        "FIL+ verified deals offer better incentives",
                        "Regular deals may be cheaper",
                        "Provider preference for verified deals"
                    ]
                },
                "duration": {
                    "description": "Deal length and flexibility",
                    "importance": "Medium",
                    "considerations": [
                        "Longer deals often have better rates",
                        "Consider data lifecycle needs",
                        "Early termination costs"
                    ]
                },
                "data_size": {
                    "description": "Amount of data to store",
                    "importance": "High",
                    "considerations": [
                        "Larger deals may get volume discounts",
                        "Consider breaking into multiple deals",
                        "Piece size optimization"
                    ]
                }
            },
            "decision_checklist": [
                "What's your budget per GB?",
                "How long do you need to store the data?",
                "Is data redundancy important?",
                "Do you qualify for FIL+ verified deals?",
                "What's your data access pattern?",
                "Are you comfortable with provider selection?"
            ]
        }

def main():
    """Demo the storage advisor"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Filecoin Storage Advisor')
    parser.add_argument('--days', type=int, default=7, help='Days of data to analyze')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')
    args = parser.parse_args()
    
    advisor = FilecoinStorageAdvisor()
    
    if not args.json:
        print("🔍 Filecoin Storage Advisor for Users")
        print("=" * 50)
    
    # Get market analysis
    analysis = advisor.get_market_analysis(days=args.days)
    
    if "error" in analysis:
        if args.json:
            print(json.dumps({"error": analysis["error"]}))
        else:
            print(f"❌ Error: {analysis['error']}")
        return
    
    if args.json:
        # Output JSON for API consumption
        output = {
            "market_insights": analysis["market_insights"],
            "recommendations": analysis["recommendations"],
            "decision_framework": advisor.get_storage_decision_framework(),
            "timestamp": analysis["timestamp"],
            "analysis_period_days": analysis["analysis_period_days"]
        }
        print(json.dumps(output, indent=2))
        return
    
    # Original console output for CLI usage
    insights = analysis["market_insights"]
    recommendations = analysis["recommendations"]
    
    print("\n📈 Current Market Overview:")
    print(f"   Daily new deals: {insights['current_market']['daily_new_deals']:,}")
    print(f"   Verified deals: {insights['current_market']['verified_deals_percentage']:.1f}%")
    print(f"   Market activity: {insights['market_activity']['market_activity_level']}")
    
    print(f"\n💰 Pricing Information:")
    print(f"   Current cost: {insights['pricing']['current_storage_cost']:.2e} attoFIL")
    print(f"   Price trend: {insights['pricing']['price_trend']}")
    print(f"   Price change: {insights['pricing']['price_change_percent']:+.1f}%")
    
    print(f"\n📊 Data Efficiency:")
    print(f"   Unique data ratio: {insights['data_efficiency']['unique_data_ratio']:.1%}")
    print(f"   Efficiency level: {insights['data_efficiency']['data_deduplication_efficiency']}")
    
    print(f"\n💡 Recommendations:")
    for i, rec in enumerate(recommendations, 1):
        print(f"   {i}. [{rec['priority']}] {rec['message']}")
        print(f"      Action: {rec['action']}")
    
    print(f"\n🎯 Decision Framework:")
    framework = advisor.get_storage_decision_framework()
    for factor, details in framework["decision_factors"].items():
        print(f"   {factor.title()}: {details['description']} ({details['importance']} priority)")
    
    print(f"\n✅ Decision Checklist:")
    for i, item in enumerate(framework["decision_checklist"], 1):
        print(f"   {i}. {item}")

if __name__ == "__main__":
    main() 