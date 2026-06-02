# Running the College Portal App

This guide will help you get the app running with all features working, including voice commands and chat.

## 🚀 Quick Start

### 1. Start the Backend Server

Open a terminal and navigate to the `mac-backend` directory:

```bash
cd mac-backend
```

Install Python dependencies (if not already installed):

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python server.py
```

The server will start on `http://localhost:8000`. You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Start the Frontend

Open a new terminal and navigate to the project root:

```bash
npm install
npm run dev
```

The frontend will start on `http://localhost:5173` (or similar port).

### 3. Test the App

Open your browser to `http://localhost:5173` and you should see the app working!

## 🔧 Configuration

### Environment Variables

#### Frontend (in `.env.local` or `index.html`):
```env
VITE_MAC_SERVER_URL=http://localhost:8000
```

#### Backend (in `mac-backend/.env`):
```env
MAC_SERVER_HOST=0.0.0.0
MAC_SERVER_PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
JWT_SECRET=your-secret-key-here
LOCAL_MODEL_ENDPOINT=http://localhost:11434
LOCAL_MODEL_NAME=deepseek-coder:7b-instruct-q4_K_M
```

### Without Local LLM Model

The app will work **without** a local LLM model! It has fallback responses for:
- Chat responses
- Voice commands
- All AI features

If you want to use a local model, install Ollama and run:
```bash
ollama pull deepseek-coder:7b-instruct-q4_K_M
ollama serve
```

## ✅ Features Working

### ✅ Voice Commands
- Click the microphone button and speak
- Try commands like:
  - "Show me my attendance"
  - "Open schedule"
  - "Show jobs"
  - "What is my bunk budget?"
  - "Navigate to finance"
  - "Show me my assignments"

### ✅ Chat
- Type messages in the input box
- Get AI responses (fallback if no LLM)
- Streaming responses when LLM is available

### ✅ Navigation
- All pages work: Dashboard, Attendance, Chat, Schedule, Finance, Jobs, Travel, Placement, Assignments, More
- Voice commands can navigate between pages

### ✅ Demo Authentication
- Automatic login with demo user (Rahul Sharma)
- No OAuth required for development

## 🐛 Troubleshooting

### Microphone Not Working
1. Check browser permissions for microphone access
2. Make sure you're using HTTPS or localhost
3. Try Chrome or Edge (best support for speech recognition)
4. Check if another app is using the microphone

### Voice Commands Not Responding
1. Check if the backend is running: `http://localhost:8000/health`
2. Check the browser console for errors (F12)
3. Try typing the command instead

### Backend Connection Issues
1. Make sure the backend URL is correct in frontend config
2. Check CORS settings in backend
3. Try `http://localhost:8000/health` directly

### LLM Model Not Available
1. The app will use fallback responses
2. To enable LLM, install Ollama and pull the model
3. Or set `LOCAL_MODEL_ENDPOINT` to your model server

## 🧪 Testing

Run the test script to verify all endpoints:

```bash
python test_backend.py
```

This will test:
- Health check
- Authentication
- Voice commands
- Chat endpoints
- All MVP endpoints
- All agent endpoints

## 📱 Mobile Development

For mobile testing, update the API URL:

```env
VITE_MAC_SERVER_URL=http://YOUR_MAC_IP:8000
```

Replace `YOUR_MAC_IP` with your Mac's local IP address (e.g., `192.168.1.x`).

## 🎯 Voice Command Examples

| Command | Action |
|---------|--------|
| "Show attendance" | Opens attendance page |
| "Open schedule" | Opens schedule page |
| "Show me jobs" | Opens jobs page |
| "Finance dashboard" | Opens finance page |
| "My assignments" | Opens assignments page |
| "Travel routes" | Opens travel page |
| "Placement info" | Opens placement page |
| "Go to dashboard" | Opens dashboard |
| "What is a binary tree?" | Chat response |
| "Help me with homework" | Chat response |

## 🔄 Recent Fixes

1. ✅ Fixed API URL configuration (defaults to localhost)
2. ✅ Added demo authentication (no OAuth needed)
3. ✅ Added fallback responses when LLM is not available
4. ✅ Improved error handling and loading states
5. ✅ Fixed voice recognition with proper browser permissions
6. ✅ Added timeouts to prevent hanging requests
7. ✅ Improved voice command parsing
8. ✅ Added health check endpoint with LLM status
9. ✅ Added voice command feedback in UI
10. ✅ Fixed navigation for all voice commands

## 📝 Notes

- The app uses automatic demo authentication via `MvpService.ensureSession()`
- All pages are protected and require authentication
- Voice commands work even without LLM (using fallback parsing)
- Chat works with fallback responses when LLM is not available
- All backend endpoints are properly connected and tested
