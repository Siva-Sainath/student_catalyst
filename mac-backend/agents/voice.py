from typing import Dict


def parse_voice_command(text: str) -> Dict[str, any]:
  normalized = text.lower().strip()
  
  # Remove common prefixes
  for prefix in ["hey", "hi", "hello", "okay", "please", "can you", "show me", "open", "go to", "navigate to"]:
    if normalized.startswith(prefix):
      normalized = normalized[len(prefix):].strip()

  # Check for specific commands
  if any(word in normalized for word in ["attendance", "presence", "bunk", "absent", "present"]):
    return {"action": "attendance", "params": {}, "response": "Opening your attendance report."}

  if any(word in normalized for word in ["dashboard", "home", "main", "overview"]):
    return {"action": "home", "params": {}, "response": "Navigating to your dashboard."}

  if any(word in normalized for word in ["schedule", "timetable", "class", "classes", "lecture", "timetable"]):
    return {"action": "schedule", "params": {}, "response": "Here is your schedule."}

  if any(word in normalized for word in ["job", "jobs", "internship", "placement", "career", "opportunity"]):
    return {"action": "jobs", "params": {}, "response": "Showing job recommendations."}

  if any(word in normalized for word in ["finance", "budget", "spend", "spending", "money", "expense", "financial"]):
    return {"action": "finance", "params": {}, "response": "Checking your finance dashboard."}

  if any(word in normalized for word in ["assignment", "assignments", "homework", "task", "project", "due"]):
    return {"action": "assignments", "params": {}, "response": "Showing your assignments."}

  if any(word in normalized for word in ["travel", "route", "transport", "bus", "commute"]):
    return {"action": "travel", "params": {}, "response": "Showing your travel routes."}

  if any(word in normalized for word in ["placement", "company", "interview", "application"]):
    return {"action": "placement", "params": {}, "response": "Showing placement information."}

  if any(word in normalized for word in ["chat", "help", "explain", "question", "answer", "tell me", "what is", "how to"]):
    return {"action": "chat", "params": {"topic": "General"}, "response": "I can help with your question. Please send your message."}

  # If it's a question or statement, treat it as chat
  if normalized.endswith("?") or len(normalized.split()) > 3:
    return {"action": "chat", "params": {"topic": "General"}, "response": f"I heard: {text}. How can I help with that?"}

  return {
    "action": "unknown",
    "params": {},
    "response": "I didn't understand that command. Try asking me about attendance, jobs, schedule, finance, assignments, travel, or placement. Or just ask me a question!",
  }
