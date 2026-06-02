import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
LOCAL_MODEL_ENDPOINT = os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434")
LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "deepseek-coder:7b-instruct-q4_K_M")

# Fallback responses when LLM is not available
FALLBACK_RESPONSES = {
    "homework": "I'm currently unable to connect to the AI model. Here's a helpful response based on your question: Please check your notes or textbook for this topic. If you need more help, try asking a more specific question.",
    "general": "I'm currently offline but I can still help with basic information. For complex questions, please try again later when the AI model is available.",
}


def _clean_stream_line(line) -> str:
  if isinstance(line, bytes):
    line = line.decode("utf-8", errors="ignore")
  payload = line.strip()
  if payload.startswith("data:"):
    payload = payload[len("data:"):].strip()
  return payload


def _is_model_available() -> bool:
  """Check if the local model endpoint is available."""
  try:
    url = f"{LOCAL_MODEL_ENDPOINT}/api/tags"
    response = requests.get(url, timeout=5)
    return response.status_code == 200
  except Exception:
    return False


def generate(prompt: str, temperature: float = 0.3, max_tokens: int = 512) -> str:
  # Check if model is available
  if not _is_model_available():
    return FALLBACK_RESPONSES.get("general", "AI model is not available. Please try again later.")
  
  url = f"{LOCAL_MODEL_ENDPOINT}/api/generate"
  body = {
    "model": LOCAL_MODEL_NAME,
    "prompt": prompt,
    "temperature": temperature,
    "max_tokens": max_tokens,
    "stream": False,
  }

  try:
    response = requests.post(url, json=body, timeout=60)
    response.raise_for_status()
    data = response.json()
    if isinstance(data, dict) and data.get("error"):
      raise RuntimeError(data["error"])
    if isinstance(data, dict) and data.get("response"):
      return data["response"]
    return data.get("completion") or data.get("text") or FALLBACK_RESPONSES.get("general")
  except Exception as e:
    print(f"LLM generation error: {e}")
    return FALLBACK_RESPONSES.get("general")


def stream_generate(prompt: str, temperature: float = 0.3, max_tokens: int = 512):
  # Check if model is available
  if not _is_model_available():
    # Return fallback as a single yield
    yield FALLBACK_RESPONSES.get("homework", FALLBACK_RESPONSES.get("general"))
    return
  
  url = f"{LOCAL_MODEL_ENDPOINT}/api/generate"
  body = {
    "model": LOCAL_MODEL_NAME,
    "prompt": prompt,
    "temperature": temperature,
    "max_tokens": max_tokens,
    "stream": True,
  }

  try:
    with requests.post(url, json=body, stream=True, timeout=300) as response:
      response.raise_for_status()
      for raw_line in response.iter_lines(decode_unicode=True):
        if not raw_line:
          continue
        line = _clean_stream_line(raw_line)
        if not line:
          continue
        try:
          payload = json.loads(line)
        except json.JSONDecodeError:
          continue
        if payload.get("token"):
          yield payload["token"]
        elif payload.get("response"):
          yield payload["response"]
        elif payload.get("data") and isinstance(payload["data"], dict):
          text = payload["data"].get("text")
          if text:
            yield text
  except Exception as e:
    print(f"LLM streaming error: {e}")
    yield FALLBACK_RESPONSES.get("homework", FALLBACK_RESPONSES.get("general"))
