#!/usr/bin/env python3
"""
Specific test for user registration endpoint to identify 500 error
Testing POST /api/auth/register with the exact data provided
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8010/api"
HEADERS = {"Content-Type": "application/json"}

def test_user_registration():
    """Test user registration endpoint with specific data to identify 500 error"""
    print("🔍 Testing User Registration Endpoint")
    print("=" * 50)
    
    # Test data as specified in the request
    registration_data = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "testpass123"
    }
    
    print(f"📝 Testing with data: {json.dumps(registration_data, indent=2)}")
    
    try:
        # Make the registration request
        url = f"{BASE_URL}/auth/register"
        print(f"🌐 Making POST request to: {url}")
        
        response = requests.post(url, headers=HEADERS, json=registration_data)
        
        print(f"📊 Response Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        # Try to get response content
        try:
            response_json = response.json()
            print(f"📄 Response JSON: {json.dumps(response_json, indent=2)}")
        except ValueError as e:
            print(f"⚠️  Response is not valid JSON: {e}")
            print(f"📄 Raw Response Text: {response.text}")
        
        # Check if it's a 500 error
        if response.status_code == 500:
            print("\n🚨 500 INTERNAL SERVER ERROR DETECTED!")
            print("This is the error we're investigating.")
            
            # Try to extract error details
            try:
                error_data = response.json()
                if "detail" in error_data:
                    print(f"🔍 Error Detail: {error_data['detail']}")
            except:
                pass
                
            return False
        elif response.status_code == 200 or response.status_code == 201:
            print("\n✅ Registration successful!")
            return True
        else:
            print(f"\n⚠️  Unexpected status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Backend server not running")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

def check_backend_logs():
    """Check backend logs for more details about the error"""
    print("\n🔍 Checking Backend Logs")
    print("=" * 30)
    
    try:
        import subprocess
        
        # Try to get supervisor logs
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            print("📋 Backend Output Logs (last 50 lines):")
            print(result.stdout)
        
        # Try to get error logs
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout:
            print("\n📋 Backend Error Logs (last 50 lines):")
            print(result.stdout)
            
    except Exception as e:
        print(f"⚠️  Could not retrieve backend logs: {e}")

def test_health_first():
    """Test health endpoint first to ensure backend is running"""
    print("🏥 Testing Backend Health")
    print("=" * 25)
    
    try:
        url = "http://localhost:8010/health"  # Direct health endpoint
        response = requests.get(url)
        
        print(f"📊 Health Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                health_data = response.json()
                print(f"📄 Health Response: {json.dumps(health_data, indent=2)}")
                return True
            except:
                print("⚠️  Health endpoint returned non-JSON response")
                return False
        else:
            print(f"❌ Health check failed with status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend - server may not be running")
        return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def main():
    """Main function to run the registration test"""
    print("🚀 User Registration 500 Error Investigation")
    print("=" * 60)
    
    # First check if backend is healthy
    if not test_health_first():
        print("\n❌ Backend is not healthy. Cannot proceed with registration test.")
        return 1
    
    print("\n" + "=" * 60)
    
    # Test the registration endpoint
    success = test_user_registration()
    
    # Always check logs for additional context
    check_backend_logs()
    
    print("\n" + "=" * 60)
    print("📋 INVESTIGATION SUMMARY:")
    
    if success:
        print("✅ Registration worked successfully - no 500 error found")
    else:
        print("🚨 Registration failed - 500 error or other issue detected")
        print("📋 Check the logs above for detailed error information")
    
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())