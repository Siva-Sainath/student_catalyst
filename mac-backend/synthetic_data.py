from __future__ import annotations

from datetime import datetime, timedelta
from random import Random
from typing import Any, Dict, List


def _rng_for_user(user_id: int) -> Random:
  return Random(1000 + user_id)


def _today() -> datetime:
  return datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)


def build_dashboard_payload(user_id: int, user_name: str) -> Dict[str, Any]:
  rng = _rng_for_user(user_id)
  attendance = round(rng.uniform(74.0, 91.0), 1)
  cgpa = round(rng.uniform(7.2, 9.4), 2)
  credits = rng.randint(110, 150)
  bunk_left = max(0, int((attendance - 75) // 1))
  return {
    "greeting": f"Good evening, {user_name}",
    "student": {
      "attendance": attendance,
      "cgpa": cgpa,
      "credits": credits,
      "semester": "Sem 6",
      "department": "CSE",
    },
    "stats": {
      "bunk_left": bunk_left,
      "assignments_due_today": rng.randint(0, 3),
      "exam_in_days": rng.randint(7, 18),
    },
    "ai_tip": "You can safely skip one low-weight lecture this week if you attend all labs.",
  }


def build_schedule_payload(user_id: int) -> Dict[str, Any]:
  rng = _rng_for_user(user_id)
  start = _today()
  subjects = [
    ("Data Structures", "A201", "Dr. Krishnan"),
    ("Operating Systems", "B105", "Prof. Mehta"),
    ("Computer Networks", "C301", "Dr. Rajan"),
    ("DBMS", "B201", "Dr. Priya"),
    ("Software Engineering", "A301", "Prof. Anand"),
  ]
  week: List[Dict[str, Any]] = []
  for day in range(6):
    date = start + timedelta(days=day)
    classes = []
    for slot, hour in enumerate([9, 11, 14]):
      subject = subjects[(day + slot) % len(subjects)]
      classes.append(
        {
          "subject": subject[0],
          "start_time": f"{hour:02d}:00",
          "end_time": f"{hour + 1:02d}:00",
          "room": subject[1],
          "faculty": subject[2],
          "status": "cancelled" if rng.random() < 0.08 else "scheduled",
        }
      )
    week.append({"day": date.strftime("%a"), "date": date.date().isoformat(), "classes": classes})
  return {"week": week}


def build_assignments_payload(user_id: int) -> Dict[str, Any]:
  rng = _rng_for_user(user_id)
  titles = [
    ("Implement AVL Tree", "Data Structures", "coding"),
    ("Semaphore Report", "Operating Systems", "report"),
    ("ER Diagram Assignment", "DBMS", "design"),
    ("Routing Lab Notes", "Computer Networks", "lab"),
  ]
  items = []
  for idx, title in enumerate(titles, start=1):
    due = _today() + timedelta(days=rng.randint(0, 12))
    items.append(
      {
        "id": idx,
        "title": title[0],
        "subject": title[1],
        "type": title[2],
        "priority": rng.choice(["high", "medium", "low"]),
        "due_at": due.isoformat(),
        "status": "pending",
      }
    )
  return {"assignments": items}


def build_placement_payload(user_id: int) -> Dict[str, Any]:
  rng = _rng_for_user(user_id)
  stages = ["Applied", "OA", "Interview", "Offer", "Rejected"]
  companies = ["Google", "Microsoft", "Amazon", "Razorpay", "Swiggy", "Flipkart"]
  applications = []
  for idx, company in enumerate(companies, start=1):
    applications.append(
      {
        "id": idx,
        "company": company,
        "role": rng.choice(["SWE Intern", "Backend Intern", "Product Intern", "SDE-1"]),
        "stage": rng.choice(stages),
        "updated_at": (_today() - timedelta(days=rng.randint(0, 10))).isoformat(),
      }
    )
  return {"applications": applications}


def build_travel_payload(user_id: int) -> Dict[str, Any]:
  rng = _rng_for_user(user_id)
  return {
    "routes": [
      {"mode": "Bus", "from": "Hostel Gate", "to": "Campus Block A", "eta_min": rng.randint(8, 14)},
      {"mode": "Shuttle", "from": "Main Gate", "to": "Railway Station", "eta_min": rng.randint(20, 35)},
      {"mode": "Cab", "from": "Campus", "to": "Airport", "eta_min": rng.randint(75, 100)},
    ]
  }
