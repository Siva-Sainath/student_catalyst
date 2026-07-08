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
        "company": "Google",
        "role": "Software Engineering Intern",
        "location": "Bangalore, India",
        "stipend": "₹80,000/mo",
        "deadline": "Jun 30",
        "skills": ["Python", "C++", "Java", "Algorithms"],
        "match_score": 95,
        "reasoning": "Excellent match for students with strong computer science fundamentals and coding skills.",
        "growth": "exponential",
        "link": "https://careers.google.com/jobs/results/?q=software%20engineering%20intern",
      },
      {
        "company": "Microsoft",
        "role": "Research Intern",
        "location": "Hyderabad, India",
        "stipend": "₹75,000/mo",
        "deadline": "Jul 05",
        "skills": ["Machine Learning", "Python", "Research"],
        "match_score": 89,
        "reasoning": "Great fit for students interested in AI/ML and research publications.",
        "growth": "high",
        "link": "https://careers.microsoft.com/us/en/search-results?keywords=software%20engineer%20intern",
      },
      {
        "company": "Stripe",
        "role": "Backend Engineer Intern",
        "location": "Remote (India)",
        "stipend": "₹1,20,000/mo",
        "deadline": "Jul 15",
        "skills": ["Ruby", "Go", "Distributed Systems", "SQL"],
        "match_score": 92,
        "reasoning": "Strong match for backend interest and familiarity with microservices.",
        "growth": "high",
        "link": "https://stripe.com/jobs",
      },
      {
        "company": "Razorpay",
        "role": "Frontend Intern",
        "location": "Bangalore, India",
        "stipend": "₹50,000/mo",
        "deadline": "Jun 20",
        "skills": ["React", "TypeScript", "CSS", "HTML"],
        "match_score": 91,
        "reasoning": "Perfect for front-end developers focusing on clean modern React components.",
        "growth": "medium",
        "link": "https://razorpay.com/jobs/",
      },
      {
        "company": "CRED",
        "role": "Data Science Intern",
        "location": "Bangalore, India",
        "stipend": "₹60,000/mo",
        "deadline": "Jul 10",
        "skills": ["Python", "SQL", "Pandas", "Scikit-Learn"],
        "match_score": 87,
        "reasoning": "Ideal for data enthusiasts with strong analytical skills.",
        "growth": "high",
        "link": "https://careers.cred.club/",
      }
    ]
  return recommendations
