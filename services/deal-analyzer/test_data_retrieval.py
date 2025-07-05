#!/usr/bin/env python3
"""
Test script for Deal Analyzer data retrieval functionality
This script helps you test the data retrieval without running the full API server
"""

import sys
import json
from deal_fetcher import DealFetcher

def test_deal_fetcher():
    """Test the DealFetcher class functionality"""
    print("🧪 Testing Deal Analyzer Data Retrieval")
    print("=" * 50)
    
    # Test 1: Testnet deals (usually faster and more reliable)
    print("\n1️⃣ Testing Testnet Deal Fetching...")
    try:
        fetcher_testnet = DealFetcher('testnet')
        deals_testnet = fetcher_testnet.fetch_lotus_deals(limit=5)
        
        if isinstance(deals_testnet, dict) and not any(k in deals_testnet for k in ("error", "info", "tip")):
            print(f"✅ Successfully fetched {len(deals_testnet)} testnet deals")
            
            # Show first deal structure
            if deals_testnet:
                first_deal_id = list(deals_testnet.keys())[0]
                first_deal = deals_testnet[first_deal_id]
                print(f"📋 Sample deal structure:")
                print(f"   Deal ID: {first_deal_id}")
                print(f"   Provider: {first_deal.get('Proposal', {}).get('Provider', 'N/A')}")
                print(f"   Client: {first_deal.get('Proposal', {}).get('Client', 'N/A')}")
                print(f"   Price: {first_deal.get('Proposal', {}).get('StoragePricePerEpoch', 'N/A')}")
                print(f"   Verified: {first_deal.get('Proposal', {}).get('VerifiedDeal', False)}")
        else:
            print(f"⚠️  Testnet fetch returned: {deals_testnet}")
            
    except Exception as e:
        print(f"❌ Error fetching testnet deals: {e}")
    
    # Test 2: Mainnet deals (might be slower)
    print("\n2️⃣ Testing Mainnet Deal Fetching...")
    try:
        fetcher_mainnet = DealFetcher('mainnet')
        deals_mainnet = fetcher_mainnet.fetch_lotus_deals(limit=3)
        
        if isinstance(deals_mainnet, dict) and not any(k in deals_mainnet for k in ("error", "info", "tip")):
            print(f"✅ Successfully fetched {len(deals_mainnet)} mainnet deals")
        else:
            print(f"⚠️  Mainnet fetch returned: {deals_mainnet}")
            
    except Exception as e:
        print(f"❌ Error fetching mainnet deals: {e}")
    
    # Test 3: Deal Statistics
    print("\n3️⃣ Testing Deal Statistics...")
    try:
        # Use testnet for statistics (more reliable)
        fetcher = DealFetcher('testnet')
        deals = fetcher.fetch_lotus_deals(limit=10)
        
        if isinstance(deals, dict) and not any(k in deals for k in ("error", "info", "tip")):
            stats = fetcher.get_deal_statistics(deals)
            print("📊 Deal Statistics:")
            for key, value in stats.items():
                print(f"   {key}: {value}")
        else:
            print(f"⚠️  Could not calculate statistics: {deals}")
            
    except Exception as e:
        print(f"❌ Error calculating statistics: {e}")
    
    # Test 4: Cache functionality
    print("\n4️⃣ Testing Cache Functionality...")
    try:
        fetcher = DealFetcher('testnet')
        
        # First call (should fetch from network)
        print("   First call (should fetch from network)...")
        deals1 = fetcher.fetch_lotus_deals(limit=3, use_cache=True)
        
        # Second call (should use cache)
        print("   Second call (should use cache)...")
        deals2 = fetcher.fetch_lotus_deals(limit=3, use_cache=True)
        
        if deals1 == deals2:
            print("✅ Cache is working correctly")
        else:
            print("⚠️  Cache might not be working as expected")
            
    except Exception as e:
        print(f"❌ Error testing cache: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Testing completed!")

def test_boost_deals():
    """Test Boost GraphQL deal fetching"""
    print("\n🚀 Testing Boost GraphQL Deal Fetching...")
    try:
        fetcher = DealFetcher('testnet')
        boost_deals = fetcher.fetch_boost_deals()
        
        if boost_deals:
            print(f"✅ Successfully fetched {len(boost_deals)} deals from Boost")
            if boost_deals:
                print(f"📋 Sample Boost deal:")
                print(f"   ID: {boost_deals[0].get('ID', 'N/A')}")
                print(f"   Status: {boost_deals[0].get('DealStatus', 'N/A')}")
                print(f"   Provider: {boost_deals[0].get('Provider', 'N/A')}")
        else:
            print("⚠️  No deals returned from Boost (this is normal if Boost is not configured)")
            
    except Exception as e:
        print(f"❌ Error fetching Boost deals: {e}")

if __name__ == "__main__":
    print("Starting Deal Analyzer Data Retrieval Tests...")
    
    # Run basic tests
    test_deal_fetcher()
    
    # Run Boost tests
    test_boost_deals()
    
    print("\n💡 Tips:")
    print("   - If you see errors, check your internet connection")
    print("   - Testnet is usually more reliable than mainnet")
    print("   - Some endpoints might be rate-limited")
    print("   - Boost GraphQL requires a running Boost instance")
    
    print("\n🔧 To run the full API server:")
    print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
