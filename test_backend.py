#!/usr/bin/env python3
"""
Test script to verify the backend is working properly.
Run this script to test all endpoints before starting the frontend.
"""

import requests
import json
import sys
from time import sleep

BASE_URL = "http://localhost:8000"

def test_endpoint(name, endpoint, method="GET", data=None, headers=None):
    """Test a single endpoint."""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            print(f"  ❌ {name}: Unsupported method {method}")
            return False
        
        if response.status_code >= 200 and response.status_code < 300:
            print(f"  ✅ {name}: {response.status_code}")
            return True
        else:
            print(f"  ❌ {name}: {response.status_code} - {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  ❌ {name}: Error - {str(e)}")
        return False

def main():
    print("🚀 Testing College Portal Backend...")
    print(f"📍 Base URL: {BASE_URL}")
    print()
    
    # Wait for server to start
    print("⏳ Waiting for server to start...")
    for i in range(10):
        try:
            requests.get(f"{BASE_URL}/health", timeout=1)
            print("✅ Server is running!")
            break
        except:
            if i == 9:
                print("❌ Server failed to start. Please start the backend first.")
                print(f"   Run: cd mac-backend && python server.py")
                sys.exit(1)
            sleep(1)
    
    print()
    print("🧪 Testing endpoints...")
    print()
    
    results = []
    
    # Test health endpoint
    print("🏥 Health Check:")
    results.append(test_endpoint("Health check", "/health"))
    print()
    
    # Test demo auth
    print("🔐 Authentication:")
    auth_response = requests.post(
        f"{BASE_URL}/auth/demo",
        json={"email": "test@vit.ac.in", "name": "Test User"},
        timeout=10
    )
    if auth_response.status_code == 200:
        auth_data = auth_response.json()
        token = auth_data.get("access_token")
        print(f"  ✅ Demo auth: 200")
        print(f"  🔑 Token received: {token[:20]}...")
        headers = {"Authorization": f"Bearer {token}"}
        results.append(True)
        
        # Test authenticated endpoints
        print()
        print("🔒 Authenticated Endpoints:")
        
        # Test voice command
        results.append(test_endpoint("Voice command", "/agent/voice/command", "POST", 
                                     {"text": "show me my attendance"}, headers))
        
        # Test chat homework
        results.append(test_endpoint("Chat homework", "/agent/chat/homework", "POST",
                                     {"message": "What is a binary tree?", "topic": "General"}, headers))
        
        # Test MVP endpoints
        results.append(test_endpoint("MVP Dashboard", "/mvp/dashboard", "GET", None, headers))
        results.append(test_endpoint("MVP Schedule", "/mvp/schedule", "GET", None, headers))
        results.append(test_endpoint("MVP Assignments", "/mvp/assignments", "GET", None, headers))
        results.append(test_endpoint("MVP Placement", "/mvp/placement", "GET", None, headers))
        results.append(test_endpoint("MVP Travel", "/mvp/travel", "GET", None, headers))
        
        # Test agent endpoints
        results.append(test_endpoint("Attendance stats", "/agent/attendance/stats", "GET", None, headers))
        results.append(test_endpoint("Finance insights", "/agent/finance/insights", "GET", None, headers))
        results.append(test_endpoint("Jobs recommend", "/agent/jobs/recommend", "GET", None, headers))
        
        # Test user profile
        results.append(test_endpoint("User profile", "/user/profile", "GET", None, headers))
        
    else:
        print(f"  ❌ Demo auth: {auth_response.status_code}")
        results.append(False)
    
    print()
    print("📊 Test Summary:")
    passed = sum(results)
    total = len(results)
    print(f"  Passed: {passed}/{total}")
    
    if passed === total:
        print()
        print("🎉 All tests passed! The backend is working correctly.")
        print()
        print("💡 To start the frontend:")
        print("   npm run dev")
        print()
        print("💡 The app will automatically use demo authentication.")
        return 0
    else:
        print()
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())