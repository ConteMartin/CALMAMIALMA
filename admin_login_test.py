#!/usr/bin/env python3
"""
Admin User Login Functionality Test
Tests the specific admin user login functionality as requested in the review.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001/api"
HEADERS = {"Content-Type": "application/json"}

def test_admin_user_creation():
    """Test creating admin user using POST /api/auth/create-admin-user"""
    print("=== TESTING ADMIN USER CREATION ===")
    
    url = f"{BASE_URL}/auth/create-admin-user"
    
    try:
        response = requests.post(url, headers=HEADERS)
        result = response.json() if response.content else {}
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            expected_email = "admin@calmamialma.com"
            if result.get("email") == expected_email:
                print("✅ PASS: Admin user created successfully")
                return True
            else:
                print(f"❌ FAIL: Expected email {expected_email}, got {result.get('email')}")
                return False
        else:
            print(f"❌ FAIL: Failed to create admin user: {result}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception during admin user creation: {e}")
        return False

def test_admin_login():
    """Test admin login with credentials: admin@calmamialma.com / admin123"""
    print("\n=== TESTING ADMIN LOGIN ===")
    
    login_data = {
        "username": "admin@calmamialma.com",
        "password": "admin123"
    }
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    url = f"{BASE_URL}/auth/login"
    
    try:
        response = requests.post(url, headers=headers, data=login_data)
        result = response.json() if response.content else {}
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            # Verify the login response includes required fields
            access_token = result.get("access_token")
            user = result.get("user", {})
            
            # Check required fields
            is_admin = user.get("is_admin")
            is_premium = user.get("is_premium")
            
            print(f"\n=== VERIFICATION ===")
            print(f"Access Token Present: {'✅' if access_token else '❌'}")
            print(f"is_admin: {is_admin} {'✅' if is_admin else '❌'}")
            print(f"is_premium: {is_premium} {'✅' if is_premium else '❌'}")
            print(f"Token Type: {result.get('token_type')}")
            print(f"User Email: {user.get('email')}")
            print(f"User Name: {user.get('name')}")
            
            if access_token and is_admin and is_premium:
                print("✅ PASS: Admin login successful with all required fields")
                return access_token
            else:
                print("❌ FAIL: Admin login missing required fields")
                return None
        else:
            print(f"❌ FAIL: Admin login failed: {result}")
            return None
            
    except Exception as e:
        print(f"❌ FAIL: Exception during admin login: {e}")
        return None

def test_admin_endpoints(admin_token):
    """Test accessing admin endpoints"""
    print("\n=== TESTING ADMIN ENDPOINTS ===")
    
    if not admin_token:
        print("❌ FAIL: No admin token available")
        return False
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }
    
    # Test GET /api/admin/videos
    print("\n--- Testing GET /api/admin/videos ---")
    try:
        response = requests.get(f"{BASE_URL}/admin/videos", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ PASS: GET /api/admin/videos accessible")
        else:
            print(f"❌ FAIL: GET /api/admin/videos failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception accessing admin videos: {e}")
        return False
    
    # Test GET /api/admin/courses
    print("\n--- Testing GET /api/admin/courses ---")
    try:
        response = requests.get(f"{BASE_URL}/admin/courses", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ PASS: GET /api/admin/courses accessible")
        else:
            print(f"❌ FAIL: GET /api/admin/courses failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception accessing admin courses: {e}")
        return False
    
    # Test POST /api/admin/videos (create a test video)
    print("\n--- Testing POST /api/admin/videos ---")
    video_data = {
        "title": "Admin Test Video",
        "description": "Test video created by admin user",
        "youtube_url": "https://www.youtube.com/watch?v=admintest123",
        "category": "MEDITACION",
        "thumbnail_url": "https://img.youtube.com/vi/admintest123/maxresdefault.jpg",
        "duration": "10:00",
        "is_premium": True
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/videos", headers=headers, json=video_data)
        result = response.json() if response.content else {}
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            print("✅ PASS: POST /api/admin/videos successful")
        else:
            print(f"❌ FAIL: POST /api/admin/videos failed: {result}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception creating admin video: {e}")
        return False
    
    return True

def main():
    """Main function to run admin login tests"""
    print("🚀 Starting Admin User Login Functionality Test")
    print("=" * 60)
    
    # Step 1: Create admin user (if not exists)
    admin_created = test_admin_user_creation()
    
    # Step 2: Test admin login
    admin_token = test_admin_login()
    
    # Step 3: Test admin endpoints
    admin_endpoints_working = test_admin_endpoints(admin_token)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 ADMIN LOGIN TEST SUMMARY")
    print("=" * 60)
    print(f"Admin User Creation: {'✅ PASS' if admin_created else '❌ FAIL'}")
    print(f"Admin Login: {'✅ PASS' if admin_token else '❌ FAIL'}")
    print(f"Admin Endpoints Access: {'✅ PASS' if admin_endpoints_working else '❌ FAIL'}")
    
    if admin_created and admin_token and admin_endpoints_working:
        print("\n🎉 ALL ADMIN FUNCTIONALITY TESTS PASSED!")
        print("✅ Admin user has full admin privileges and can access all admin functionality")
        return True
    else:
        print("\n❌ SOME ADMIN FUNCTIONALITY TESTS FAILED!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)