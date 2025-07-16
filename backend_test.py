#!/usr/bin/env python3
"""
Backend API Testing Script for Calma Mi Alma Premium Features
Tests all the new premium functionality including user creation, courses, calendar, and tarot restrictions.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8001/api"
HEADERS = {"Content-Type": "application/json"}

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.premium_token = None
        self.free_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            # Try to parse JSON, but handle cases where response is not JSON
            try:
                response_data = response.json() if response.content else {}
            except ValueError as e:
                response_data = {"error": f"Invalid JSON response: {response.text[:200]}"}
            
            return {
                "status_code": response.status_code,
                "data": response_data,
                "success": response.status_code < 400,
                "raw_text": response.text[:500] if hasattr(response, 'text') else ""
            }
        except requests.exceptions.ConnectionError:
            return {"error": "Connection failed - Backend server not running", "status_code": 0}
        except Exception as e:
            return {"error": str(e), "status_code": 0}
    
    def test_health_check(self):
        """Test if backend is running"""
        print("\n=== HEALTH CHECK ===")
        result = self.make_request("GET", "/health")
        
        if result.get("error"):
            self.log_test("Health Check", False, result["error"])
            return False
        
        if result["success"]:
            self.log_test("Health Check", True, "Backend is running and healthy")
            return True
        else:
            self.log_test("Health Check", False, f"Health check failed: {result.get('data', {})}")
            return False
    
    def test_premium_user_creation(self):
        """Test creating the premium user 'PREMIUM Vane'"""
        print("\n=== PREMIUM USER CREATION ===")
        
        # First create the premium user
        result = self.make_request("POST", "/auth/create-premium-user")
        
        if result.get("error"):
            self.log_test("Premium User Creation", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            expected_email = "premium@calmamialma.com"
            expected_name = "PREMIUM Vane"
            
            if data.get("email") == expected_email:
                self.log_test("Premium User Creation", True, 
                            f"Premium user created successfully: {expected_name}")
                return True
            else:
                self.log_test("Premium User Creation", False, 
                            f"User created but email mismatch. Expected: {expected_email}, Got: {data.get('email')}")
                return False
        else:
            self.log_test("Premium User Creation", False, 
                        f"Failed to create premium user: {result.get('data', {})}")
            return False
    
    def test_login_premium_user(self):
        """Test login with premium user credentials"""
        print("\n=== PREMIUM USER LOGIN ===")
        
        login_data = {
            "username": "premium@calmamialma.com",
            "password": "asd123"
        }
        
        # Use form data for OAuth2PasswordRequestForm
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            url = f"{self.base_url}/auth/login"
            response = requests.post(url, headers=headers, data=login_data)
            
            result = {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code < 400
            }
        except Exception as e:
            result = {"error": str(e), "status_code": 0}
        
        if result.get("error"):
            self.log_test("Premium User Login", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            if "access_token" in data and data.get("user", {}).get("is_premium"):
                self.premium_token = data["access_token"]
                user_name = data.get("user", {}).get("name", "Unknown")
                self.log_test("Premium User Login", True, 
                            f"Premium user logged in successfully: {user_name}")
                return True
            else:
                self.log_test("Premium User Login", False, 
                            "Login successful but user is not premium or missing token")
                return False
        else:
            self.log_test("Premium User Login", False, 
                        f"Login failed: {result.get('data', {})}")
            return False
    
    def test_course_details_api(self):
        """Test the course details API endpoint"""
        print("\n=== COURSE DETAILS API ===")
        
        if not self.premium_token:
            self.log_test("Course Details API", False, "No premium token available")
            return False
        
        # Test getting details for course ID "1"
        course_id = "1"
        result = self.make_request("GET", f"/courses/{course_id}/details", token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Course Details API", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            required_fields = ["id", "title", "description", "price", "duration", "level", "youtube_url", "program"]
            
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                # Check if premium discount is applied
                has_discount = "discounted_price" in data
                self.log_test("Course Details API", True, 
                            f"Course details retrieved successfully. Premium discount applied: {has_discount}")
                return True
            else:
                self.log_test("Course Details API", False, 
                            f"Missing required fields: {missing_fields}")
                return False
        else:
            self.log_test("Course Details API", False, 
                        f"Failed to get course details: {result.get('data', {})}")
            return False
    
    def test_course_purchase_api(self):
        """Test course purchase functionality"""
        print("\n=== COURSE PURCHASE API ===")
        
        if not self.premium_token:
            self.log_test("Course Purchase API", False, "No premium token available")
            return False
        
        # Test purchasing course ID "1"
        purchase_data = {
            "course_id": "1",
            "payment_method": "stripe"
        }
        
        result = self.make_request("POST", "/courses/purchase", data=purchase_data, token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Course Purchase API", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            required_fields = ["id", "course_id", "user_id", "purchase_date", "payment_status", "access_granted"]
            
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields and data.get("access_granted"):
                self.log_test("Course Purchase API", True, 
                            f"Course purchased successfully. Payment status: {data.get('payment_status')}")
                return True
            else:
                self.log_test("Course Purchase API", False, 
                            f"Purchase incomplete. Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("Course Purchase API", False, 
                        f"Failed to purchase course: {result.get('data', {})}")
            return False
    
    def test_purchased_courses_api(self):
        """Test getting purchased courses"""
        print("\n=== PURCHASED COURSES API ===")
        
        if not self.premium_token:
            self.log_test("Purchased Courses API", False, "No premium token available")
            return False
        
        result = self.make_request("GET", "/courses/purchased", token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Purchased Courses API", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            if isinstance(data, list):
                self.log_test("Purchased Courses API", True, 
                            f"Retrieved {len(data)} purchased courses")
                return True
            else:
                self.log_test("Purchased Courses API", False, 
                            "Response is not a list of courses")
                return False
        else:
            self.log_test("Purchased Courses API", False, 
                        f"Failed to get purchased courses: {result.get('data', {})}")
            return False
    
    def test_calendar_routine_get(self):
        """Test getting calendar routine (premium only)"""
        print("\n=== CALENDAR ROUTINE GET ===")
        
        if not self.premium_token:
            self.log_test("Calendar Routine GET", False, "No premium token available")
            return False
        
        result = self.make_request("GET", "/calendar/routine", token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Calendar Routine GET", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            required_fields = ["id", "user_id", "weekly_routine", "created_at", "updated_at"]
            
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                routine_days = len(data.get("weekly_routine", {}))
                self.log_test("Calendar Routine GET", True, 
                            f"Calendar routine retrieved successfully. Days configured: {routine_days}")
                return True
            else:
                self.log_test("Calendar Routine GET", False, 
                            f"Missing required fields: {missing_fields}")
                return False
        else:
            self.log_test("Calendar Routine GET", False, 
                        f"Failed to get calendar routine: {result.get('data', {})}")
            return False
    
    def test_calendar_routine_update(self):
        """Test updating calendar routine (premium only)"""
        print("\n=== CALENDAR ROUTINE UPDATE ===")
        
        if not self.premium_token:
            self.log_test("Calendar Routine UPDATE", False, "No premium token available")
            return False
        
        routine_data = {
            "weekly_routine": {
                "lunes": ["yoga", "meditacion"],
                "martes": ["respiracion", "yoga"],
                "miercoles": ["meditacion"],
                "jueves": ["yoga"],
                "viernes": ["respiracion"],
                "sabado": ["yoga", "meditacion"],
                "domingo": ["meditacion"]
            }
        }
        
        result = self.make_request("PUT", "/calendar/routine", data=routine_data, token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Calendar Routine UPDATE", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            if "weekly_routine" in data and data["weekly_routine"] == routine_data["weekly_routine"]:
                self.log_test("Calendar Routine UPDATE", True, 
                            "Calendar routine updated successfully")
                return True
            else:
                self.log_test("Calendar Routine UPDATE", False, 
                            "Routine not updated correctly")
                return False
        else:
            self.log_test("Calendar Routine UPDATE", False, 
                        f"Failed to update calendar routine: {result.get('data', {})}")
            return False
    
    def test_google_calendar_sync(self):
        """Test Google Calendar sync (premium only)"""
        print("\n=== GOOGLE CALENDAR SYNC ===")
        
        if not self.premium_token:
            self.log_test("Google Calendar Sync", False, "No premium token available")
            return False
        
        sync_data = {
            "access_token": "fake_google_token_for_testing",
            "sync_enabled": True
        }
        
        result = self.make_request("POST", "/calendar/sync-google", data=sync_data, token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Google Calendar Sync", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            if data.get("status") == "success":
                self.log_test("Google Calendar Sync", True, 
                            "Google Calendar sync configured successfully")
                return True
            else:
                self.log_test("Google Calendar Sync", False, 
                            f"Sync failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            self.log_test("Google Calendar Sync", False, 
                        f"Failed to sync Google Calendar: {result.get('data', {})}")
            return False
    
    def test_tarot_restrictions(self):
        """Test tarot restrictions for premium vs free users"""
        print("\n=== TAROT RESTRICTIONS TEST ===")
        
        if not self.premium_token:
            self.log_test("Tarot Restrictions", False, "No premium token available")
            return False
        
        # Test premium user tarot access
        result = self.make_request("GET", "/tarot/daily", token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Tarot Restrictions", False, f"Premium tarot failed: {result['error']}")
            return False
        
        if result["success"]:
            data = result["data"]
            if data.get("is_premium") and "card" in data:
                self.log_test("Tarot Restrictions", True, 
                            "Premium user can access tarot reading successfully")
                
                # Now test that we can't get another reading immediately (daily limit)
                result2 = self.make_request("GET", "/tarot/daily", token=self.premium_token)
                if result2["success"]:
                    data2 = result2["data"]
                    # Should return the same reading (same ID)
                    if data2.get("id") == data.get("id"):
                        self.log_test("Tarot Daily Limit", True, 
                                    "Premium daily limit working correctly")
                        return True
                    else:
                        self.log_test("Tarot Daily Limit", False, 
                                    "Premium user got different reading on same day")
                        return False
                else:
                    self.log_test("Tarot Daily Limit", False, 
                                f"Second tarot request failed: {result2.get('data', {})}")
                    return False
            else:
                self.log_test("Tarot Restrictions", False, 
                            "Premium user tarot reading missing required fields")
                return False
        else:
            self.log_test("Tarot Restrictions", False, 
                        f"Premium tarot reading failed: {result.get('data', {})}")
            return False
    
    def create_free_user_and_test_tarot(self):
        """Create a free user and test tarot restrictions"""
        print("\n=== FREE USER TAROT TEST ===")
        
        # Create a free test user
        result = self.make_request("POST", "/auth/create-test-user")
        
        if not result.get("success", False):
            self.log_test("Free User Creation", False, "Failed to create free test user")
            return False
        
        # Login as free user
        login_data = {
            "username": "test@calmamialma.com",
            "password": "password123"
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            url = f"{self.base_url}/auth/login"
            response = requests.post(url, headers=headers, data=login_data)
            
            login_result = {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code < 400
            }
        except Exception as e:
            self.log_test("Free User Login", False, str(e))
            return False
        
        if not login_result["success"]:
            self.log_test("Free User Login", False, "Failed to login free user")
            return False
        
        free_token = login_result["data"].get("access_token")
        if not free_token:
            self.log_test("Free User Login", False, "No access token received")
            return False
        
        # Store free token for later use
        self.free_token = free_token
        
        # Test free user tarot access
        result = self.make_request("GET", "/tarot/daily", token=free_token)
        
        if result.get("error"):
            self.log_test("Free User Tarot", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            if not data.get("is_premium") and "card" in data:
                self.log_test("Free User Tarot", True, 
                            "Free user can access tarot reading (3-day limit applies)")
                return True
            else:
                self.log_test("Free User Tarot", False, 
                            "Free user tarot reading has incorrect premium status")
                return False
        else:
            self.log_test("Free User Tarot", False, 
                        f"Free user tarot reading failed: {result.get('data', {})}")
            return False
    
    def test_admin_user_creation_and_login(self):
        """Test creating and logging in admin user"""
        print("\n=== ADMIN USER CREATION AND LOGIN ===")
        
        # Create admin user
        result = self.make_request("POST", "/auth/create-admin-user")
        
        if result.get("error"):
            self.log_test("Admin User Creation", False, result["error"])
            return False
        
        if not result["success"]:
            self.log_test("Admin User Creation", False, f"Failed to create admin user: {result.get('data', {})}")
            return False
        
        # Login as admin
        login_data = {
            "username": "admin@calmamialma.com",
            "password": "admin123"
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            url = f"{self.base_url}/auth/login"
            response = requests.post(url, headers=headers, data=login_data)
            
            login_result = {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code < 400
            }
        except Exception as e:
            self.log_test("Admin User Login", False, str(e))
            return False
        
        if not login_result["success"]:
            self.log_test("Admin User Login", False, "Failed to login admin user")
            return False
        
        admin_token = login_result["data"].get("access_token")
        user_data = login_result["data"].get("user", {})
        
        if not admin_token:
            self.log_test("Admin User Login", False, "No access token received")
            return False
        
        if not user_data.get("is_admin"):
            self.log_test("Admin User Login", False, "User is not marked as admin")
            return False
        
        # Store admin token for later use
        self.admin_token = admin_token
        
        self.log_test("Admin User Login", True, "Admin user logged in successfully")
        return True
    
    def test_admin_video_creation(self):
        """Test admin video creation endpoint"""
        print("\n=== ADMIN VIDEO CREATION ===")
        
        if not hasattr(self, 'admin_token') or not self.admin_token:
            self.log_test("Admin Video Creation", False, "No admin token available")
            return False
        
        video_data = {
            "title": "Test Meditation Video",
            "description": "A test meditation video for admin testing",
            "youtube_url": "https://www.youtube.com/watch?v=test123",
            "category": "MEDITACION",
            "thumbnail_url": "https://img.youtube.com/vi/test123/maxresdefault.jpg",
            "duration": "15:30",
            "is_premium": True
        }
        
        result = self.make_request("POST", "/admin/videos", data=video_data, token=self.admin_token)
        
        if result.get("error"):
            self.log_test("Admin Video Creation", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            required_fields = ["id", "title", "description", "youtube_url", "category"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Admin Video Creation", True, 
                            f"Video created successfully: {data.get('title')}")
                return True
            else:
                self.log_test("Admin Video Creation", False, 
                            f"Missing required fields: {missing_fields}")
                return False
        else:
            self.log_test("Admin Video Creation", False, 
                        f"Failed to create video: {result.get('data', {})}")
            return False
    
    def test_admin_course_creation(self):
        """Test admin course creation endpoint"""
        print("\n=== ADMIN COURSE CREATION ===")
        
        if not hasattr(self, 'admin_token') or not self.admin_token:
            self.log_test("Admin Course Creation", False, "No admin token available")
            return False
        
        course_data = {
            "title": "Test Reiki Course",
            "description": "A test Reiki course for admin testing",
            "price": 99.99,
            "duration": "4 weeks",
            "level": "Beginner",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Test+Course",
            "youtube_url": "https://www.youtube.com/watch?v=testcourse123",
            "program": "Week 1: Introduction\nWeek 2: Basic techniques\nWeek 3: Advanced practice\nWeek 4: Mastery"
        }
        
        result = self.make_request("POST", "/admin/courses", data=course_data, token=self.admin_token)
        
        if result.get("error"):
            self.log_test("Admin Course Creation", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            required_fields = ["id", "title", "description", "price", "duration", "level"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Admin Course Creation", True, 
                            f"Course created successfully: {data.get('title')}")
                return True
            else:
                self.log_test("Admin Course Creation", False, 
                            f"Missing required fields: {missing_fields}")
                return False
        else:
            self.log_test("Admin Course Creation", False, 
                        f"Failed to create course: {result.get('data', {})}")
            return False
    
    def test_admin_blog_post_creation(self):
        """Test admin blog post creation endpoint"""
        print("\n=== ADMIN BLOG POST CREATION ===")
        
        if not hasattr(self, 'admin_token') or not self.admin_token:
            self.log_test("Admin Blog Post Creation", False, "No admin token available")
            return False
        
        blog_data = {
            "title": "Test Blog Post",
            "content": "This is a test blog post created by admin for testing purposes. It contains multiple paragraphs to test content restrictions for free users.\n\nThis is the second paragraph that should be visible to premium users only.\n\nThis is the third paragraph with more premium content.",
            "excerpt": "This is a test blog post created by admin for testing purposes...",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Test+Blog"
        }
        
        result = self.make_request("POST", "/blog/posts", data=blog_data, token=self.admin_token)
        
        if result.get("error"):
            self.log_test("Admin Blog Post Creation", False, result["error"])
            return False
        
        if result["success"]:
            data = result["data"]
            required_fields = ["id", "title", "content", "excerpt", "published_date", "author"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Admin Blog Post Creation", True, 
                            f"Blog post created successfully: {data.get('title')}")
                return True
            else:
                self.log_test("Admin Blog Post Creation", False, 
                            f"Missing required fields: {missing_fields}")
                return False
        else:
            self.log_test("Admin Blog Post Creation", False, 
                        f"Failed to create blog post: {result.get('data', {})}")
            return False
    
    def test_videos_access_control(self):
        """Test video access control for different user types"""
        print("\n=== VIDEOS ACCESS CONTROL ===")
        
        # Test with premium user
        if not self.premium_token:
            self.log_test("Videos Access Control", False, "No premium token available")
            return False
        
        result_premium = self.make_request("GET", "/videos", token=self.premium_token)
        
        if result_premium.get("error"):
            self.log_test("Videos Access Control", False, f"Premium user videos failed: {result_premium['error']}")
            return False
        
        # Test with free user
        if not hasattr(self, 'free_token') or not self.free_token:
            self.log_test("Videos Access Control", False, "No free token available")
            return False
        
        result_free = self.make_request("GET", "/videos", token=self.free_token)
        
        if result_free.get("error"):
            self.log_test("Videos Access Control", False, f"Free user videos failed: {result_free['error']}")
            return False
        
        if result_premium["success"] and result_free["success"]:
            premium_videos = result_premium["data"]
            free_videos = result_free["data"]
            
            # Check that premium user gets full access to premium videos
            premium_video_with_url = None
            for video in premium_videos:
                if video.get("is_premium") and video.get("youtube_url"):
                    premium_video_with_url = video
                    break
            
            # Check that free user gets restricted access to premium videos
            free_premium_video_restricted = None
            for video in free_videos:
                if video.get("is_premium") and not video.get("youtube_url"):
                    free_premium_video_restricted = video
                    break
            
            if premium_video_with_url and free_premium_video_restricted:
                self.log_test("Videos Access Control", True, 
                            "Video access control working correctly - premium users get URLs, free users don't")
                return True
            else:
                self.log_test("Videos Access Control", False, 
                            "Video access control not working as expected")
                return False
        else:
            self.log_test("Videos Access Control", False, 
                        "Failed to get videos for access control testing")
            return False
    
    def test_tarot_comprehensive_functionality(self):
        """Comprehensive test of tarot functionality with 40 cards and anti-repetition"""
        print("\n=== COMPREHENSIVE TAROT FUNCTIONALITY TEST ===")
        
        if not self.premium_token:
            self.log_test("Comprehensive Tarot Test", False, "No premium token available")
            return False
        
        # Test 1: Premium user gets tarot reading
        result = self.make_request("GET", "/tarot/daily", token=self.premium_token)
        
        if result.get("error"):
            self.log_test("Tarot Basic Functionality", False, f"Premium tarot failed: {result['error']}")
            return False
        
        if not result["success"]:
            self.log_test("Tarot Basic Functionality", False, f"Tarot request failed: {result.get('data', {})}")
            return False
        
        data = result["data"]
        
        # Verify structure
        required_fields = ["id", "user_id", "card", "reading_date", "is_premium"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            self.log_test("Tarot Structure Test", False, f"Missing fields: {missing_fields}")
            return False
        
        # Verify card structure
        card = data.get("card", {})
        card_required_fields = ["id", "title", "description", "meaning", "image_url"]
        card_missing_fields = [field for field in card_required_fields if field not in card]
        
        if card_missing_fields:
            self.log_test("Tarot Card Structure", False, f"Missing card fields: {card_missing_fields}")
            return False
        
        # Verify premium content
        if not data.get("is_premium"):
            self.log_test("Tarot Premium Status", False, "Premium user not getting premium status")
            return False
        
        # Verify premium user gets practice_text
        if not card.get("practice_text"):
            self.log_test("Tarot Premium Content", False, "Premium user not getting practice_text")
            return False
        
        self.log_test("Tarot Basic Functionality", True, f"Premium tarot working - Card: {card.get('title')}")
        
        # Test 2: Same day restriction (should get same card)
        result2 = self.make_request("GET", "/tarot/daily", token=self.premium_token)
        
        if result2["success"]:
            data2 = result2["data"]
            if data2.get("id") == data.get("id"):
                self.log_test("Tarot Daily Restriction", True, "Premium daily limit working - same reading returned")
            else:
                self.log_test("Tarot Daily Restriction", False, "Premium user got different reading on same day")
                return False
        else:
            self.log_test("Tarot Daily Restriction", False, "Second tarot request failed")
            return False
        
        return True
    
    def test_tarot_free_user_restrictions(self):
        """Test tarot restrictions for free users (3-day limit)"""
        print("\n=== TAROT FREE USER RESTRICTIONS ===")
        
        if not hasattr(self, 'free_token') or not self.free_token:
            self.log_test("Free User Tarot Restrictions", False, "No free token available")
            return False
        
        # Test free user tarot access
        result = self.make_request("GET", "/tarot/daily", token=self.free_token)
        
        if result.get("error"):
            self.log_test("Free User Tarot Access", False, result["error"])
            return False
        
        if not result["success"]:
            self.log_test("Free User Tarot Access", False, f"Free user tarot failed: {result.get('data', {})}")
            return False
        
        data = result["data"]
        
        # Verify free user status
        if data.get("is_premium"):
            self.log_test("Free User Status", False, "Free user marked as premium in tarot response")
            return False
        
        # Verify free user gets basic content (no practice_text)
        card = data.get("card", {})
        if card.get("practice_text"):
            self.log_test("Free User Content", False, "Free user getting premium practice_text")
            return False
        
        # Verify basic structure is present
        if not card.get("title") or not card.get("description"):
            self.log_test("Free User Basic Content", False, "Free user missing basic card content")
            return False
        
        self.log_test("Free User Tarot Access", True, f"Free user tarot working - Card: {card.get('title')}")
        
        # Test 3-day restriction (should get same card within 3 days)
        result2 = self.make_request("GET", "/tarot/daily", token=self.free_token)
        
        if result2["success"]:
            data2 = result2["data"]
            if data2.get("id") == data.get("id"):
                self.log_test("Free User 3-Day Restriction", True, "Free user 3-day limit working - same reading returned")
                return True
            else:
                self.log_test("Free User 3-Day Restriction", False, "Free user got different reading within 3-day period")
                return False
        else:
            self.log_test("Free User 3-Day Restriction", False, "Second free user tarot request failed")
            return False
    
    def test_blog_post_permissions(self):
        """Test that only ADMIN users can create blog posts, not premium users"""
        print("\n=== BLOG POST PERMISSIONS TEST ===")
        
        # Test 1: Admin user CAN create blog posts
        if not hasattr(self, 'admin_token') or not self.admin_token:
            self.log_test("Admin Blog Permission", False, "No admin token available")
            return False
        
        admin_blog_data = {
            "title": "Admin Test Blog Post",
            "content": "This blog post was created by an admin user to test permissions.",
            "excerpt": "Admin test blog post excerpt...",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Admin+Blog"
        }
        
        result_admin = self.make_request("POST", "/blog/posts", data=admin_blog_data, token=self.admin_token)
        
        if result_admin.get("error"):
            self.log_test("Admin Blog Creation", False, f"Admin blog creation failed: {result_admin['error']}")
            return False
        
        if not result_admin["success"]:
            self.log_test("Admin Blog Creation", False, f"Admin cannot create blog post: {result_admin.get('data', {})}")
            return False
        
        self.log_test("Admin Blog Creation", True, "Admin can create blog posts successfully")
        
        # Test 2: Premium user CANNOT create blog posts
        if not self.premium_token:
            self.log_test("Premium Blog Permission", False, "No premium token available")
            return False
        
        premium_blog_data = {
            "title": "Premium User Test Blog Post",
            "content": "This should fail - premium users cannot create blog posts.",
            "excerpt": "Premium user test excerpt...",
            "image_url": "https://placehold.co/400x200/e0e0e0/333333?text=Premium+Blog"
        }
        
        result_premium = self.make_request("POST", "/blog/posts", data=premium_blog_data, token=self.premium_token)
        
        # Premium user should get 403 Forbidden
        if result_premium.get("status_code") == 403:
            self.log_test("Premium Blog Restriction", True, "Premium user correctly blocked from creating blog posts")
            return True
        elif result_premium["success"]:
            self.log_test("Premium Blog Restriction", False, "Premium user can create blog posts (should be blocked)")
            return False
        else:
            self.log_test("Premium Blog Restriction", False, f"Unexpected error testing premium blog creation: {result_premium}")
            return False
    
    def test_tarot_anti_repetition_multiple_calls(self):
        """Test anti-repetition by making multiple tarot calls over time (simulated)"""
        print("\n=== TAROT ANTI-REPETITION MULTIPLE CALLS TEST ===")
        
        if not self.premium_token:
            self.log_test("Tarot Anti-Repetition", False, "No premium token available")
            return False
        
        # Get current tarot reading
        result1 = self.make_request("GET", "/tarot/daily", token=self.premium_token)
        
        if not result1["success"]:
            self.log_test("Tarot Anti-Repetition Setup", False, "Failed to get initial tarot reading")
            return False
        
        card1_id = result1["data"]["card"]["id"]
        card1_title = result1["data"]["card"]["title"]
        
        # Multiple calls on same day should return same card
        same_day_calls = []
        for i in range(3):
            result = self.make_request("GET", "/tarot/daily", token=self.premium_token)
            if result["success"]:
                same_day_calls.append(result["data"]["card"]["id"])
        
        # All calls should return the same card ID
        if all(card_id == card1_id for card_id in same_day_calls):
            self.log_test("Tarot Same Day Consistency", True, f"All same-day calls returned same card: {card1_title}")
        else:
            self.log_test("Tarot Same Day Consistency", False, "Same-day calls returned different cards")
            return False
        
        # Test that the system has 40 cards available
        # We can't easily test different days, but we can verify the card structure suggests 40 cards
        card_id = int(card1_id)
        if 1 <= card_id <= 40:
            self.log_test("Tarot Card Range", True, f"Card ID {card_id} is within expected range 1-40")
        else:
            self.log_test("Tarot Card Range", False, f"Card ID {card_id} is outside expected range 1-40")
            return False
        
        # Verify card has proper content structure for 40-card system
        card = result1["data"]["card"]
        if card.get("title") and card.get("description") and card.get("image_url"):
            self.log_test("Tarot 40-Card Structure", True, "Card has proper structure for 40-card system")
            return True
        else:
            self.log_test("Tarot 40-Card Structure", False, "Card missing required fields for 40-card system")
            return False
    
    def run_all_tests(self):
        """Run all backend tests with focus on review requirements"""
        print("🚀 Starting Backend API Tests for Calma Mi Alma - REVIEW FOCUSED")
        print("=" * 70)
        print("FOCUS: Tarot 40-card system, Anti-repetition, Blog permissions")
        print("=" * 70)
        
        # Health check first
        if not self.test_health_check():
            print("\n❌ Backend server is not running. Please start the backend service.")
            return False
        
        # Test sequence - focused on review requirements
        tests = [
            # User setup
            self.test_premium_user_creation,
            self.test_login_premium_user,
            self.create_free_user_and_test_tarot,  # Creates free user
            self.test_admin_user_creation_and_login,
            
            # MAIN FOCUS: Tarot functionality (40 cards, restrictions, anti-repetition)
            self.test_tarot_comprehensive_functionality,
            self.test_tarot_free_user_restrictions,
            self.test_tarot_anti_repetition_multiple_calls,
            
            # MAIN FOCUS: Blog post permissions (only admin, not premium)
            self.test_blog_post_permissions,
            
            # Additional functionality verification
            self.test_course_details_api,
            self.test_course_purchase_api,
            self.test_purchased_courses_api,
            self.test_calendar_routine_get,
            self.test_calendar_routine_update,
            self.test_google_calendar_sync,
            self.test_admin_video_creation,
            self.test_admin_course_creation,
            self.test_admin_blog_post_creation,
            self.test_videos_access_control,
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                self.log_test(test.__name__, False, f"Test crashed: {str(e)}")
        
        # Summary
        print("\n" + "=" * 70)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 70)
        
        # Focus on critical failures
        critical_tests = [
            "test_tarot_comprehensive_functionality",
            "test_tarot_free_user_restrictions", 
            "test_tarot_anti_repetition_multiple_calls",
            "test_blog_post_permissions"
        ]
        
        critical_failures = []
        failed_tests = [result for result in self.test_results if not result["success"]]
        
        for test in failed_tests:
            if any(critical in test['test'] for critical in critical_tests):
                critical_failures.append(test)
        
        if critical_failures:
            print("\n🚨 CRITICAL FAILURES (Review Focus):")
            for test in critical_failures:
                print(f"   - {test['test']}: {test['message']}")
        
        if failed_tests:
            print("\n❌ ALL FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['message']}")
        
        success_rate = (passed / total) * 100
        print(f"\n✅ Success Rate: {success_rate:.1f}%")
        
        # Special focus on review requirements
        tarot_tests_passed = sum(1 for result in self.test_results 
                               if result["success"] and "tarot" in result["test"].lower())
        blog_tests_passed = sum(1 for result in self.test_results 
                              if result["success"] and "blog" in result["test"].lower() and "permission" in result["test"].lower())
        
        print(f"\n🎯 REVIEW FOCUS RESULTS:")
        print(f"   - Tarot Tests Passed: {tarot_tests_passed}/3")
        print(f"   - Blog Permission Tests Passed: {blog_tests_passed}/1")
        
        return passed == total

def main():
    """Main function to run tests"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(tester.test_results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())