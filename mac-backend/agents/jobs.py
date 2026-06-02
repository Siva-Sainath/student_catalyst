import json
from models import User
from agents.hermes_harness import generate as harness_generate


def build_jobs_prompt(user: User) -> str:
  return (
    f"You are a college career advisor. A student is majoring in {user.major or 'Computer Science'} "
    f"with a GPA of {user.gpa or 0.0}. Their skills include: {', '.join(user.skills or [])}. "
    f"Recommend 5 internship or entry-level job opportunities that suit their background. "
    f"Provide the response as a JSON array of objects with fields: company, role, location, stipend, deadline, skills, match_score, reasoning, growth, link. "
    f"Provide realistic job posting links (e.g. Google -> https://careers.google.com, Microsoft -> https://careers.microsoft.com). "
    f"Use a score between 0 and 100, and keep the answer concise."
  )


def parse_job_recommendations(text: str):
  trimmed = text.strip()
  try:
    if trimmed.startswith("```"):
      trimmed = trimmed.strip("`\n")
    return json.loads(trimmed)
  except json.JSONDecodeError:
    # Try extracting JSON from text
    start = trimmed.find("[")
    end = trimmed.rfind("]")
    if start != -1 and end != -1:
      try:
        return json.loads(trimmed[start:end + 1])
      except json.JSONDecodeError:
        pass
  return []


def get_job_recommendations(user: User):
  prompt = build_jobs_prompt(user)
  output = harness_generate(prompt, task="agentic", text_hint="jobs internship", temperature=0.25, max_tokens=700)
  recommendations = parse_job_recommendations(output)
  if not recommendations:
    recommendations = [
      {
        "company": "Innovate Labs",
        "role": "Software Engineering Intern",
        "location": "Remote",
        "stipend": "₹70,000/mo",
        "deadline": "Jun 25",
        "skills": ["Python", "React", "Data Structures"],
        "match_score": 92,
        "reasoning": "Strong fit for backend and full-stack skills.",
        "growth": "high",
        "link": "https://www.google.com/about/careers/applications/jobs/results/?q=software%20engineering%20intern",
      }
    ]
  return recommendations
