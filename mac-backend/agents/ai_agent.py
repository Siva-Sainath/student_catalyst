"""
Enhanced AI Agent System
Integrates multiple AI models and agents for different tasks.
Supports Hermes, DeepSeek, Llama, and custom agents.
"""

import os
import json
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from dotenv import load_dotenv

load_dotenv()


class AgentType(Enum):
    """Available AI agent types."""
    HERMES = "hermes"
    DEEPSEEK = "deepseek"
    LLAMA = "llama"
    MISTRAL = "mistral"
    CUSTOM = "custom"


@dataclass
class AgentConfig:
    """Configuration for an AI agent."""
    name: str
    agent_type: AgentType
    model_name: str
    endpoint: str
    temperature: float = 0.7
    max_tokens: int = 2048
    system_prompt: str = ""
    capabilities: List[str] = None
    
    def __post_init__(self):
        if self.capabilities is None:
            self.capabilities = []


class AIAgentSystem:
    """
    Multi-agent system for handling different types of queries.
    Can route queries to the most appropriate agent.
    """
    
    def __init__(self):
        self.agents: Dict[str, AgentConfig] = {}
        self._initialize_agents()
    
    def _initialize_agents(self):
        """Initialize all available agents from configuration."""
        
        # Hermes Agent - Best for job search, research, complex queries
        hermes_endpoint = os.getenv("HERMES_ENDPOINT", "http://localhost:11434")
        hermes_model = os.getenv(
            "HERMES_MODEL",
            "hermes3:3b",
        )
        
        if self._check_endpoint(hermes_endpoint) and self._model_exists(hermes_endpoint, hermes_model):
            self.agents["hermes"] = AgentConfig(
                name="Hermes Research Agent",
                agent_type=AgentType.HERMES,
                model_name=hermes_model,
                endpoint=hermes_endpoint,
                temperature=0.3,
                max_tokens=4096,
                system_prompt="""You are Hermes, an advanced AI research assistant. 
You specialize in finding information, analyzing data, and providing comprehensive answers. 
You have access to web search capabilities and can perform complex reasoning. 
Always provide detailed, well-researched answers with sources when possible.""",
                capabilities=["research", "job_search", "complex_queries", "web_search", "analysis"]
            )
        
        # DeepSeek Agent - Best for coding, math, technical questions
        deepseek_endpoint = os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434")
        deepseek_model = os.getenv("CODE_MODEL", os.getenv("LOCAL_MODEL_NAME", "qwen2.5-coder:7b"))
        
        if self._check_endpoint(deepseek_endpoint) and self._model_exists(deepseek_endpoint, deepseek_model):
            self.agents["deepseek"] = AgentConfig(
                name="DeepSeek Coder",
                agent_type=AgentType.DEEPSEEK,
                model_name=deepseek_model,
                endpoint=deepseek_endpoint,
                temperature=0.35,
                max_tokens=2048,
                system_prompt="""You are DeepSeek, an expert coding assistant. 
You specialize in programming, algorithms, data structures, and technical problem-solving. 
Always provide code examples, explain concepts clearly, and help users understand the reasoning.""",
                capabilities=["coding", "math", "algorithms", "technical", "debugging"]
            )
        
        # Llama Agent - Good general purpose
        llama_endpoint = os.getenv("LLAMA_ENDPOINT", "http://localhost:11434")
        llama_model = os.getenv("LLAMA_MODEL", "llama3.1:8b-instruct-q4_K_M")
        
        if self._check_endpoint(llama_endpoint):
            self.agents["llama"] = AgentConfig(
                name="Llama General",
                agent_type=AgentType.LLAMA,
                model_name=llama_model,
                endpoint=llama_endpoint,
                temperature=0.7,
                max_tokens=2048,
                system_prompt="""You are a helpful general-purpose AI assistant. 
You can help with a wide variety of topics including general knowledge, advice, and explanations.""",
                capabilities=["general", "conversation", "advice", "explanations"]
            )
        
        # Mistral Agent - Fast and efficient
        mistral_endpoint = os.getenv("MISTRAL_ENDPOINT", "http://localhost:11434")
        mistral_model = os.getenv("MISTRAL_MODEL", "mistral:7b-instruct-q4_K_M")
        
        if self._check_endpoint(mistral_endpoint) and self._model_exists(mistral_endpoint, mistral_model):
            self.agents["mistral"] = AgentConfig(
                name="Mistral Fast",
                agent_type=AgentType.MISTRAL,
                model_name=mistral_model,
                endpoint=mistral_endpoint,
                temperature=0.5,
                max_tokens=2048,
                system_prompt="""You are a fast and efficient AI assistant. 
Provide concise, accurate answers quickly. You're optimized for speed and clarity.""",
                capabilities=["fast", "efficient", "quick_answers", "summarization"]
            )

        # Hermes agentic persona on Mistral when dedicated Hermes weights are not installed
        if "hermes" not in self.agents and "mistral" in self.agents:
            base = self.agents["mistral"]
            self.agents["hermes"] = AgentConfig(
                name="Hermes Agent (Mistral)",
                agent_type=AgentType.HERMES,
                model_name=base.model_name,
                endpoint=base.endpoint,
                temperature=0.25,
                max_tokens=2048,
                system_prompt="""You are Hermes, an agentic campus career assistant.
Return structured, actionable answers. For job tasks output valid JSON only when asked.
Be concise, accurate, and student-friendly.""",
                capabilities=["research", "job_search", "complex_queries", "analysis"],
            )
    
    def _check_endpoint(self, endpoint: str) -> bool:
        """Check if an endpoint is available."""
        try:
            response = requests.get(f"{endpoint}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False

    def _model_exists(self, endpoint: str, model_name: str) -> bool:
        try:
            response = requests.get(f"{endpoint}/api/tags", timeout=5)
            if response.status_code != 200:
                return False
            names = [m.get("name", "") for m in response.json().get("models", [])]
            base = model_name.split(":")[0]
            return any(n == model_name or n.startswith(base) for n in names)
        except Exception:
            return False
    
    def get_available_agents(self) -> List[str]:
        """Get list of available agent names."""
        return list(self.agents.keys())
    
    def select_agent(self, query: str, context: Optional[Dict] = None) -> Optional[AgentConfig]:
        """
        Select the best agent for a given query.
        
        Args:
            query: The user's query
            context: Additional context (user info, topic, etc.)
        
        Returns:
            The best AgentConfig for the query, or None if no agents available
        """
        if not self.agents:
            return None
        
        query_lower = query.lower()
        
        # Check for job/placement related queries
        job_keywords = ["job", "internship", "placement", "career", "company", "interview", 
                       "resume", "cv", "linkedin", "hiring", "recruitment", "salary"]
        if any(kw in query_lower for kw in job_keywords):
            if "hermes" in self.agents:
                return self.agents["hermes"]
        
        # Check for coding/technical queries
        code_keywords = ["code", "python", "java", "c++", "javascript", "algorithm", 
                        "data structure", "debug", "error", "function", "class", 
                        "library", "api", "database", "sql", "html", "css"]
        if any(kw in query_lower for kw in code_keywords):
            if "deepseek" in self.agents:
                return self.agents["deepseek"]
        
        # Check for research/complex queries
        research_keywords = ["research", "analyze", "compare", "explain", "detailed", 
                            "comprehensive", "in-depth", "study", "investigate"]
        if any(kw in query_lower for kw in research_keywords):
            if "hermes" in self.agents:
                return self.agents["hermes"]
        
        # Default to fastest available agent
        if "mistral" in self.agents:
            return self.agents["mistral"]
        elif "llama" in self.agents:
            return self.agents["llama"]
        elif "deepseek" in self.agents:
            return self.agents["deepseek"]
        
        return next(iter(self.agents.values()))
    
    def generate(self, prompt: str, agent_name: Optional[str] = None, 
                temperature: Optional[float] = None, max_tokens: Optional[int] = None,
                stream: bool = False) -> Any:
        """
        Generate a response from an AI agent.
        
        Args:
            prompt: The prompt to send to the agent
            agent_name: Specific agent to use (None for auto-select)
            temperature: Temperature override
            max_tokens: Max tokens override
            stream: Whether to stream the response
        
        Returns:
            If stream=True: Async generator of tokens
            If stream=False: Complete response string
        """
        # Select agent
        if agent_name:
            agent = self.agents.get(agent_name)
            if not agent:
                raise ValueError(f"Agent '{agent_name}' not available. Available: {self.get_available_agents()}")
        else:
            agent = self.select_agent(prompt)
            if not agent:
                return self._fallback_response(prompt)
        
        # Build full prompt with system prompt
        full_prompt = f"<system>{agent.system_prompt}</system>\n\n{prompt}"
        
        # Prepare request
        url = f"{agent.endpoint}/api/generate"
        body = {
            "model": agent.model_name,
            "prompt": full_prompt,
            "stream": stream,
            "options": {
                "temperature": temperature if temperature is not None else agent.temperature,
                "num_predict": max_tokens if max_tokens is not None else agent.max_tokens,
                "num_ctx": int(os.getenv("OLLAMA_CONTEXT_WINDOW", "4096")),
            },
        }
        
        if stream:
            return self._stream_request(url, body)
        else:
            return self._single_request(url, body)
    
    def _single_request(self, url: str, body: Dict) -> str:
        """Make a single (non-streaming) request."""
        try:
            response = requests.post(url, json=body, timeout=120)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict):
                return data.get("response") or data.get("completion") or data.get("text") or ""
            return str(data)
        except Exception as e:
            print(f"AI Agent error: {e}")
            return self._fallback_response(body.get("prompt", ""))
    
    def _stream_request(self, url: str, body: Dict):
        """Make a streaming request."""
        try:
            with requests.post(url, json=body, stream=True, timeout=300) as response:
                response.raise_for_status()
                for raw_line in response.iter_lines(decode_unicode=True):
                    if not raw_line:
                        continue
                    line = self._clean_stream_line(raw_line)
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
            print(f"AI Agent streaming error: {e}")
            yield self._fallback_response(body.get("prompt", ""))
    
    def _clean_stream_line(self, line: str) -> str:
        """Clean a stream line."""
        if isinstance(line, bytes):
            line = line.decode("utf-8", errors="ignore")
        payload = line.strip()
        if payload.startswith("data:"):
            payload = payload[len("data:"):].strip()
        return payload
    
    def _fallback_response(self, prompt: str) -> str:
        """Generate a fallback response when no agents are available."""
        # Try to extract intent from prompt
        prompt_lower = prompt.lower()
        
        if any(kw in prompt_lower for kw in ["job", "internship", "placement"]):
            return "I can help you with job and internship information. Here are some resources to check: LinkedIn, Indeed, your college placement cell, and company career pages."
        
        if any(kw in prompt_lower for kw in ["code", "python", "program"]):
            return "I can help with coding questions. Please check your notes or try a specific question about algorithms, data structures, or debugging."
        
        if any(kw in prompt_lower for kw in ["attendance", "bunk", "class"]):
            return "For attendance and bunk information, please check your dashboard or contact your faculty."
        
        return "I'm currently unable to connect to AI agents. Please try again later or check your question for specific keywords."


# Global agent system instance
agent_system = AIAgentSystem()


def get_agent_system():
    """Get the global agent system instance."""
    return agent_system
