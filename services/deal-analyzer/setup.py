#!/usr/bin/env python3
"""
Setup script for Deal Analyzer service
This script helps you set up the environment and install dependencies
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"   Error output: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required, found {version.major}.{version.minor}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install Python dependencies"""
    print("\n📦 Installing Python dependencies...")
    
    # Check if pip is available
    if not run_command("python -m pip --version", "Checking pip availability"):
        print("❌ pip not found. Please install pip first.")
        return False
    
    # Install dependencies
    if not run_command("python -m pip install -r requirements.txt", "Installing dependencies"):
        print("❌ Failed to install dependencies")
        return False
    
    return True

def create_cache_directory():
    """Create cache directory for S3 files"""
    print("\n📁 Creating cache directory...")
    try:
        os.makedirs("cache", exist_ok=True)
        print("✅ Cache directory created/verified")
        return True
    except Exception as e:
        print(f"❌ Failed to create cache directory: {e}")
        return False

def test_imports():
    """Test if all required modules can be imported"""
    print("\n🧪 Testing imports...")
    
    required_modules = [
        "fastapi",
        "uvicorn", 
        "requests",
        "pydantic",
        "zstandard"
    ]
    
    failed_imports = []
    for module in required_modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module}")
            failed_imports.append(module)
    
    if failed_imports:
        print(f"\n❌ Failed to import: {', '.join(failed_imports)}")
        print("   Please run: python -m pip install -r requirements.txt")
        return False
    
    return True

def main():
    """Main setup function"""
    print("🚀 Deal Analyzer Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Create cache directory
    if not create_cache_directory():
        return False
    
    # Test imports
    if not test_imports():
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Test the data retrieval:")
    print("   python test_data_retrieval.py")
    print("\n2. Run the API server:")
    print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    print("\n3. Access the API documentation:")
    print("   http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
