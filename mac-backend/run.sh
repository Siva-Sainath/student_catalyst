#!/bin/bash
set -e
cd "$(dirname "$0")"
PY=python3.12
if ! command -v $PY &>/dev/null; then PY=python3; fi
if [ ! -d venv ]; then $PY -m venv venv; fi
source venv/bin/activate
pip install -q -r requirements.txt
export $(grep -v '^#' .env | xargs)
exec uvicorn server:app --host "$MAC_SERVER_HOST" --port "$MAC_SERVER_PORT" --reload
