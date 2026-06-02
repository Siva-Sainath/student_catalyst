#!/bin/bash

# ============================================
# Hermes Agent Setup Script for M3 MacBook Air
# This script will:
# 1. Install Ollama (if not already installed)
# 2. Pull all required models (Hermes, DeepSeek, Llama, Mistral)
# 3. Verify installation
# 4. Start Ollama server
# ============================================

set -e

echo "=========================================="
echo "  Hermes Agent Setup for M3 MacBook Air"
echo "=========================================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script is designed for macOS only"
    exit 1
fi

# Check for Apple Silicon (M1/M2/M3)
if [[ $(uname -m) != "arm64" ]]; then
    echo "⚠️  Warning: This script is optimized for Apple Silicon (M1/M2/M3)"
    echo "   Your architecture: $(uname -m)"
    read -p "   Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Detected macOS on Apple Silicon"
echo ""

# Step 1: Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "📥 Step 1: Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✅ Ollama installed successfully"
    echo ""
else
    echo "✅ Ollama is already installed"
    echo ""
fi

# Step 2: Start Ollama server in background
if ! pgrep -x "ollama" > /dev/null; then
    echo "🚀 Step 2: Starting Ollama server..."
    ollama serve &
    sleep 3
    if pgrep -x "ollama" > /dev/null; then
        echo "✅ Ollama server is running (PID: $(pgrep -x ollama))"
    else
        echo "❌ Failed to start Ollama server"
        exit 1
    fi
    echo ""
else
    echo "✅ Ollama server is already running (PID: $(pgrep -x ollama))"
    echo ""
fi

# Step 3: Pull Hermes model
if ollama list | grep -q "hermes"; then
    echo "✅ Hermes model is already downloaded"
else
    echo "📥 Step 3: Downloading Hermes model (nousresearch/hermes-2-pro-mistral:7b)..."
    echo "   This may take several minutes depending on your internet speed..."
    ollama pull nousresearch/hermes-2-pro-mistral:7b
    echo "✅ Hermes model downloaded successfully"
    echo ""
fi

# Step 4: Pull DeepSeek model
if ollama list | grep -q "deepseek"; then
    echo "✅ DeepSeek model is already downloaded"
else
    echo "📥 Step 4: Downloading DeepSeek model (deepseek-coder:7b-instruct-q4_K_M)..."
    ollama pull deepseek-coder:7b-instruct-q4_K_M
    echo "✅ DeepSeek model downloaded successfully"
    echo ""
fi

# Step 5: Pull Llama model
if ollama list | grep -q "llama3"; then
    echo "✅ Llama model is already downloaded"
else
    echo "📥 Step 5: Downloading Llama model (llama3.1:8b-instruct-q4_K_M)..."
    ollama pull llama3.1:8b-instruct-q4_K_M
    echo "✅ Llama model downloaded successfully"
    echo ""
fi

# Step 6: Pull Mistral model
if ollama list | grep -q "mistral"; then
    echo "✅ Mistral model is already downloaded"
else
    echo "📥 Step 6: Downloading Mistral model (mistral:7b-instruct-q4_K_M)..."
    ollama pull mistral:7b-instruct-q4_K_M
    echo "✅ Mistral model downloaded successfully"
    echo ""
fi

# Step 7: Verify all models
echo "🔍 Step 7: Verifying all models..."
ollama list
echo ""

# Step 8: Test Hermes
echo "🧪 Step 8: Testing Hermes model..."
TEST_OUTPUT=$(ollama run nousresearch/hermes-2-pro-mistral:7b "What is 2+2?" 2>&1 || true)
if echo "$TEST_OUTPUT" | grep -q "4"; then
    echo "✅ Hermes is working correctly!"
else
    echo "⚠️  Hermes test output: $TEST_OUTPUT"
    echo "   Hermes may need more time to load..."
fi
echo ""

# Step 9: Create a test script
echo "📝 Step 9: Creating test script..."
cat > test_hermes.py << 'EOF'
#!/usr/bin/env python3
"""
Test script to verify Hermes agent is working
"""
import requests
import json
import time

def test_ollama():
    """Test Ollama server"""
    try:
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code == 200:
            models = response.json().get("models", [])
            print("✅ Ollama server is running")
            print(f"   Available models: {[m['name'] for m in models]}")
            return True
        else:
            print(f"❌ Ollama server error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        return False

def test_hermes():
    """Test Hermes model specifically"""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "nousresearch/hermes-2-pro-mistral:7b",
                "prompt": "What is the capital of France?",
                "stream": False
            },
            timeout=30
        )
        if response.status_code == 200:
            result = response.json()
            print("✅ Hermes model is responding")
            print(f"   Response: {result.get('response', '')[:100]}...")
            return True
        else:
            print(f"❌ Hermes error: {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Hermes test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Hermes Agent Setup...")
    print("=" * 50)
    
    if test_ollama():
        test_hermes()
    
    print("=" * 50)
    print("\n✅ Setup complete! Run the following to start your app:")
    print("\n   Terminal 1 (Ollama): ollama serve")
    print("   Terminal 2 (Backend): cd mac-backend && python server.py")
    print("   Terminal 3 (Frontend): npm run dev")
EOF

chmod +x test_hermes.py
echo "✅ Test script created"
echo ""

# Final summary
echo "=========================================="
echo "  ✅ Hermes Agent Setup Complete!"
echo "=========================================="
echo ""
echo "All models downloaded:"
echo "  • Hermes (nousresearch/hermes-2-pro-mistral:7b)"
echo "  • DeepSeek (deepseek-coder:7b-instruct-q4_K_M)"
echo "  • Llama (llama3.1:8b-instruct-q4_K_M)"
echo "  • Mistral (mistral:7b-instruct-q4_K_M)"
echo ""
echo "Ollama server is running on: http://localhost:11434"
echo ""
echo "To start your application:"
echo ""
echo "  Terminal 1 (Ollama - already running):"
echo "    ollama serve"
echo ""
echo "  Terminal 2 (Backend):"
echo "    cd mac-backend"
echo "    python server.py"
echo ""
echo "  Terminal 3 (Frontend):"
echo "    npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo "To test Hermes:"
echo "  python test_hermes.py"
echo ""
echo "=========================================="
