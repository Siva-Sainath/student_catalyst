"""
Synthetic data generators — all use datetime.now() so data is always
relevant to the current week.
"""

from __future__ import annotations

from datetime import datetime, timedelta, date
from random import Random
from typing import Any, Dict, List


def _rng(seed: int) -> Random:
    return Random(1000 + seed)


def _today() -> date:
    return datetime.now().date()


def _greeting() -> str:
    h = datetime.now().hour
    if h < 12:  return "Good morning"
    if h < 17:  return "Good afternoon"
    return "Good evening"


# ── Subjects ────────────────────────────────────────────────────────────────

SUBJECTS = [
    ("OS",           "CS301", "Dr. R. Krishnan",    "SJT 301"),
    ("Algorithms",   "CS302", "Prof. S. Mehta",     "SJT 302"),
    ("Mobile dev",   "CS303", "Dr. P. Rajan",       "SJT 303"),
    ("TFC",          "CS304", "Dr. A. Priya",       "SJT 304"),
    ("Cryptography", "CS305", "Prof. K. Anand",     "SJT 305"),
    ("LAO",          "CS306", "Dr. V. Sharma",      "SJT 401"),
    ("SE",           "CS307", "Prof. M. Gupta",     "SJT 402"),
]

TIME_SLOTS = [
    ("09:00", "10:00"),
    ("11:00", "12:00"),
    ("14:00", "15:00"),
    ("16:00", "17:00"),
]



# ── Dashboard ───────────────────────────────────────────────────────────────

def build_dashboard_payload(user_id: int, user_name: str) -> Dict[str, Any]:
    rng = _rng(user_id)
    attendance = round(rng.uniform(74.0, 91.0), 1)
    cgpa = round(rng.uniform(7.4, 9.2), 2)
    credits = rng.randint(110, 145)
    safe_bunks = max(0, int((attendance - 75)))
    due_today = rng.randint(0, 3)
    exam_days = rng.randint(8, 18)
    tips = [
        "You have 2 safe bunks in OS this week — use them wisely.",
        "Your CGPA can jump 0.2 points if you score 85+ in the upcoming internal.",
        "Apply to the Google internship before Jun 30 — you're a strong match.",
        "Attend the next 3 CN classes to get back above 80%.",
        "Your Finance tracker shows ₹1,200 saved vs. last month — great work!",
    ]
    return {
        "greeting": f"{_greeting()}, {user_name.split()[0]}",
        "student": {
            "name": user_name,
            "semester": "Sem 6",
            "department": "CSE",
            "attendance": attendance,
            "cgpa": cgpa,
            "credits": credits,
        },
        "stats": {
            "safe_bunks": safe_bunks,
            "assignments_due_today": due_today,
            "exam_in_days": exam_days,
        },
        "ai_tip": rng.choice(tips),
    }


# ── Attendance ───────────────────────────────────────────────────────────────

def build_attendance_payload(user_id: int) -> Dict[str, Any]:
    rng = _rng(user_id)
    courses = []
    for name, code, professor, _ in SUBJECTS:
        total = rng.randint(30, 45)
        pct = rng.uniform(68, 95)
        attended = int(total * pct / 100)
        pct_actual = round(attended / total * 100, 1)
        safe_bunks = max(0, int(attended - total * 0.75))

        if pct_actual >= 85:
            status = "safe"
        elif pct_actual >= 75:
            status = "warning"
        else:
            status = "danger"

        courses.append({
            "subject": name,
            "code": code,
            "professor": professor,
            "total": total,
            "attended": attended,
            "percentage": pct_actual,
            "safe_bunks": safe_bunks,
            "status": status,
        })

    overall_attended = sum(c["attended"] for c in courses)
    overall_total = sum(c["total"] for c in courses)
    overall_pct = round(overall_attended / overall_total * 100, 1)

    return {
        "courses": courses,
        "overall": {
            "attended": overall_attended,
            "total": overall_total,
            "percentage": overall_pct,
            "status": "safe" if overall_pct >= 85 else "warning" if overall_pct >= 75 else "danger",
        },
    }


# ── Schedule ─────────────────────────────────────────────────────────────────

def build_schedule_payload(user_id: int) -> Dict[str, Any]:
    rng = _rng(user_id)
    today = _today()
    # Start from Monday of this week
    monday = today - timedelta(days=today.weekday())
    week = []
    for day_offset in range(7):  # Mon–Sun
        day_date = monday + timedelta(days=day_offset)
        day_name = day_date.strftime("%A")
        classes = []
        # Pick 3 or 4 slots randomly for this day
        slots_today = rng.sample(TIME_SLOTS, k=rng.choice([3, 4]))
        slots_today.sort()
        for i, (start, end) in enumerate(slots_today):
            subject = SUBJECTS[(day_offset * 3 + i) % len(SUBJECTS)]
            cancelled = rng.random() < 0.07
            classes.append({
                "subject": subject[0],
                "code": subject[1],
                "faculty": subject[2],
                "room": subject[3],
                "start_time": start,
                "end_time": end,
                "status": "cancelled" if cancelled else "scheduled",
            })
        week.append({
            "day": day_name[:3],
            "full_day": day_name,
            "date": day_date.isoformat(),
            "is_today": day_date == today,
            "classes": classes,
        })
    return {"week": week, "today": today.isoformat()}


# ── Assignments ──────────────────────────────────────────────────────────────

def build_assignments_payload(user_id: int) -> Dict[str, Any]:
    rng = _rng(user_id)
    titles = [
        ("Process Scheduling simulation",                 "OS",           "coding"),
        ("Compare QuickSort vs MergeSort",                "Algorithms",   "coding"),
        ("Create TabBar navigation app",                  "Mobile dev",   "lab"),
        ("Verify French curves theorem",                   "TFC",          "design"),
        ("Implement RSA cryptography demo",                "Cryptography", "coding"),
        ("Matrix transpose calculation",                  "LAO",          "math"),
        ("Draw UML Sequence diagram for checkout",        "SE",           "design"),
    ]
    assignments = []
    today = _today()
    for i, (title, subject, atype) in enumerate(titles):
        due_offset = rng.randint(0, 12)
        due = today + timedelta(days=due_offset)
        urgency = "urgent" if due_offset <= 1 else "soon" if due_offset <= 4 else "normal"
        assignments.append({
            "id": i + 1,
            "title": title,
            "subject": subject,
            "type": atype,
            "due_date": due.isoformat(),
            "due_label": f"Due {due.strftime('%b %d')}",
            "urgency": urgency,
            "status": "pending",
        })
    # Sort by due date
    assignments.sort(key=lambda x: x["due_date"])
    return {"assignments": assignments}


# ── Placement ─────────────────────────────────────────────────────────────────

def build_placement_payload(user_id: int) -> Dict[str, Any]:
    rng = _rng(user_id)
    STAGES = ["Applied", "OA", "Technical Round", "HR Round", "Offer", "Rejected"]
    companies = [
        ("Google",    "SWE Intern",              "https://careers.google.com"),
        ("Microsoft", "SDE Intern",              "https://careers.microsoft.com"),
        ("Razorpay",  "Frontend Engineer Intern","https://razorpay.com/jobs/"),
        ("Swiggy",    "Backend Intern",          "https://careers.swiggy.com/#/"),
        ("CRED",      "Data Analyst Intern",     "https://careers.cred.club/"),
        ("Stripe",    "Infrastructure Intern",   "https://stripe.com/jobs"),
    ]
    applications = []
    for i, (company, role, link) in enumerate(companies):
        stage = rng.choice(STAGES)
        days_ago = rng.randint(0, 14)
        updated = _today() - timedelta(days=days_ago)
        stage_index = STAGES.index(stage)
        applications.append({
            "id": i + 1,
            "company": company,
            "role": role,
            "stage": stage,
            "stage_index": stage_index,
            "total_stages": len(STAGES),
            "last_updated": updated.isoformat(),
            "careers_link": link,
        })
    return {"applications": applications, "all_stages": STAGES}


# ── Finance ───────────────────────────────────────────────────────────────────

def build_finance_payload(user_id: int) -> Dict[str, Any]:
    rng = _rng(user_id)
    breakdown = [
        ("Food",          rng.randint(2200, 3200)),
        ("Transport",     rng.randint(400,  700)),
        ("Books & Notes", rng.randint(600,  1100)),
        ("Entertainment", rng.randint(300,  600)),
        ("Miscellaneous", rng.randint(200,  500)),
    ]
    total = sum(amt for _, amt in breakdown)
    items = [
        {
            "category": cat,
            "amount": amt,
            "percentage": round(amt / total * 100, 1),
        }
        for cat, amt in breakdown
    ]
    daily_avg = round(total / 30, 2)
    return {
        "month": datetime.now().strftime("%B %Y"),
        "total_spent": total,
        "daily_average": daily_avg,
        "budget": 7000,
        "budget_remaining": max(0, 7000 - total),
        "breakdown": items,
    }
