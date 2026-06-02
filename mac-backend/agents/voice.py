from typing import Dict
from agents.voice_routes import with_route


def parse_voice_command(text: str) -> Dict[str, any]:
  normalized = text.lower().strip()

  for prefix in ["hey", "hi", "hello", "okay", "please", "can you", "show me", "open", "go to", "navigate to"]:
    if normalized.startswith(prefix):
      normalized = normalized[len(prefix):].strip()

  if any(word in normalized for word in ["attendance", "presence", "bunk", "absent", "present"]):
    return with_route({"action": "attendance", "params": {}, "response": "Opening attendance."})

  if any(word in normalized for word in ["dashboard", "home", "main", "overview"]):
    return with_route({"action": "home", "params": {}, "response": "Going home."})

  if any(word in normalized for word in ["schedule", "timetable", "class", "classes", "lecture"]):
    return with_route({"action": "schedule", "params": {}, "response": "Opening schedule."})

  if any(word in normalized for word in ["job", "jobs", "internship", "career", "opportunity"]):
    return with_route({"action": "jobs", "params": {}, "response": "Opening jobs."})

  if "placement" in normalized and any(w in normalized for w in ["tracker", "application", "interview", "offer"]):
    return with_route({"action": "placement", "params": {}, "response": "Opening placement tracker."})

  if any(word in normalized for word in ["finance", "budget", "spend", "spending", "money", "expense"]):
    return with_route({"action": "finance", "params": {}, "response": "Opening finance."})

  if any(word in normalized for word in ["assignment", "assignments", "homework", "task", "due"]):
    return with_route({"action": "assignments", "params": {}, "response": "Opening assignments."})

  if any(word in normalized for word in ["travel", "route", "transport", "bus", "commute"]):
    return with_route({"action": "travel", "params": {}, "response": "Opening travel."})

  if any(word in normalized for word in ["settings", "more", "profile"]):
    return with_route({"action": "more", "params": {}, "response": "Opening more."})

  if any(word in normalized for word in ["chat", "campus ai", "help", "explain", "ask"]):
    return with_route({"action": "chat", "params": {"topic": "General"}, "response": "Opening chat."})

  if normalized.endswith("?") or len(normalized.split()) > 3:
    return with_route({
      "action": "chat",
      "params": {"topic": "General", "message": text},
      "response": "Opening chat with your question.",
    })

  return with_route({
    "action": "unknown",
    "params": {},
    "response": "Try: open attendance, jobs, schedule, finance, assignments, travel, or ask a question.",
  })
