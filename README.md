# Student Catalyst

Student Catalyst is a personal AI-powered companion built for engineering students in India. It brings together everything a student needs day-to-day — attendance, schedule, assignments, finance, job search, and placement prep — into one unified interface, and wraps it with a locally-running AI assistant that understands academic life.

The platform was designed, iterated, and refined with the help of **Claude** (Anthropic's AI), which was used throughout the development process: architecting the multi-agent backend, designing the streaming chat pipeline, generating and debugging the React and React Native component trees, refining the voice processing logic, and producing the professional UI theme you see across the web and mobile apps.

---

## What the App Does

Most students juggle five or six different portals just to get through a week — one for attendance, one for the timetable, another for fees, a separate app for placements. Student Catalyst replaces all of them with a single interface and adds something none of them have: a conversational AI that actually knows your data.

A student opens the app and immediately sees their attendance percentage across every subject, which classes they have today, how many assignments are due this week, their current outstanding fee balance, and active placement drives — all on one screen. Then they can open the chat and ask "What's my bunk budget this week?" or "Find me internships in Bangalore with React" and get a real, intelligent answer — not a canned response.

The AI runs entirely on the student's own machine. There is no third-party cloud, no data leaving the device.

---

## Architecture

```
student_catalyst/
├── src/               React + Vite web application
├── mobile-app/        React Native + Expo mobile application
└── mac-backend/       FastAPI server + Hermes AI agent runtime
```

All three components share the same backend. The web app and mobile app are parallel interfaces — the mobile app for on-the-go use, the web app for a richer desktop experience.

---

## The Hermes AI System

Hermes is the name of the on-device AI agent that powers the chat interface and voice commands. It is not a single model — it is a routing harness that dispatches each query to the most appropriate locally-running model via Ollama:

| Query Type | Model | Examples |
|---|---|---|
| Coding and DSA | `qwen2.5-coder:7b` | "Explain Dijkstra's algorithm", "Debug this Python code" |
| Career and agentic tasks | `hermes3:3b` | "Find internships", "Help me write a resume" |
| General campus questions | `mistral:7b` | "What's the mess timing?", "Check my attendance" |

The routing is automatic. A student types or speaks naturally, and Hermes classifies the intent and selects the right model before they finish typing. All three models are pre-warmed at server startup so there is no cold-start delay on the first query.

### Retrieval-Augmented Generation

Hermes goes beyond its training data through a built-in RAG pipeline. Students (or administrators) can upload documents — syllabi, hostel rulebooks, placement eligibility criteria, exam schedules — directly into the app. Hermes indexes these documents with chunked text retrieval and injects relevant excerpts into its context window when answering related questions. This means a student can ask "What is the minimum CGPA for placements?" and get the exact answer from their own college's rulebook, not a generic guess.

### Voice Interface

Every screen in both the web and mobile apps has a voice control button. Speaking a command routes through the enhanced voice processing pipeline:

- Simple navigation commands ("Go to attendance", "Open schedule") are handled by keyword matching at zero latency
- Complex queries ("What subjects am I about to fail?", "Find me a job in data science") are transcribed using `faster-whisper` running on-device and then sent to the Hermes routing system
- The voice processor supports multi-step commands and context-aware follow-ups

### Streaming Chat

The chat interface does not wait for the AI to finish before displaying a response. Responses stream token-by-token from the backend via Server-Sent Events (SSE), so the experience feels immediate even on slower hardware. The web chat also supports uploading documents mid-conversation to add them to the RAG knowledge base.

---

## How Claude Was Used to Build This

Claude was not just a code completion tool — it was a pair programmer and architecture reviewer throughout the build.

**Backend design:** Claude designed the three-tier AI routing system in `hermes_harness.py`, including the regex classifiers that separate coding queries from career queries from general chat, and the model dispatch logic. It also built the RAG pipeline in `rag.py` — the document chunking strategy, overlap logic, and retrieval scoring — from scratch.

**Streaming infrastructure:** The SSE streaming pipeline between the FastAPI backend and the React frontend was architected and debugged with Claude, including the token-by-token yield loop, the frontend `ReadableStream` consumer, and error recovery on dropped connections.

**Voice processing:** The `EnhancedVoiceProcessor` class in `enhanced_voice.py` — with its `CommandType` enum, intent classification, and multi-step command support — was built with Claude iterating on the design across multiple sessions.

**React component tree:** All ten web pages (`Dashboard`, `Chat`, `Attendance`, `Schedule`, `Assignments`, `Finance`, `Jobs`, `Placement`, `Travel`, `More`) and all eleven mobile screens were built with Claude, including the data-binding logic, loading states, error handling, and responsive layouts.

**UI theme:** The professional blue design system in `src/styles/theme.css` — the CSS custom properties, the color palette, the glassmorphism card styles, and the gradient system — was generated and refined with Claude based on design direction.

**Database models and synthetic data:** The SQLAlchemy models in `models.py` and the realistic synthetic student data generator in `synthetic_data.py` (attendance records, assignment deadlines, placement drives, fee transactions) were written with Claude to create a convincing demo experience without real student data.

---

## Features

### Student Dashboard
A single-screen overview that loads in parallel: today's class schedule, current attendance across all subjects, assignments due this week, outstanding fee balance, and active placement drives. The dashboard updates in real time and supports pull-to-refresh on mobile.

### Attendance Tracker
Per-subject attendance with percentage calculations, session-level history, and colour-coded at-risk indicators. Students can see exactly how many more classes they can miss before falling below the required threshold — the "bunk budget" the AI references.

### Schedule
A weekly timetable with day-by-day class listings, professor names, room numbers, and session types (lecture, lab, tutorial). The schedule data feeds into the dashboard and into Hermes so the AI can answer schedule-related questions with real data.

### Assignments
All assignments in one view with due dates, subject labels, priority levels (high, medium, low), and completion status. Students can ask Hermes to summarise pending work or help them start on a specific assignment.

### Placement Portal
Active placement drives with company details, application deadlines, eligibility criteria, round breakdowns, and application status tracking. The job scraper agent (`job_scraper.py`) supplements this with live job listings from external sources.

### Finance
A complete financial ledger: tuition fees, scholarship credits, hostel charges, exam fees, and miscellaneous transactions. Pending payments are highlighted and the AI can answer balance and payment questions conversationally.

### Job Search
A curated job and internship feed with company names, roles, locations, stipends, skill tags, application deadlines, and direct links to apply. The listings are sourced and filtered by the Hermes job scraper agent.

### AI Chat with RAG
A full-featured chat interface supporting text input, voice input, document uploads, and real-time streaming responses. Three AI modes are available — Hermes (career and research), Hermes Code (programming and DSA), and Fast Chat (quick general answers) — selectable per conversation.

### Cross-platform Mobile App
All features are available on iOS and Android through the Expo-based mobile app, with a native-feeling UI, pull-to-refresh, and the same voice control capabilities as the web app.

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- Python 3.11 or later
- [Ollama](https://ollama.com) installed on macOS
- Expo Go (for mobile)

---

### 1. Pull the AI Models

```bash
ollama pull qwen2.5-coder:7b
ollama pull hermes3:3b
ollama pull mistral:7b-instruct-q4_K_M
```

Ollama must be running (`ollama serve`) before starting the backend. The backend pre-warms all three models at startup.

---

### 2. Start the Backend

```bash
cd mac-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. Interactive API docs are at `http://localhost:8000/docs`.

---

### 3. Start the Web App

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The app auto-connects to the backend and loads a demo student account on first visit.

---

### 4. Start the Mobile App

```bash
cd mobile-app
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your machine's LAN IP if using a physical device
npx expo start
```

Scan the QR code with Expo Go. For a physical device, set `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000` with your Mac's local IP.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/demo` | Instant demo login, no credentials required |
| `GET` | `/health` | Backend and model status |
| `GET` | `/data/dashboard` | Full student dashboard payload |
| `GET` | `/data/attendance` | Per-subject attendance records |
| `GET` | `/data/schedule` | Weekly class schedule |
| `GET` | `/data/assignments` | Assignments with deadlines and status |
| `GET` | `/data/placement` | Placement drives and application status |
| `GET` | `/data/finance` | Fee ledger and transaction history |
| `GET` | `/data/jobs` | Job and internship listings |
| `POST` | `/agent/chat/stream` | Streaming AI chat (SSE) |
| `POST` | `/agent/voice/command` | Voice command processing |
| `POST` | `/agent/transcribe` | On-device audio transcription |
| `GET` | `/rag/documents` | List uploaded knowledge base documents |
| `POST` | `/rag/upload` | Add a document to the knowledge base |
| `DELETE` | `/rag/documents/{name}` | Remove a document |

---

## Environment Variables

**Backend** (`mac-backend/.env`):
```
MAC_SERVER_HOST=0.0.0.0
MAC_SERVER_PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
LOCAL_MODEL_ENDPOINT=http://localhost:11434
CODE_MODEL=qwen2.5-coder:7b
HERMES_MODEL=hermes3:3b
CHAT_MODEL=mistral:7b-instruct-q4_K_M
```

**Web App** (`.env.local`):
```
VITE_MAC_SERVER_URL=http://localhost:8000
```

**Mobile App** (`mobile-app/.env`):
```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Technology Stack

**Web App** — React 18, TypeScript, Vite, React Router, Recharts, Radix UI, Motion

**Mobile App** — React Native, Expo, TypeScript, Expo AV, Expo Document Picker, React Navigation

**Backend** — FastAPI, SQLAlchemy, SQLite, Ollama, faster-whisper, Python 3.11

---

## License

This project is for academic and educational purposes.