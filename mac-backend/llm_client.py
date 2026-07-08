"""Ollama client — fast chat model + optional overrides."""

import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

LOCAL_MODEL_ENDPOINT = os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434")
CHAT_MODEL = os.getenv("CHAT_MODEL", os.getenv("LOCAL_MODEL_NAME", "mistral:7b-instruct-q4_K_M"))

FALLBACK = (
  "AI is offline on this Mac. Start Ollama and run: "
  "ollama pull mistral:7b-instruct-q4_K_M"
)


def _ollama_body(model: str, prompt: str, temperature: float, max_tokens: int, stream: bool) -> dict:
  return {
    "model": model,
    "prompt": prompt,
    "stream": stream,
    "options": {
      "temperature": temperature,
      "num_predict": max_tokens,
      "num_ctx": int(os.getenv("OLLAMA_CONTEXT_WINDOW", "4096")),
    },
  }


def _online() -> bool:
  try:
    return requests.get(f"{LOCAL_MODEL_ENDPOINT}/api/tags", timeout=3).status_code == 200
  except Exception:
    return False


def generate(prompt: str, model: str | None = None, temperature: float = 0.3, max_tokens: int = 512) -> str:
  if not _online():
    return FALLBACK
  url = f"{LOCAL_MODEL_ENDPOINT}/api/generate"
  body = _ollama_body(model or CHAT_MODEL, prompt, temperature, max_tokens, False)
  try:
    r = requests.post(url, json=body, timeout=int(os.getenv("LLM_TIMEOUT", "120")))
    r.raise_for_status()
    data = r.json()
    return data.get("response") or data.get("completion") or ""
  except Exception as exc:
    print(f"llm generate: {exc}")
    return FALLBACK


def stream_generate(prompt: str, model: str | None = None, temperature: float = 0.35, max_tokens: int = 600):
  if not _online():
    yield FALLBACK
    return
  url = f"{LOCAL_MODEL_ENDPOINT}/api/generate"
  body = _ollama_body(model or CHAT_MODEL, prompt, temperature, max_tokens, True)
  try:
    with requests.post(url, json=body, stream=True, timeout=300) as r:
      r.raise_for_status()
      for raw in r.iter_lines(decode_unicode=True):
        if not raw:
          continue
        if isinstance(raw, bytes):
          line = raw.decode("utf-8", errors="ignore").strip()
        else:
          line = raw.strip()
        if line.startswith("data:"):
          line = line[5:].strip()
        try:
          payload = json.loads(line)
        except json.JSONDecodeError:
          continue
        if payload.get("done"):
          break
        chunk = payload.get("response") or ""
        if chunk:
          yield chunk
  except Exception as exc:
    print(f"llm stream: {exc}")
    yield FALLBACK
