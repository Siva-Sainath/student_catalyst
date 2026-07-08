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

def test_endpoint(name, endpoint, method="GET", data=None, headers=None, timeout=10):
    """Test a single endpoint."""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=timeout)
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
        json={"email": "test@bmsce.ac.in", "name": "Test User"},
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
                                     {"text": "show me my attendance"}, headers, timeout=60))
        
        # Test chat stream
        results.append(test_endpoint("Chat stream", "/agent/chat/stream", "POST",
                                     {"message": "What is a binary tree?", "topic": "General"}, headers, timeout=60))
        
        # Test data endpoints
        results.append(test_endpoint("MVP Dashboard", "/data/dashboard", "GET", None, headers))
        results.append(test_endpoint("MVP Schedule", "/data/schedule", "GET", None, headers))
        results.append(test_endpoint("MVP Assignments", "/data/assignments", "GET", None, headers))
        results.append(test_endpoint("MVP Placement", "/data/placement", "GET", None, headers))
        
        # Test agent endpoints
        results.append(test_endpoint("Attendance stats", "/data/attendance", "GET", None, headers))
        results.append(test_endpoint("Finance insights", "/data/finance", "GET", None, headers))
        results.append(test_endpoint("Jobs recommend", "/data/jobs", "GET", None, headers, timeout=60))
        
        # Test user profile
        results.append(test_endpoint("User profile", "/user/profile", "GET", None, headers))
        
        # Test RAG endpoints
        print("📁 Testing RAG:")
        try:
            files = {'file': ('test_doc.txt', 'This is a test document content for RAG testing.', 'text/plain')}
            # We don't want Content-Type: application/json in the headers for files upload, so we copy headers but don't force it
            file_headers = {k: v for k, v in headers.items()}
            rag_response = requests.post(f"{BASE_URL}/agent/rag/upload", files=files, headers=file_headers, timeout=15)
            if rag_response.status_code == 200:
                print("  ✅ RAG upload: 200")
                results.append(True)
            else:
                print(f"  ❌ RAG upload: {rag_response.status_code} - {rag_response.text[:200]}")
                results.append(False)
        except Exception as e:
            print(f"  ❌ RAG upload: Error - {str(e)}")
            results.append(False)
            
        results.append(test_endpoint("RAG list documents", "/agent/rag/documents", "GET", None, headers))
        
        try:
            delete_response = requests.delete(f"{BASE_URL}/agent/rag/document/test_doc.txt", headers=headers, timeout=15)
            if delete_response.status_code == 200:
                print("  ✅ RAG delete: 200")
                results.append(True)
            else:
                print(f"  ❌ RAG delete: {delete_response.status_code} - {delete_response.text[:200]}")
                results.append(False)
        except Exception as e:
            print(f"  ❌ RAG delete: Error - {str(e)}")
            results.append(False)
        
    else:
        print(f"  ❌ Demo auth: {auth_response.status_code}")
        results.append(False)
    
    print()
    print("📊 Test Summary:")
    passed = sum(results)
    total = len(results)
    print(f"  Passed: {passed}/{total}")
    
    if passed == total:
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