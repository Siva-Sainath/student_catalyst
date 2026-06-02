"""
Enhanced Voice Command System
Uses AI agents for complex voice command understanding and execution.
Supports multi-step commands, natural language, and context-aware actions.
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .voice import parse_voice_command as simple_parse_voice_command
from .ai_agent import get_agent_system


class CommandType(Enum):
    """Types of voice commands."""
    NAVIGATION = "navigation"      # Navigate to a page
    QUERY = "query"               # Ask a question (use AI)
    ACTION = "action"             # Perform an action
    MULTI_STEP = "multi_step"     # Multi-step command
    COMPLEX = "complex"           # Requires AI understanding


@dataclass
class ParsedCommand:
    """Parsed voice command with intent and entities."""
    command_type: CommandType
    intent: str
    entities: Dict[str, str]
    action: Optional[str] = None
    params: Optional[Dict] = None
    response: str = ""
    follow_up: Optional[str] = None
    requires_ai: bool = False
    agent_name: Optional[str] = None


class EnhancedVoiceProcessor:
    """
    Enhanced voice command processor that uses AI for complex understanding.
    """
    
    def __init__(self):
        self.agent_system = get_agent_system()
        self.command_patterns = self._build_command_patterns()
    
    def _build_command_patterns(self) -> Dict[str, Dict]:
        """Build regex patterns for common commands."""
        return {
            # Navigation patterns
            "navigation": {
                "pattern": r"(?:open|go to|navigate to|show me|take me to|launch)\s+(.+?)(?:\s+page|\s+screen|$)",
                "intent": "navigate",
                "entity_type": "page"
            },
            # Query patterns
            "query": {
                "pattern": r"(?:what is|what are|how do I|how to|explain|tell me about|describe|who is|where is|when is)\s+(.+)",
                "intent": "query",
                "entity_type": "question"
            },
            # Action patterns
            "action": {
                "pattern": r"(?:create|add|new|make|set up|delete|remove|update|edit|modify|save|send)\s+(.+)",
                "intent": "action",
                "entity_type": "action"
            },
            # Search patterns
            "search": {
                "pattern": r"(?:search for|find|look for|discover|browse)\s+(.+)",
                "intent": "search",
                "entity_type": "query"
            },
            # Job-specific patterns
            "job_search": {
                "pattern": r"(?:find|show|list|get|search for)\s+(?:me\s+)?(?:jobs|internships|placements|opportunities|companies)\s*(?:in|for|at|about)?\s*(.+)",
                "intent": "job_search",
                "entity_type": "jobs"
            },
        }
    
    def parse(self, text: str) -> ParsedCommand:
        """
        Parse voice text into a structured command.
        
        Args:
            text: The voice input text
        
        Returns:
            ParsedCommand with intent, entities, and execution plan
        """
        # Clean and normalize text
        cleaned = self._clean_text(text)
        
        # First, try simple keyword matching (fast)
        simple_result = simple_parse_voice_command(cleaned)
        if simple_result.get("action") != "unknown":
            return ParsedCommand(
                command_type=CommandType.NAVIGATION if simple_result["action"] in [
                    "attendance", "schedule", "jobs", "finance", "home", 
                    "assignments", "travel", "placement", "more"
                ] else CommandType.ACTION,
                intent=simple_result["action"],
                entities={},
                action=simple_result["action"],
                params=simple_result.get("params", {}),
                response=simple_result["response"],
                requires_ai=False
            )
        
        # Try pattern matching
        for pattern_name, pattern_info in self.command_patterns.items():
            match = re.search(pattern_info["pattern"], cleaned, re.IGNORECASE)
            if match:
                entity = match.group(1).strip()
                return self._create_command_from_pattern(
                    pattern_name, pattern_info, entity, cleaned
                )
        
        # Check if it's a question that needs AI
        if self._is_question(cleaned):
            return self._create_ai_query_command(cleaned)
        
        # Check for job-related queries
        if self._is_job_query(cleaned):
            return self._create_job_search_command(cleaned)
        
        # Check for complex multi-step commands
        if self._is_multi_step(cleaned):
            return self._create_multi_step_command(cleaned)
        
        # Default to AI understanding
        return self._create_ai_command(cleaned)
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove common prefixes
        prefixes = ["hey", "hi", "hello", "okay", "ok", "please", "can you", 
                   "could you", "would you", "i want to", "i need to", "i'd like to"]
        for prefix in prefixes:
            if text.lower().startswith(prefix):
                text = text[len(prefix):].strip()
        
        # Remove trailing punctuation
        text = text.strip(".!?, ")
        return text
    
    def _is_question(self, text: str) -> bool:
        """Check if text is a question."""
        question_words = ["what", "how", "why", "when", "where", "who", "which", 
                         "can", "could", "would", "should", "is", "are", "do", "does"]
        text_lower = text.lower()
        return (text.endswith("?") or 
                any(text_lower.startswith(word) for word in question_words))
    
    def _is_job_query(self, text: str) -> bool:
        """Check if text is a job-related query."""
        job_keywords = ["job", "internship", "placement", "career", "company", 
                       "interview", "resume", "cv", "hiring", "recruitment", 
                       "opportunity", "position", "role", "apply"]
        text_lower = text.lower()
        return any(kw in text_lower for kw in job_keywords)
    
    def _is_multi_step(self, text: str) -> bool:
        """Check if text contains multiple commands."""
        conjunctions = ["and", "then", "also", "after that", "next"]
        text_lower = text.lower()
        return any(conj in text_lower for conj in conjunctions)
    
    def _create_command_from_pattern(self, pattern_name: str, 
                                     pattern_info: Dict, 
                                     entity: str, 
                                     original_text: str) -> ParsedCommand:
        """Create a command from a matched pattern."""
        intent = pattern_info["intent"]
        entity_type = pattern_info["entity_type"]
        
        # Map entity to action
        action_map = {
            "page": self._map_page_entity,
            "question": lambda e: "query",
            "action": lambda e: e,
            "query": lambda e: "search",
            "jobs": lambda e: "jobs",
        }
        
        action = action_map.get(entity_type, lambda e: e)(entity)
        
        return ParsedCommand(
            command_type=CommandType.NAVIGATION if intent == "navigate" else 
                          CommandType.QUERY if intent == "query" else 
                          CommandType.ACTION,
            intent=intent,
            entities={entity_type: entity},
            action=action,
            params={"query": entity} if intent in ["query", "search"] else {},
            response=f"Understood: {intent} {entity}",
            requires_ai=(intent in ["query", "search"])
        )
    
    def _map_page_entity(self, entity: str) -> str:
        """Map page entity to action."""
        page_map = {
            "attendance": "attendance",
            "schedule": "schedule",
            "timetable": "schedule",
            "classes": "schedule",
            "class": "schedule",
            "jobs": "jobs",
            "job": "jobs",
            "internships": "jobs",
            "internship": "jobs",
            "placements": "placement",
            "placement": "placement",
            "finance": "finance",
            "budget": "finance",
            "money": "finance",
            "assignments": "assignments",
            "assignment": "assignments",
            "homework": "assignments",
            "travel": "travel",
            "routes": "travel",
            "dashboard": "home",
            "home": "home",
            "main": "home",
            "more": "more",
            "settings": "more",
        }
        return page_map.get(entity.lower(), entity.lower())
    
    def _create_ai_query_command(self, text: str) -> ParsedCommand:
        """Create a command for AI query."""
        # Select the best agent for this query
        agent = self.agent_system.select_agent(text)
        
        return ParsedCommand(
            command_type=CommandType.QUERY,
            intent="ai_query",
            entities={"query": text},
            action="chat",
            params={"message": text, "topic": "General"},
            response="Let me think about that...",
            requires_ai=True,
            agent_name=agent.name if agent else None
        )
    
    def _create_job_search_command(self, text: str) -> ParsedCommand:
        """Create a command for job search."""
        # Use Hermes agent for job search
        return ParsedCommand(
            command_type=CommandType.QUERY,
            intent="job_search",
            entities={"query": text},
            action="jobs",
            params={"message": text, "topic": "Jobs"},
            response="Searching for job opportunities...",
            requires_ai=True,
            agent_name="hermes" if "hermes" in self.agent_system.get_available_agents() else None
        )
    
    def _create_multi_step_command(self, text: str) -> ParsedCommand:
        """Create a command for multi-step operations."""
        # Split into steps
        steps = self._split_steps(text)
        
        return ParsedCommand(
            command_type=CommandType.MULTI_STEP,
            intent="multi_step",
            entities={"steps": steps},
            action="multi_step",
            params={"steps": steps},
            response=f"I'll help you with {len(steps)} tasks",
            requires_ai=True,
            follow_up=steps[0] if steps else None
        )
    
    def _split_steps(self, text: str) -> List[str]:
        """Split text into individual steps."""
        # Split by conjunctions
        conjunctions = ["and", "then", "also", "after that", "next"]
        steps = []
        current = text
        
        for conj in conjunctions:
            parts = current.lower().split(conj)
            if len(parts) > 1:
                steps.extend([p.strip() for p in parts if p.strip()])
                break
        
        if not steps:
            steps = [text]
        
        return steps
    
    def _create_ai_command(self, text: str) -> ParsedCommand:
        """Create a command that uses AI for understanding."""
        # Use AI to understand the intent
        prompt = f"""Analyze this voice command and determine the intent:

Command: "{text}"

Possible intents:
- navigation: Navigate to a page
- query: Ask a question or get information
- action: Perform an action (create, delete, update)
- search: Search for something
- job_search: Search for jobs/internships

Respond with ONLY a JSON object:
{{
  "intent": "one of the above intents",
  "entities": {{ "key": "value" }},
  "action": "page name or action",
  "params": {{}}
}}

JSON:"""
        
        try:
            # Use AI to understand the command
            response = self.agent_system.generate(
                prompt, 
                agent_name="hermes",
                temperature=0.1,
                max_tokens=256,
                stream=False
            )
            
            # Parse the JSON response
            import json
            # Extract JSON from response
            json_match = re.search(r'\{[^}]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                return ParsedCommand(
                    command_type=CommandType[result.get("intent", "query").upper()],
                    intent=result.get("intent", "query"),
                    entities=result.get("entities", {}),
                    action=result.get("action"),
                    params=result.get("params", {}),
                    response=f"Understood: {result.get('intent', 'query')}",
                    requires_ai=True
                )
        except Exception as e:
            print(f"AI command parsing error: {e}")
        
        # Fallback to simple parsing
        return ParsedCommand(
            command_type=CommandType.QUERY,
            intent="query",
            entities={"query": text},
            action="chat",
            params={"message": text, "topic": "General"},
            response="Let me help you with that",
            requires_ai=True
        )
    
    def execute(self, command: ParsedCommand, user_id: Optional[int] = None) -> Dict:
        """
        Execute a parsed command.
        
        Args:
            command: The parsed command to execute
            user_id: Optional user ID for personalized responses
        
        Returns:
            Dictionary with execution result
        """
        result = {
            "action": command.action,
            "params": command.params or {},
            "response": command.response,
            "success": True
        }
        
        # Handle AI queries
        if command.requires_ai and command.command_type == CommandType.QUERY:
            try:
                if command.intent == "job_search":
                    # Use Hermes for job search
                    response = self._execute_job_search(command, user_id)
                    result["response"] = response
                    result["ai_response"] = response
                elif command.intent == "ai_query":
                    # Use selected agent for query
                    response = self._execute_ai_query(command)
                    result["response"] = response
                    result["ai_response"] = response
            except Exception as e:
                result["response"] = f"Error: {str(e)}"
                result["success"] = False
        
        return result
    
    def _execute_job_search(self, command: ParsedCommand, user_id: Optional[int]) -> str:
        """Execute a job search query using Hermes agent."""
        query = command.entities.get("query", command.params.get("message", ""))
        
        # Build a comprehensive job search prompt
        prompt = f"""You are a career advisor specializing in helping college students find jobs and internships.

User query: "{query}"

Provide a comprehensive response that includes:
1. Understanding of what the user is looking for
2. Specific job roles or companies that match
3. Resources where they can find these opportunities
4. Tips for applying
5. Any relevant skills they should highlight

Be specific and actionable. If the user mentions a specific company, role, or technology, focus on that.

Response:"""
        
        # Use Hermes agent if available
        if "hermes" in self.agent_system.get_available_agents():
            response = self.agent_system.generate(
                prompt,
                agent_name="hermes",
                temperature=0.3,
                max_tokens=1024,
                stream=False
            )
            return response
        else:
            # Fallback to any available agent
            return self.agent_system.generate(
                prompt,
                temperature=0.3,
                max_tokens=1024,
                stream=False
            )
    
    def _execute_ai_query(self, command: ParsedCommand) -> str:
        """Execute an AI query using the selected agent."""
        query = command.entities.get("query", command.params.get("message", ""))
        
        # Use the agent specified in the command, or auto-select
        agent_name = command.agent_name
        
        return self.agent_system.generate(
            query,
            agent_name=agent_name,
            temperature=0.7,
            max_tokens=1024,
            stream=False
        )


# Global instance
voice_processor = EnhancedVoiceProcessor()


def parse_enhanced_voice_command(text: str) -> Dict:
    """
    Parse voice command with enhanced AI understanding.
    
    Args:
        text: Voice input text
    
    Returns:
        Dictionary with action, params, and response
    """
    command = voice_processor.parse(text)
    result = voice_processor.execute(command)
    return result
