#!/bin/bash
set -e

if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
fi

export $(grep -v '^#' .env | xargs)

exec uvicorn server:app --host "$MAC_SERVER_HOST" --port "$MAC_SERVER_PORT" --reload
