"""
Hermes Agent Harness — single router for chat, code/math, and agentic tasks.
M3-optimized: qwen2.5-coder for code/math, Hermes persona on fastest available model for agentic work.
"""

from __future__ import annotations

import os
import re
from typing import Generator, Optional

from dotenv import load_dotenv

from agents.ai_agent import get_agent_system
from llm_client import generate as llm_generate, stream_generate

load_dotenv()

CODE_MODEL = os.getenv("CODE_MODEL", "qwen2.5-coder:7b")
FAST_MODEL = os.getenv("MISTRAL_MODEL", "mistral:7b-instruct-q4_K_M")

HERMES_CODE_SYSTEM = """You are Hermes Code, an expert coding and mathematics tutor.
Give clear step-by-step reasoning. For code, include short examples when helpful.
Be accurate, concise, and student-friendly."""

HERMES_AGENT_SYSTEM = """You are Hermes, an agentic campus assistant.
Plan briefly, then answer. For structured tasks (jobs, JSON) follow the format requested exactly.
Be actionable and concise."""


_CODE_MATH_KW = re.compile(
    r"\b(code|python|java|c\+\+|javascript|typescript|algorithm|debug|function|class|"
    r"sql|api|homework|prove|equation|integral|derivative|matrix|theorem|calculus|"
    r"geometry|probability|statistics|dsa|leetcode)\b",
    re.I,
)


def task_for_text(text: str, topic: str = "") -> str:
    blob = f"{topic} {text}"
    if _CODE_MATH_KW.search(blob):
        return "code"
    agent_kw = ("job", "internship", "placement", "career", "research", "analyze", "find me", "recommend")
    if any(k in blob.lower() for k in agent_kw):
        return "agentic"
    return "chat"


def _wrap(system: str, prompt: str) -> str:
    return f"<system>{system}</system>\n\n{prompt}"


def generate(prompt: str, task: Optional[str] = None, text_hint: str = "", **kwargs) -> str:
    task = task or task_for_text(text_hint or prompt)
    temperature = kwargs.get("temperature", 0.3)
    max_tokens = kwargs.get("max_tokens", 1024)

    if task in ("code", "math"):
        return llm_generate(
            _wrap(HERMES_CODE_SYSTEM, prompt),
            model=CODE_MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    system = get_agent_system()
    agent = "hermes" if "hermes" in system.get_available_agents() else "mistral"
    if agent not in system.get_available_agents():
        agent = None
    full = _wrap(HERMES_AGENT_SYSTEM, prompt) if task == "agentic" else prompt
    return system.generate(full, agent_name=agent, temperature=temperature, max_tokens=max_tokens, stream=False)


def stream(prompt: str, task: Optional[str] = None, text_hint: str = "", **kwargs) -> Generator[str, None, None]:
    task = task or task_for_text(text_hint or prompt)
    temperature = kwargs.get("temperature", 0.35)
    max_tokens = kwargs.get("max_tokens", 600)

    if task in ("code", "math"):
        for token in stream_generate(
            _wrap(HERMES_CODE_SYSTEM, prompt),
            model=CODE_MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
        ):
            yield token
        return

    system = get_agent_system()
    agent = "hermes" if task == "agentic" and "hermes" in system.get_available_agents() else "mistral"
    if agent not in system.get_available_agents():
        agent = next(iter(system.get_available_agents()), None)
    if agent:
        for token in system.generate(
            _wrap(HERMES_AGENT_SYSTEM, prompt) if task == "agentic" else prompt,
            agent_name=agent,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        ):
            yield token
        return

    for token in stream_generate(prompt, model=FAST_MODEL, temperature=temperature, max_tokens=max_tokens):
        yield token


def get_harness_status() -> dict:
    system = get_agent_system()
    return {
        "code_model": CODE_MODEL,
        "fast_model": FAST_MODEL,
        "agents": system.get_available_agents(),
        "hermes_ready": "hermes" in system.get_available_agents(),
    }
