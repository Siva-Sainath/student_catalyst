#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# start.sh  —  One command to start Student Catalyst
# Starts: FastAPI backend + Vite web UI + Expo mobile dev server
# Usage:  ./start.sh  |  ./start.sh --no-mobile  |  ./start.sh --mobile-only
# ──────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/mac-backend"
MOBILE="$ROOT/mobile-app"

# Colours
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
BLU='\033[0;34m'; CYN='\033[0;36m'; BLD='\033[1m'; RST='\033[0m'

log()  { echo -e "${BLU}[start]${RST} $*"; }
ok()   { echo -e "${GRN}  ✓${RST} $*"; }
warn() { echo -e "${YLW}  ⚠${RST}  $*"; }
err()  { echo -e "${RED}  ✗${RST} $*"; }

# Flags
RUN_BACKEND=true; RUN_WEB=true; RUN_MOBILE=true
for arg in "$@"; do
  case $arg in
    --mobile-only)  RUN_WEB=false;    RUN_BACKEND=false ;;
    --web-only)     RUN_MOBILE=false; RUN_BACKEND=true  ;;
    --no-mobile)    RUN_MOBILE=false ;;
    --no-web)       RUN_WEB=false ;;
    --backend-only) RUN_WEB=false;    RUN_MOBILE=false ;;
    -h|--help) echo "Usage: ./start.sh [--mobile-only|--web-only|--no-mobile|--no-web|--backend-only]"; exit 0 ;;
  esac
done

# Kill all children on Ctrl+C
PIDS=()
cleanup() {
  echo ""
  log "Shutting down all services…"
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null
  ok "All stopped. Goodbye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Free a TCP port (kill anything using it)
free_port() {
  local pids
  pids=$(lsof -ti tcp:"$1" 2>/dev/null) || true
  if [ -n "$pids" ]; then
    warn "Port $1 occupied — clearing (PIDs: $pids)"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# ── Preflight ─────────────────────────────────────────────────────────────────
log "${BLD}Student Catalyst — Startup${RST}"
echo ""

[ -f "$BACKEND/venv/bin/activate" ] && ok "Python venv found" || \
  { err "No venv at mac-backend/venv/. Run: python3 -m venv mac-backend/venv && source mac-backend/venv/bin/activate && pip install -r mac-backend/requirements.txt"; exit 1; }

source "$BACKEND/venv/bin/activate"
python -c "import faster_whisper" 2>/dev/null && ok "faster-whisper ready" || \
  { warn "Installing faster-whisper…"; pip install faster-whisper==1.1.1 -q; ok "faster-whisper installed"; }
command -v ffmpeg >/dev/null 2>&1 && ok "FFmpeg: $(which ffmpeg)" || \
  { warn "FFmpeg missing — installing…"; brew install ffmpeg -q; ok "FFmpeg installed"; }
deactivate 2>/dev/null || true

command -v node >/dev/null 2>&1 && ok "Node $(node --version)" || \
  { err "Node.js not found — install from https://nodejs.org"; exit 1; }

# Ollama
command -v ollama >/dev/null 2>&1 && ok "Ollama CLI found: $(which ollama)" || \
  { err "Ollama not found. Install: https://ollama.com"; exit 1; }

[ -f "$MOBILE/node_modules/.bin/expo" ] && ok "Expo CLI found" || \
  { warn "Installing Expo deps…"; npm --prefix "$MOBILE" install --silent; ok "Done"; }
[ -d "$ROOT/node_modules" ] && ok "Web node_modules found" || \
  { warn "Installing web deps…"; npm --prefix "$ROOT" install --silent; ok "Done"; }

echo ""

# ── Clear stale ports ─────────────────────────────────────────────────────────
$RUN_BACKEND && free_port 8000
$RUN_WEB     && free_port 5173
$RUN_MOBILE  && free_port 8081

# ── Start Ollama (if not already running) ─────────────────────────────────────
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
  warn "Ollama not running — starting it now…"
  ollama serve >/tmp/ollama-start.log 2>&1 &
  PIDS+=($!)
  # Wait up to 10 s for it to come online
  for i in $(seq 1 10); do
    sleep 1
    curl -s http://localhost:11434/api/tags >/dev/null 2>&1 && break
  done
  curl -s http://localhost:11434/api/tags >/dev/null 2>&1 \
    && ok "Ollama started" \
    || warn "Ollama may still be loading — backend will retry automatically"
else
  ok "Ollama already running ✓"
fi

log "${BLD}Starting services:${RST}"
$RUN_BACKEND && echo "  🔧  Backend  → http://localhost:8000"
$RUN_WEB     && echo "  🌐  Web UI   → http://localhost:5173"
$RUN_MOBILE  && echo "  📱  Expo     → QR code appears below — scan with Expo Go"
echo ""

# ── 1. FastAPI backend ────────────────────────────────────────────────────────
if $RUN_BACKEND; then
  (
    source "$BACKEND/venv/bin/activate"
    cd "$BACKEND"
    exec uvicorn server:app --reload --host 0.0.0.0 --port 8000 \
      2>&1 | sed "s/^/$(printf '\033[0;36m')[backend]$(printf '\033[0m') /"
  ) &
  PIDS+=($!)
  ok "Backend PID $!"
  sleep 2   # let it bind before expo tries to connect
fi

# ── 2. Vite web frontend ──────────────────────────────────────────────────────
if $RUN_WEB; then
  (
    cd "$ROOT"
    exec npm run dev -- --host 0.0.0.0 \
      2>&1 | sed "s/^/$(printf '\033[0;34m')[web]$(printf '\033[0m')     /"
  ) &
  PIDS+=($!)
  ok "Web dev server PID $!"
fi

# ── 3. Expo (NOT piped — piping breaks the QR code ANSI art) ─────────────────
if $RUN_MOBILE; then
  # Auto-update IP in .env so physical devices can connect
  MAC_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
  echo "EXPO_PUBLIC_API_URL=http://$MAC_IP:8000" > "$MOBILE/.env"
  ok "Set Expo API URL to http://$MAC_IP:8000"

  echo ""
  echo -e "${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
  echo -e "${GRN}  📱  EXPO GO — scan the QR code below                    ${RST}"
  echo -e "${GRN}  💡  Or open Expo Go → Enter URL → exp://$MAC_IP:8081    ${RST}"
  echo -e "${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
  echo ""
  (
    cd "$MOBILE"
    exec npx expo start -c --lan --port 8081
  ) &
  PIDS+=($!)
fi

echo ""
log "${BLD}Press Ctrl+C to stop everything.${RST}"
echo ""

wait
