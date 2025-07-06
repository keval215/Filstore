#!/usr/bin/env python3
"""
Test script for File Retrieval functionality
This script tests the file retrieval API endpoints
"""

import requests
import json
import time
import sys

# Configuration
GATEWAY_URL = "http://localhost:8080"
ENGINE_URL = "http://localhost:9090"

# Test wallet address (you'll need to replace this with a real one)
TEST_WALLET_ADDRESS = "f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za"

def test_health_endpoints():
    """Test health endpoints"""
    print("🏥 Testing Health Endpoints...")
    
    # Test gateway health
    try:
        resp = requests.get(f"{GATEWAY_URL}/api/v1/health")
        if resp.status_code == 200:
            print("✅ Gateway health check passed")
        else:
            print(f"❌ Gateway health check failed: {resp.status_code}")
    except Exception as e:
        print(f"❌ Gateway health check error: {e}")
    
    # Test engine health
    try:
        resp = requests.get(f"{ENGINE_URL}/api/v1/health")
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Engine health check passed - Features: {data.get('features', [])}")
        else:
            print(f"❌ Engine health check failed: {resp.status_code}")
    except Exception as e:
        print(f"❌ Engine health check error: {e}")

def test_list_user_files():
    """Test listing user files"""
    print("\n📁 Testing List User Files...")
    
    headers = {
        "X-Wallet-Address": TEST_WALLET_ADDRESS
    }
    
    try:
        resp = requests.get(f"{ENGINE_URL}/api/v1/retrieval/files", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ List files successful")
            print(f"   Total files: {data.get('total_count', 0)}")
            print(f"   Total size: {data.get('total_size', 0)} bytes")
            print(f"   Has more: {data.get('has_more', False)}")
            
            files = data.get('files', [])
            if files:
                print(f"   Sample file: {files[0].get('file_path', 'N/A')}")
                print(f"   Root CID: {files[0].get('root_cid', 'N/A')}")
            return files
        else:
            print(f"❌ List files failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ List files error: {e}")
        return []

def test_create_retrieval_job():
    """Test creating a retrieval job"""
    print("\n🔄 Testing Create Retrieval Job...")
    
    headers = {
        "Content-Type": "application/json",
        "X-Wallet-Address": TEST_WALLET_ADDRESS
    }
    
    # Test with backup job ID
    payload = {
        "backup_job_id": "test-backup-id",
        "format": "original"
    }
    
    try:
        resp = requests.post(f"{ENGINE_URL}/api/v1/retrieval", 
                           headers=headers, 
                           json=payload)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Create retrieval job successful")
            print(f"   Job ID: {data.get('id', 'N/A')}")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Total files: {data.get('total_files', 0)}")
            return data.get('id')
        else:
            print(f"❌ Create retrieval job failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
            return None
    except Exception as e:
        print(f"❌ Create retrieval job error: {e}")
        return None

def test_get_retrieval_status(job_id):
    """Test getting retrieval job status"""
    if not job_id:
        print("⚠️  Skipping status check - no job ID")
        return
    
    print(f"\n📊 Testing Get Retrieval Status for job {job_id}...")
    
    headers = {
        "X-Wallet-Address": TEST_WALLET_ADDRESS
    }
    
    try:
        resp = requests.get(f"{ENGINE_URL}/api/v1/retrieval/{job_id}", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Get retrieval status successful")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Progress: {data.get('progress', 0)}%")
            print(f"   Message: {data.get('message', 'N/A')}")
            print(f"   Total size: {data.get('total_size', 0)} bytes")
            print(f"   Files count: {len(data.get('files', []))}")
        else:
            print(f"❌ Get retrieval status failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
    except Exception as e:
        print(f"❌ Get retrieval status error: {e}")

def test_get_file_metadata():
    """Test getting file metadata"""
    print("\n📋 Testing Get File Metadata...")
    
    # First get a list of files
    files = test_list_user_files()
    if not files:
        print("⚠️  No files available for metadata test")
        return
    
    # Use the first file's CID
    test_cid = files[0].get('root_cid')
    if not test_cid:
        print("⚠️  No CID available for metadata test")
        return
    
    headers = {
        "X-Wallet-Address": TEST_WALLET_ADDRESS
    }
    
    try:
        resp = requests.get(f"{ENGINE_URL}/api/v1/retrieval/metadata/{test_cid}", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Get file metadata successful")
            print(f"   File path: {data.get('file_path', 'N/A')}")
            print(f"   Original size: {data.get('original_size', 0)} bytes")
            print(f"   CAR size: {data.get('car_size', 0)} bytes")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Storage deals: {len(data.get('storage_deals', []))}")
        else:
            print(f"❌ Get file metadata failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
    except Exception as e:
        print(f"❌ Get file metadata error: {e}")

def test_download_file():
    """Test downloading a file"""
    print("\n⬇️  Testing Download File...")
    
    # First get a list of files
    files = test_list_user_files()
    if not files:
        print("⚠️  No files available for download test")
        return
    
    # Use the first file's CID
    test_cid = files[0].get('root_cid')
    if not test_cid:
        print("⚠️  No CID available for download test")
        return
    
    headers = {
        "X-Wallet-Address": TEST_WALLET_ADDRESS
    }
    
    try:
        # Test metadata download first (smaller)
        resp = requests.get(f"{ENGINE_URL}/api/v1/retrieval/download/{test_cid}?format=metadata", 
                           headers=headers)
        if resp.status_code == 200:
            print(f"✅ Download file metadata successful")
            print(f"   Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
            print(f"   Content-Length: {resp.headers.get('Content-Length', 'N/A')}")
            print(f"   Content-Disposition: {resp.headers.get('Content-Disposition', 'N/A')}")
            
            # Try to parse as JSON
            try:
                metadata = resp.json()
                print(f"   Metadata keys: {list(metadata.keys())}")
            except:
                print(f"   Response is not JSON (length: {len(resp.content)} bytes)")
        else:
            print(f"❌ Download file failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
    except Exception as e:
        print(f"❌ Download file error: {e}")

def test_cancel_retrieval(job_id):
    """Test cancelling a retrieval job"""
    if not job_id:
        print("⚠️  Skipping cancel test - no job ID")
        return
    
    print(f"\n❌ Testing Cancel Retrieval for job {job_id}...")
    
    headers = {
        "X-Wallet-Address": TEST_WALLET_ADDRESS
    }
    
    try:
        resp = requests.post(f"{ENGINE_URL}/api/v1/retrieval/{job_id}/cancel", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Cancel retrieval successful")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Message: {data.get('message', 'N/A')}")
        else:
            print(f"❌ Cancel retrieval failed: {resp.status_code}")
            print(f"   Response: {resp.text}")
    except Exception as e:
        print(f"❌ Cancel retrieval error: {e}")

def main():
    """Main test function"""
    print("🧪 File Retrieval System Test")
    print("=" * 50)
    
    # Check if services are running
    print("🔍 Checking if services are running...")
    test_health_endpoints()
    
    # Test file retrieval functionality
    print("\n" + "=" * 50)
    print("📂 Testing File Retrieval Functionality")
    print("=" * 50)
    
    # Test listing files
    files = test_list_user_files()
    
    # Test getting file metadata
    test_get_file_metadata()
    
    # Test downloading files
    test_download_file()
    
    # Test creating retrieval job
    job_id = test_create_retrieval_job()
    
    # Test getting job status
    test_get_retrieval_status(job_id)
    
    # Test cancelling job
    test_cancel_retrieval(job_id)
    
    print("\n" + "=" * 50)
    print("🎉 Testing completed!")
    print("\n💡 Notes:")
    print("   - Some tests may fail if no files are available")
    print("   - Make sure you have uploaded files first")
    print("   - Check that all services are running")
    print("   - Verify wallet authentication is working")

if __name__ == "__main__":
    main() 