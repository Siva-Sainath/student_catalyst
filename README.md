
# Revise UI to Professional Blue - MVP Stack

This repo now contains:
- Web UI (`src/`) in React + Vite
- Mac local backend (`mac-backend/`) in FastAPI
- React Native mobile MVP (`mobile-app/`) with Expo
- Local LLM integration via Ollama (`deepseek-coder:7b-instruct-q4_K_M`)

## 1) Run local model on Mac (Ollama)

```bash
ollama pull deepseek-coder:7b-instruct-q4_K_M
ollama run deepseek-coder:7b-instruct-q4_K_M
```

Ollama API is expected at `http://localhost:11434`.

## 2) Run backend

```bash
cd mac-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Backend highlights

- OAuth endpoints: `POST /auth/google`, `POST /auth/github`
- Demo auth for quick MVP testing: `POST /auth/demo`
- Token verification: `GET /auth/verify`
- AI homework streaming: `POST /agent/chat/homework`
- Voice command parsing: `POST /agent/voice/command`
- Feature endpoints with synthetic student data:
  - `GET /mvp/dashboard`
  - `GET /mvp/schedule`
  - `GET /mvp/assignments`
  - `GET /mvp/placement`
  - `GET /mvp/travel`

## 3) Run web app

```bash
npm install
npm run dev
```

Set `VITE_MAC_SERVER_URL` in your environment if backend is not on default IP.

## 4) Run React Native MVP

```bash
cd mobile-app
npm install
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npm run start
```

If using physical device, set `EXPO_PUBLIC_API_URL` to your Mac LAN IP.

## OAuth setup notes

- Google: client app should obtain ID token and send to `/auth/google`.
- GitHub: client app should obtain access token and send to `/auth/github`.
- Mobile MVP currently uses `/auth/demo` to keep startup friction low; you can replace with Expo Auth Session flow for Google/GitHub without changing backend contracts.
  