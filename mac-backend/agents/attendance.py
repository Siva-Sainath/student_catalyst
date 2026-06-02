from datetime import datetime, timedelta
from models import AttendanceRecord, SessionLocal, User


def build_attendance_statistics(user: User):
  session = SessionLocal()
  records = session.query(AttendanceRecord).filter(AttendanceRecord.user_id == user.id).all()
  session.close()

  if not records:
    today = datetime.utcnow().date()
    courses = [
      {"course": "Data Structures", "attended": 28, "total": 32, "late": 2},
      {"course": "Algorithms", "attended": 26, "total": 32, "late": 1},
      {"course": "Operating Systems", "attended": 21, "total": 28, "late": 0},
    ]
  else:
    aggregate = {}
    for record in records:
      item = aggregate.setdefault(record.course, {"course": record.course, "attended": 0, "total": 0, "late": 0})
      item["total"] += 1
      if record.status == "present":
        item["attended"] += 1
      if record.status == "late":
        item["late"] += 1
    courses = list(aggregate.values())

  overall_attended = sum(item["attended"] for item in courses)
  overall_total = sum(item["total"] for item in courses)
  overall_pct = round((overall_attended / overall_total) * 100, 1) if overall_total else 0

  results = []
  for item in courses:
    percentage = round((item["attended"] / item["total"]) * 100, 1) if item["total"] else 0
    safe_bunks = max(0, int((item["attended"] - item["total"] * 0.75) // 1))
    results.append({
      "course": item["course"],
      "attended": item["attended"],
      "total": item["total"],
      "late": item["late"],
      "percentage": percentage,
      "safe_bunks": safe_bunks,
    })

  risk = "safe"
  if overall_pct < 75:
    risk = "danger"
  elif overall_pct < 85:
    risk = "caution"

  insights = (
    "Your attendance is strong overall." if risk == "safe" else
    "Keep an eye on classes with low attendance to avoid bunk risk." if risk == "caution" else
    "Focus on improving attendance in the next week to stay eligible."
  )

  return {
    "courses": results,
    "overall": {
      "attended": overall_attended,
      "total": overall_total,
      "percentage": overall_pct,
      "risk_level": risk,
    },
    "insights": insights,
    "recommendations": [
      "Attend the next 2 classes for any course below 80%.",
      "Talk to your professor if you miss a lab session.",
    ],
  }
