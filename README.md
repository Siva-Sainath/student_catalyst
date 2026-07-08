# Student Catalyst

Student Catalyst is a full-stack AI-powered campus management platform that centralizes all aspects of student life into a single, unified experience. The platform integrates a web application, a cross-platform mobile app, and a locally-hosted AI backend powered by the Hermes multi-agent system to give students real-time access to academic, financial, and career information through natural language interaction.

---

## Architecture Overview

The project is structured as a monorepo containing three distinct components:

| Component | Technology | Purpose |
|---|---|---|
| `src/` | React 18 + Vite + TypeScript | Web application (desktop and tablet) |
| `mobile-app/` | React Native + Expo | Cross-platform iOS and Android app |
| `mac-backend/` | Python + FastAPI | REST API server and AI agent runtime |

---

## Key Features

### Hermes AI Agent
A locally-hosted, multi-agent AI system that understands academic context and provides intelligent, conversational assistance. Hermes supports streaming responses via Server-Sent Events (SSE), voice command input, and Retrieval-Augmented Generation (RAG) over uploaded documents. It runs entirely on-device through Ollama, ensuring full data privacy.

### Voice Interface
Students can interact with the platform hands-free using natural speech. The voice pipeline uses `faster-whisper` for on-device speech-to-text transcription and a purpose-built enhanced voice agent that parses spoken commands into structured actions across all platform features.

### Academic Dashboard
A central dashboard providing a real-time summary of academic standing, including attendance percentages, upcoming assignment deadlines, GPA trends, and scheduled classes—all in a single view.

### Attendance Tracking
Detailed course-by-course attendance records with percentage calculations, session-level history, and at-risk alerts when a student falls below the minimum required threshold.

### Schedule Management
An interactive weekly timetable displaying class schedules, examination slots, and faculty-assigned events. The schedule syncs with the backend and can be queried conversationally through Hermes.

### Assignment Management
A comprehensive assignment tracker with due dates, submission status, priority indicators, and subject categorization. Students can ask Hermes for reminders or summaries of pending work.

### Placement Portal
A dedicated placement preparation hub featuring available job drives, application status tracking, company-specific round details, and an integrated job listing feed sourced through an AI-powered job scraper agent.

### Finance Management
A transparent financial ledger for tracking tuition fees, scholarship disbursements, hostel charges, and miscellaneous payments. Includes a transaction history view and pending payment alerts.

### RAG Document Knowledge Base
Students and administrators can upload academic documents (syllabi, rulebooks, hostel guidelines) to the backend. Hermes indexes these documents and uses them to answer specific, context-aware queries, going beyond its general training data.

### Mobile Application
A fully featured React Native companion app with all major screens (Home, Chat, Schedule, Assignments, Attendance, Finance, Jobs, Placement, Profile) designed for on-the-go access with the same backend as the web application.

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- Python 3.11 or later
- [Ollama](https://ollama.com) installed and running on macOS
- Expo Go app (for mobile development)

---

### 1. Set Up the Local AI Model

Pull the required model using Ollama:

```bash
ollama pull deepseek-coder:7b-instruct-q4_K_M
```

Ollama must be running and accessible at `http://localhost:11434` before starting the backend.

---

### 2. Run the Backend

```bash
cd mac-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive API documentation.

#### Backend API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/demo` | Demo login for quick testing |
| `GET` | `/health` | Service health check |
| `GET` | `/data/dashboard` | Aggregated student dashboard data |
| `GET` | `/data/attendance` | Attendance records by course |
| `GET` | `/data/schedule` | Weekly class schedule |
| `GET` | `/data/assignments` | Assignment list with deadlines |
| `GET` | `/data/placement` | Placement drive information |
| `GET` | `/data/finance` | Financial records and transactions |
| `GET` | `/data/jobs` | Job listings from scraper agent |
| `POST` | `/agent/chat/stream` | Streaming AI chat via SSE |
| `POST` | `/agent/voice/command` | Voice command processing |
| `POST` | `/agent/transcribe` | Audio-to-text transcription |
| `GET` | `/rag/documents` | List uploaded RAG documents |
| `POST` | `/rag/upload` | Upload a document to the knowledge base |
| `DELETE` | `/rag/documents/{name}` | Remove a document from the knowledge base |

---

### 3. Run the Web Application

```bash
npm install
npm run dev
```

The web application will start at `http://localhost:5173`.

Set the `VITE_MAC_SERVER_URL` environment variable if your backend is not running on the default address:

```bash
VITE_MAC_SERVER_URL=http://192.168.1.100:8000 npm run dev
```

---

### 4. Run the Mobile Application

```bash
cd mobile-app
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend address
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npx expo start
```

Scan the QR code with Expo Go on your device. If using a physical device on a local network, set `EXPO_PUBLIC_API_URL` to your Mac's LAN IP address (e.g., `http://192.168.1.100:8000`).

---

## Project Structure

```
student_catalyst/
├── src/                        # Web application
│   ├── app/
│   │   ├── pages/              # Route-level page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Attendance.tsx
│   │   │   ├── Schedule.tsx
│   │   │   ├── Assignments.tsx
│   │   │   ├── Finance.tsx
│   │   │   ├── Jobs.tsx
│   │   │   └── Placement.tsx
│   │   ├── components/         # Shared UI components
│   │   ├── services/           # API client and voice service
│   │   ├── hooks/              # Custom React hooks
│   │   └── context/            # React context providers
│   └── styles/                 # Global CSS and design tokens
│
├── mobile-app/                 # React Native mobile app
│   └── src/
│       ├── screens/            # All application screens
│       ├── components/         # Shared mobile components
│       ├── api.ts              # Backend API client
│       └── theme.ts            # Design system tokens
│
└── mac-backend/                # FastAPI server
    ├── agents/                 # AI agent modules
    │   ├── hermes_harness.py   # Multi-agent orchestrator
    │   ├── ai_agent.py         # Core LLM agent
    │   ├── rag.py              # Retrieval-augmented generation
    │   ├── job_scraper.py      # Job listing scraper agent
    │   ├── enhanced_voice.py   # Voice command interpreter
    │   └── chat.py             # Chat session manager
    ├── server.py               # FastAPI application and routes
    ├── models.py               # SQLAlchemy database models
    ├── auth.py                 # Authentication utilities
    ├── synthetic_data.py       # Demo data generation
    └── requirements.txt        # Python dependencies
```

---

## Technology Stack

**Web Frontend**
- React 18 with TypeScript
- Vite build tooling
- React Router for navigation
- Recharts for data visualization
- Radix UI primitives with a custom design system
- Motion for animations

**Mobile App**
- React Native with Expo
- TypeScript
- Expo AV for audio recording
- Expo Document Picker for file uploads

**Backend**
- FastAPI (Python)
- SQLAlchemy with SQLite
- Ollama for local LLM inference
- faster-whisper for on-device speech recognition
- LangChain-compatible RAG pipeline

---

## Environment Variables

### Backend (`mac-backend/.env`)

```env
MAC_SERVER_HOST=0.0.0.0
MAC_SERVER_PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
OLLAMA_BASE_URL=http://localhost:11434
```

### Web App (`.env.local`)

```env
VITE_MAC_SERVER_URL=http://localhost:8000
```

### Mobile App (`mobile-app/.env`)

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Authentication

The platform supports a demo authentication flow for development and testing:

- **Demo Login**: `POST /auth/demo` — creates or retrieves a test student account instantly, no credentials required.

For production deployments, the backend includes extensible authentication hooks compatible with OAuth providers (Google, GitHub) via token-based verification.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request

---

## License

This project is for academic and educational purposes.