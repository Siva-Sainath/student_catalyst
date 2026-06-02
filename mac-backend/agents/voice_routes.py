"""Map voice actions to app routes (web + mobile deep links)."""

ACTION_ROUTES = {
    "home": "/",
    "attendance": "/attendance",
    "schedule": "/schedule",
    "jobs": "/jobs",
    "finance": "/finance",
    "assignments": "/assignments",
    "travel": "/travel",
    "placement": "/placement",
    "more": "/more",
    "chat": "/chat",
}


def with_route(result: dict) -> dict:
    action = result.get("action", "unknown")
    result["route"] = ACTION_ROUTES.get(action)
    return result
