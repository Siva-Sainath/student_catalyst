# Quick Start: Hermes Agent on M3 MacBook Air

## 🚀 One-Command Setup

Run this single command to install everything:

```bash
chmod +x setup_hermes.sh && ./setup_hermes.sh
```

This will:
1. Install Ollama (if not already installed)
2. Download all 4 models (Hermes, DeepSeek, Llama, Mistral)
3. Start Ollama server
4. Verify everything is working

**Estimated time:** 10-30 minutes (depending on download speed)

---

## 📋 Manual Setup (Step by Step)

### Step 1: Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Pull Hermes Model

```bash
ollama pull nousresearch/hermes-2-pro-mistral:7b
```

**Size:** ~4.7GB (4-bit quantized)
**Time:** 5-15 minutes depending on internet speed

### Step 3: Pull Other Models (Optional but Recommended)

```bash
# For coding help
ollama pull deepseek-coder:7b-instruct-q4_K_M

# For general chat
ollama pull llama3.1:8b-instruct-q4_K_M

# For fast responses
ollama pull mistral:7b-instruct-q4_K_M
```

### Step 4: Start Ollama Server

```bash
ollama serve
```

Keep this running in a terminal. It serves on `http://localhost:11434`

### Step 5: Verify Models

```bash
ollama list
```

You should see:
```
NAME                                    ID              SIZE    MODIFIED
nousresearch/hermes-2-pro-mistral:7b   abc123...       4.7GB   2 hours ago
deepseek-coder:7b-instruct-q4_K_M      def456...       4.1GB   2 hours ago
llama3.1:8b-instruct-q4_K_M             ghi789...       4.7GB   2 hours ago
mistral:7b-instruct-q4_K_M              jkl012...       4.1GB   2 hours ago
```

### Step 6: Test Hermes

```bash
ollama run nousresearch/hermes-2-pro-mistral:7b "What is the capital of France?"
```

Expected output:
```
The capital of France is Paris.
```

---

## 🏃 Running the Full Application

### Terminal 1: Ollama Server
```bash
ollama serve
```

### Terminal 2: Backend Server
```bash
cd mac-backend
python server.py
```

Backend will be available at: `http://localhost:8000`

### Terminal 3: Frontend
```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### Terminal 4: Test (Optional)
```bash
python test_hermes.py
```

---

## 🎯 Using Hermes in the App

Once everything is running:

1. Open `http://localhost:5173` in your browser
2. Click the **Chat** tab
3. Click the **Microphone** button and say:
   - "Find me job openings for software engineering"
   - "What's my bunk budget this week?"
   - "Help me write a resume"
   - "Explain quantum computing"

Hermes will automatically be selected for:
- Job search queries
- Research questions
- Complex queries requiring reasoning
- Multi-step questions

---

## ⚡ M3-Specific Optimizations

Your `.env` file is already configured with:

```bash
# Metal acceleration (Apple Silicon GPU)
OLLAMA_METAL=1

# 4-bit quantization (50% less memory)
OLLAMA_QUANTIZATION=q4_K_M

# 4096 token context window
OLLAMA_CONTEXT_WINDOW=4096

# Hermes model optimized for M3
HERMES_MODEL=nousresearch/hermes-2-pro-mistral:7b
```

These settings ensure:
- ✅ GPU acceleration via Metal
- ✅ Reduced memory usage (models fit in 16GB RAM)
- ✅ Fast inference speeds
- ✅ Long conversation context

---

## 🔍 Troubleshooting

### Problem: Ollama not installing
**Solution:** Make sure you have Homebrew installed, then try again.

### Problem: Model download stuck
**Solution:** Check your internet connection. Models are large (4-5GB each).

### Problem: Out of memory
**Solution:** Close other applications. Each model uses ~4-5GB RAM when loaded.

### Problem: Ollama server not starting
**Solution:** Run `ollama serve` manually and check for errors.

### Problem: Backend can't connect to Ollama
**Solution:** Make sure Ollama is running (`pgrep -x ollama` should show a PID).

### Problem: Hermes not responding
**Solution:** Wait 1-2 minutes after starting Ollama. Models load on first use.

---

## 📊 Model Specifications

| Model | Size | Best For | RAM Usage |
|-------|------|----------|-----------|
| Hermes | 4.7GB | Research, Jobs | ~5GB |
| DeepSeek | 4.1GB | Coding | ~4.5GB |
| Llama | 4.7GB | General Chat | ~5GB |
| Mistral | 4.1GB | Fast Responses | ~4.5GB |

**Total disk space needed:** ~17.6GB
**RAM needed (one model at a time):** ~5GB

---

## 🎉 Success Checklist

- [ ] Ollama installed (`ollama --version`)
- [ ] Hermes model downloaded (`ollama list`)
- [ ] Ollama server running (`curl http://localhost:11434/api/tags`)
- [ ] Backend running (`curl http://localhost:8000/health`)
- [ ] Frontend running (`curl http://localhost:5173`)
- [ ] Hermes responding in chat

---

## 📞 Need Help?

Run the test script:
```bash
python test_hermes.py
```

This will check all components and tell you what's working.

Or check the logs:
- Ollama logs: `~/.ollama/logs/`
- Backend logs: Terminal where you ran `python server.py`
- Frontend logs: Terminal where you ran `npm run dev`
