"""
Hermes Agent Harness — routes tasks to the optimal local model.

Routing:
  "code"    → qwen2.5-coder:7b   (coding, math, DSA, debugging)
  "agentic" → hermes3:3b          (job search, voice intent, structured JSON)
  "chat"    → mistral:7b          (general campus Q&A, quick answers)

All three models are pre-warmed at server startup (see server.py).
"""

from __future__ import annotations

import os
import re
import json
import requests as http
from typing import Generator, Optional

from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE   = os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434")
CODE_MODEL    = os.getenv("CODE_MODEL",    "qwen2.5-coder:7b")
AGENT_MODEL   = os.getenv("HERMES_MODEL",  "hermes3:3b")
CHAT_MODEL    = os.getenv("CHAT_MODEL",    "mistral:7b-instruct-q4_K_M")
CONTEXT_WIN   = int(os.getenv("OLLAMA_CONTEXT_WINDOW", "4096"))
LLM_TIMEOUT   = int(os.getenv("LLM_TIMEOUT", "120"))

# ── System prompts ──────────────────────────────────────────────────────────

CODE_SYSTEM = (
    "You are Hermes Code, an expert coding and mathematics tutor. "
    "Give clear step-by-step reasoning. Include short working code examples "
    "when helpful. Be accurate, concise, and student-friendly."
)

AGENT_SYSTEM = (
    "You are Hermes, an agentic campus AI assistant. "
    "When asked for structured data (jobs, JSON), output valid JSON only — no markdown fences. "
    "For general questions be actionable and concise."
)

CHAT_SYSTEM = (
    "You are a helpful campus assistant for an Indian engineering college. "
    "Be concise, friendly, and accurate. Answer in 2-4 sentences unless more detail is needed."
)

# ── Task classifier ─────────────────────────────────────────────────────────

_CODE_RE = re.compile(
    r"\b(code|python|java|c\+\+|javascript|typescript|algorithm|debug|function|"
    r"class|sql|api|leetcode|dsa|data structure|linked list|tree|graph|sort|"
    r"recursion|dynamic programming|dp|prove|equation|integral|derivative|"
    r"matrix|theorem|calculus|probability|statistics)\b",
    re.I,
)

_AGENT_RE = re.compile(
    r"\b(job|internship|placement|career|resume|interview|hire|recruit|"
    r"linkedin|naukri|internshala|navigate|go to|open|show me|find me|search)\b",
    re.I,
)


def task_for_text(text: str, topic: str = "") -> str:
    blob = f"{topic} {text}"
    if _CODE_RE.search(blob):
        return "code"
    if _AGENT_RE.search(blob):
        return "agentic"
    return "chat"


# ── Low-level Ollama callers ─────────────────────────────────────────────────

def _build_body(model: str, prompt: str, stream: bool,
                temperature: float, max_tokens: int) -> dict:
    return {
        "model": model,
        "prompt": prompt,
        "stream": stream,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": CONTEXT_WIN,
        },
    }


def _is_online() -> bool:
    try:
        return http.get(f"{OLLAMA_BASE}/api/tags", timeout=3).status_code == 200
    except Exception:
        return False


def _generate_sync(model: str, prompt: str,
                   temperature: float, max_tokens: int) -> str:
    body = _build_body(model, prompt, False, temperature, max_tokens)
    try:
        r = http.post(f"{OLLAMA_BASE}/api/generate",
                      json=body, timeout=LLM_TIMEOUT)
        r.raise_for_status()
        return r.json().get("response", "")
    except Exception as exc:
        return f"[LLM error: {exc}]"


def _stream_tokens(model: str, prompt: str,
                   temperature: float, max_tokens: int) -> Generator[str, None, None]:
    body = _build_body(model, prompt, True, temperature, max_tokens)
    try:
        with http.post(f"{OLLAMA_BASE}/api/generate",
                       json=body, stream=True, timeout=LLM_TIMEOUT) as r:
            r.raise_for_status()
            for raw in r.iter_lines():
                if not raw:
                    continue
                line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if payload.get("done"):
                    break
                chunk = payload.get("response", "")
                if chunk:
                    yield chunk
    except Exception as exc:
        yield f"[Stream error: {exc}]"


# ── Public API ───────────────────────────────────────────────────────────────

def _wrap(system: str, prompt: str) -> str:
    return f"<system>{system}</system>\n\n{prompt}"


def _model_for_task(task: str) -> tuple[str, str]:
    """Returns (model_name, system_prompt) for the given task."""
    if task == "code":
        return CODE_MODEL, CODE_SYSTEM
    if task == "agentic":
        return AGENT_MODEL, AGENT_SYSTEM
    return CHAT_MODEL, CHAT_SYSTEM


def generate(prompt: str, task: Optional[str] = None,
             text_hint: str = "", temperature: float = 0.3,
             max_tokens: int = 1024) -> str:
    if not _is_online():
        return "Ollama is not running. Start it with: ollama serve"
    t = task or task_for_text(text_hint or prompt)
    model, system = _model_for_task(t)
    return _generate_sync(model, _wrap(system, prompt), temperature, max_tokens)


def stream(prompt: str, task: Optional[str] = None,
           text_hint: str = "", temperature: float = 0.35,
           max_tokens: int = 600) -> Generator[str, None, None]:
    if not _is_online():
        yield "Ollama is not running. Start it with: ollama serve"
        return
    t = task or task_for_text(text_hint or prompt)
    model, system = _model_for_task(t)
    yield from _stream_tokens(model, _wrap(system, prompt), temperature, max_tokens)


def prewarm() -> dict:
    """
    Pre-warm all three models by sending a trivial prompt.
    Call this in a background thread at server startup.
    Returns status for each model.
    """
    results = {}
    for label, model in [("code", CODE_MODEL), ("agent", AGENT_MODEL), ("chat", CHAT_MODEL)]:
        try:
            resp = _generate_sync(model, "Hi", temperature=0.1, max_tokens=5)
            results[label] = "ready" if resp else "empty_response"
        except Exception as exc:
            results[label] = f"error: {exc}"
    return results


def get_harness_status() -> dict:
    return {
        "code_model":  CODE_MODEL,
        "agent_model": AGENT_MODEL,
        "chat_model":  CHAT_MODEL,
        "ollama_online": _is_online(),
    }
