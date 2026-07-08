"""
Hermes Agent — FastAPI Server
Clean endpoint design:
  POST /auth/demo
  GET  /health
  GET  /data/dashboard
  GET  /data/attendance
  GET  /data/schedule
  GET  /data/assignments
  GET  /data/placement
  GET  /data/finance
  GET  /data/jobs
  POST /agent/chat/stream     (SSE streaming)
  POST /agent/voice/command
"""

import os
import json
import threading
import logging
from datetime import datetime, timedelta
from typing import Optional, List

# ── Whisper STT (loaded once at startup) ──────────────────────────────────────
try:
    from faster_whisper import WhisperModel as _WhisperModel
    log_whisper = logging.getLogger("whisper")
    log_whisper.info("Loading Whisper base.en model (first run downloads ~150 MB)…")
    _whisper: _WhisperModel | None = _WhisperModel(
        "base.en", device="cpu", compute_type="int8"
    )
    log_whisper.info("Whisper model loaded ✓")
except Exception as _we:
    logging.warning("faster-whisper not available: %s — transcription endpoint will fail", _we)
    _whisper = None

import requests
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, HTMLResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from auth import login_or_create_user, verify_token
from models import init_db, SessionLocal, User, ChatMessage, MvpAssignment, MvpPlacementApplication, TransactionRecord, MvpScheduleEvent, MvpCourseAttendance
import synthetic_data as sd
import agents.hermes_harness as harness
import agents.job_scraper as job_scraper
import agents.chat as chat_agent
import agents.rag as rag

load_dotenv()
init_db()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hermes")

API_HOST = os.getenv("MAC_SERVER_HOST", "0.0.0.0")
API_PORT = int(os.getenv("MAC_SERVER_PORT", "8000"))
ORIGINS   = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

app = FastAPI(title="Hermes Agent — College Portal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Pre-warm models at startup ───────────────────────────────────────────────

def _prewarm():
    log.info("Pre-warming models…")
    results = harness.prewarm()
    for model, status in results.items():
        log.info("  %s → %s", model, status)


@app.on_event("startup")
def on_startup():
    if os.getenv("PREWARM_MODELS", "true").lower() == "true":
        t = threading.Thread(target=_prewarm, daemon=True)
        t.start()


# ── Auth helpers ─────────────────────────────────────────────────────────────

def current_user(authorization: Optional[str]) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = verify_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    session = SessionLocal()
    user = session.query(User).filter(User.id == payload["user_id"]).first()
    session.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Pydantic models ──────────────────────────────────────────────────────────

class DemoAuthRequest(BaseModel):
    email: str
    name: str = "Student Demo"


class ChatRequest(BaseModel):
    message: str
    topic: str = "General"
    mode: str = "fast"


class VoiceRequest(BaseModel):
    text: str


class AddAssignmentRequest(BaseModel):
    title: str
    subject: str
    due_date: str
    type: str = "task"


class AddPlacementRequest(BaseModel):
    company: str
    role: str
    stage: str = "Applied"


class AddTransactionRequest(BaseModel):
    category: str
    amount: float
    description: str = ""


class UpdateTransactionRequest(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None


class UpdateBudgetRequest(BaseModel):
    budget: float


class AddScheduleRequest(BaseModel):
    day: str
    date: str
    subject: str
    start_time: str
    end_time: str
    room: Optional[str] = "SJT 301"
    faculty: Optional[str] = "Dr. Amit"
    status: Optional[str] = "scheduled"


class UpdateAttendanceRequest(BaseModel):
    course_id: int
    attended: int
    total: int


class UpdateAssignmentRequest(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None


class UpdateScheduleRequest(BaseModel):
    subject: Optional[str] = None
    day: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    faculty: Optional[str] = None
    status: Optional[str] = None


class UploadTextRequest(BaseModel):
    filename: str
    content: str


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    status = harness.get_harness_status()
    return {
        "status": "ok" if status["ollama_online"] else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        **status,
    }


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/demo")
def auth_demo(req: DemoAuthRequest):
    user_info = {
        "oauth_id": f"demo:{req.email.lower().strip()}",
        "email": req.email.strip(),
        "name": req.name.strip() or "Student Demo",
        "avatar_url": None,
    }
    return login_or_create_user(user_info)


# ── Data endpoints (all synthetic + seeded per user) ─────────────────────────

@app.get("/data/dashboard")
def get_dashboard(authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    
    # 1. Fetch real attendance from database
    db_courses = session.query(MvpCourseAttendance).filter(MvpCourseAttendance.user_id == user.id).all()
    if not db_courses:
        synth_attendance = sd.build_attendance_payload(user.id)
        for c in synth_attendance["courses"]:
            db_c = MvpCourseAttendance(
                user_id=user.id,
                subject=c["subject"],
                code=c["code"],
                professor=c["professor"],
                attended=c["attended"],
                total=c["total"]
            )
            session.add(db_c)
        session.commit()
        db_courses = session.query(MvpCourseAttendance).filter(MvpCourseAttendance.user_id == user.id).all()
        
    overall_attended = sum(c.attended for c in db_courses)
    overall_total = sum(c.total for c in db_courses)
    attendance_pct = round(overall_attended / overall_total * 100, 1) if overall_total > 0 else 75.0
    safe_bunks = sum(max(0, int(c.attended - c.total * 0.75)) for c in db_courses)

    # 2. Fetch assignments due today
    today = sd._today()
    due_today_count = session.query(MvpAssignment).filter(
        MvpAssignment.user_id == user.id,
        MvpAssignment.status == "pending"
    ).all()
    
    due_today = 0
    now = datetime.now()
    for a in due_today_count:
        if a.due_at.date() == today:
            due_today += 1

    # 3. Dynamic time alerts & greeting
    hour = now.hour
    greeting = f"{sd._greeting()}, {user.name.split()[0]}"
    
    alert_title = "Hostel Rules"
    alert_msg = "The hostel main gate closes strictly at 9:00 PM."
    alert_type = "info"
    
    if hour >= 20 or hour < 6:
        alert_title = "🚪 Curfew Warning"
        if hour == 20:
            rem = 60 - now.minute
            alert_msg = f"Hostel curfew is in {rem} minutes! Return to campus immediately."
        else:
            alert_msg = "Hostel main gates are CLOSED. Pre-approved gate pass required."
        alert_type = "danger"
    elif hour >= 11 and hour <= 14:
        alert_title = "🍴 Mess Lunch"
        alert_msg = "Lunch is currently being served at the central mess until 2:00 PM."
        alert_type = "success"
    elif due_today > 0:
        alert_title = "📝 Pending Deadlines"
        alert_msg = f"You have {due_today} assignments due today. Submit before midnight!"
        alert_type = "warning"
    else:
        # Find next scheduled class today
        day_abbr = now.strftime("%A")[:3]
        today_events = session.query(MvpScheduleEvent).filter(
            MvpScheduleEvent.user_id == user.id,
            MvpScheduleEvent.day == day_abbr
        ).all()
        
        upcoming = None
        for ev in today_events:
            try:
                start_h = int(ev.start_time.split(":")[0])
                if start_h > hour:
                    if upcoming is None or start_h < int(upcoming.start_time.split(":")[0]):
                        upcoming = ev
            except Exception:
                pass
        if upcoming:
            alert_title = "📚 Next Lecture"
            alert_msg = f"{upcoming.subject} in {upcoming.room} starts at {upcoming.start_time}."
            alert_type = "success"
        else:
            alert_title = "📅 Weekly Tip"
            alert_msg = "Ensure your weekly attendance is above 75% to stay eligible for exams."
            alert_type = "info"
            
    session.close()
    
    return {
        "greeting": greeting,
        "student": {
            "name": user.name,
            "semester": "Sem 6",
            "department": "CSE",
            "attendance": attendance_pct,
            "cgpa": float(user.gpa or 8.5),
            "credits": 120,
        },
        "stats": {
            "safe_bunks": safe_bunks,
            "assignments_due_today": due_today,
            "exam_in_days": 12,
        },
        "alert": {
            "title": alert_title,
            "message": alert_msg,
            "type": alert_type
        },
        "ai_tip": alert_msg,
    }


@app.get("/data/attendance")
def get_attendance(authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_courses = session.query(MvpCourseAttendance).filter(MvpCourseAttendance.user_id == user.id).all()
    
    if not db_courses:
        synth = sd.build_attendance_payload(user.id)
        for c in synth["courses"]:
            db_c = MvpCourseAttendance(
                user_id=user.id,
                subject=c["subject"],
                code=c["code"],
                professor=c["professor"],
                attended=c["attended"],
                total=c["total"]
            )
            session.add(db_c)
        session.commit()
        db_courses = session.query(MvpCourseAttendance).filter(MvpCourseAttendance.user_id == user.id).all()
        
    courses_list = []
    overall_attended = 0
    overall_total = 0
    for c in db_courses:
        attended = c.attended
        total = c.total
        pct = round(attended / total * 100, 1) if total > 0 else 0.0
        safe_bunks = max(0, int(attended - total * 0.75))
        
        if pct >= 85:
            status = "safe"
        elif pct >= 75:
            status = "warning"
        else:
            status = "danger"
            
        courses_list.append({
            "id": c.id,
            "subject": c.subject,
            "code": c.code,
            "professor": c.professor,
            "total": total,
            "attended": attended,
            "percentage": pct,
            "safe_bunks": safe_bunks,
            "status": status,
        })
        overall_attended += attended
        overall_total += total
        
    overall_pct = round(overall_attended / overall_total * 100, 1) if overall_total > 0 else 0.0
    overall_status = "safe" if overall_pct >= 85 else "warning" if overall_pct >= 75 else "danger"
    
    session.close()
    return {
        "courses": courses_list,
        "overall": {
            "attended": overall_attended,
            "total": overall_total,
            "percentage": overall_pct,
            "status": overall_status,
        }
    }


@app.post("/data/attendance")
def update_attendance(req: UpdateAttendanceRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_c = session.query(MvpCourseAttendance).filter(
        MvpCourseAttendance.id == req.course_id,
        MvpCourseAttendance.user_id == user.id
    ).first()
    if not db_c:
        session.close()
        raise HTTPException(status_code=404, detail="Course not found")
        
    db_c.attended = req.attended
    db_c.total = req.total
    session.commit()
    session.close()
    return {"status": "success"}


@app.get("/data/schedule")
def get_schedule(authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_events = session.query(MvpScheduleEvent).filter(MvpScheduleEvent.user_id == user.id).all()
    
    today = sd._today()
    monday = today - timedelta(days=today.weekday())
    
    if not db_events:
        synth = sd.build_schedule_payload(user.id)
        for d in synth["week"]:
            for cls in d["classes"]:
                db_event = MvpScheduleEvent(
                    user_id=user.id,
                    day=d["day"],
                    date=d["date"],
                    subject=cls["subject"],
                    start_time=cls["start_time"],
                    end_time=cls["end_time"],
                    room=cls["room"],
                    faculty=cls["faculty"],
                    status=cls["status"]
                )
                session.add(db_event)
        session.commit()
        db_events = session.query(MvpScheduleEvent).filter(MvpScheduleEvent.user_id == user.id).all()

    week = []
    for day_offset in range(7):  # Mon-Sun
        day_date = monday + timedelta(days=day_offset)
        day_name = day_date.strftime("%A")
        day_abbr = day_name[:3]
        
        # Match by day abbreviation or specific date string (YYYY-MM-DD)
        day_str = day_date.isoformat()[:10]
        day_events = [e for e in db_events if e.day == day_abbr or e.date[:10] == day_str]
        
        unique_day_events = []
        seen = set()
        for e in day_events:
            if e.id not in seen:
                seen.add(e.id)
                unique_day_events.append(e)
                
        unique_day_events.sort(key=lambda x: x.start_time)
        
        classes = []
        for e in unique_day_events:
            classes.append({
                "id": e.id,
                "subject": e.subject,
                "code": e.room.split(" ")[-1] if e.room else "CS-302",
                "faculty": e.faculty,
                "room": e.room,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "status": e.status,
            })
            
        week.append({
            "day": day_abbr,
            "full_day": day_name,
            "date": day_date.isoformat(),
            "is_today": day_date == today,
            "classes": classes,
        })
        
    session.close()
    return {"week": week, "today": today.isoformat()}


@app.post("/data/schedule")
def add_schedule_event(req: AddScheduleRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_event = MvpScheduleEvent(
        user_id=user.id,
        day=req.day,
        date=req.date,
        subject=req.subject,
        start_time=req.start_time,
        end_time=req.end_time,
        room=req.room,
        faculty=req.faculty,
        status=req.status
    )
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    
    res = {
        "id": db_event.id,
        "day": db_event.day,
        "date": db_event.date,
        "subject": db_event.subject,
        "start_time": db_event.start_time,
        "end_time": db_event.end_time,
        "room": db_event.room,
        "faculty": db_event.faculty,
        "status": db_event.status,
        "code": db_event.room.split(" ")[-1] if db_event.room else "CS-302"
    }
    session.close()
    return res


@app.put("/data/schedule/{id}")
def update_schedule_event(id: int, req: UpdateScheduleRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_event = session.query(MvpScheduleEvent).filter(MvpScheduleEvent.id == id, MvpScheduleEvent.user_id == user.id).first()
    if not db_event:
        session.close()
        raise HTTPException(status_code=404, detail="Event not found")
    
    if req.subject is not None:
        db_event.subject = req.subject
    if req.day is not None:
        db_event.day = req.day
    if req.date is not None:
        db_event.date = req.date
    if req.start_time is not None:
        db_event.start_time = req.start_time
    if req.end_time is not None:
        db_event.end_time = req.end_time
    if req.room is not None:
        db_event.room = req.room
    if req.faculty is not None:
        db_event.faculty = req.faculty
    if req.status is not None:
        db_event.status = req.status
        
    session.commit()
    session.refresh(db_event)
    
    res = {
        "id": db_event.id,
        "day": db_event.day,
        "date": db_event.date,
        "subject": db_event.subject,
        "start_time": db_event.start_time,
        "end_time": db_event.end_time,
        "room": db_event.room,
        "faculty": db_event.faculty,
        "status": db_event.status,
        "code": db_event.room.split(" ")[-1] if db_event.room else "CS-302"
    }
    session.close()
    return res


@app.delete("/data/schedule/{id}")
def delete_schedule_event(id: int, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_event = session.query(MvpScheduleEvent).filter(MvpScheduleEvent.id == id, MvpScheduleEvent.user_id == user.id).first()
    if not db_event:
        session.close()
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(db_event)
    session.commit()
    session.close()
    return {"status": "success"}


@app.get("/data/assignments")
def get_assignments(authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_assignments = session.query(MvpAssignment).filter(MvpAssignment.user_id == user.id).all()
    
    if not db_assignments:
        synth = sd.build_assignments_payload(user.id)
        for a in synth["assignments"]:
            try:
                due_at = datetime.fromisoformat(a["due_date"])
            except Exception:
                due_at = datetime.utcnow()
            db_a = MvpAssignment(
                user_id=user.id,
                title=a["title"],
                subject=a["subject"],
                type=a["type"],
                priority="medium",
                status="pending",
                due_at=due_at
            )
            session.add(db_a)
        session.commit()
        db_assignments = session.query(MvpAssignment).filter(MvpAssignment.user_id == user.id).all()
    
    assignments_list = []
    today = datetime.now().date()
    for a in db_assignments:
        due_date = a.due_at.date()
        due_offset = (due_date - today).days
        urgency = "urgent" if due_offset <= 1 else "soon" if due_offset <= 4 else "normal"
        assignments_list.append({
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "type": a.type,
            "due_date": a.due_at.date().isoformat(),
            "due_label": f"Due {a.due_at.strftime('%b %d')}",
            "urgency": urgency,
            "status": a.status,
        })
    session.close()
    assignments_list.sort(key=lambda x: x["due_date"])
    return {"assignments": assignments_list}


@app.post("/data/assignments")
def add_assignment(req: AddAssignmentRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    try:
        due_at = datetime.fromisoformat(req.due_date)
    except Exception:
        due_at = datetime.utcnow() + timedelta(days=3)
    
    db_a = MvpAssignment(
        user_id=user.id,
        title=req.title,
        subject=req.subject,
        type=req.type,
        priority="medium",
        status="pending",
        due_at=due_at
    )
    session.add(db_a)
    session.commit()
    session.refresh(db_a)
    
    today = datetime.now().date()
    due_date = db_a.due_at.date()
    due_offset = (due_date - today).days
    urgency = "urgent" if due_offset <= 1 else "soon" if due_offset <= 4 else "normal"
    
    res = {
        "id": db_a.id,
        "title": db_a.title,
        "subject": db_a.subject,
        "type": db_a.type,
        "due_date": db_a.due_at.date().isoformat(),
        "due_label": f"Due {db_a.due_at.strftime('%b %d')}",
        "urgency": urgency,
        "status": db_a.status,
    }
    session.close()
    return res


@app.put("/data/assignments/{id}")
def update_assignment(id: int, req: UpdateAssignmentRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_a = session.query(MvpAssignment).filter(MvpAssignment.id == id, MvpAssignment.user_id == user.id).first()
    if not db_a:
        session.close()
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if req.title is not None:
        db_a.title = req.title
    if req.subject is not None:
        db_a.subject = req.subject
    if req.type is not None:
        db_a.type = req.type
    if req.due_date is not None:
        try:
            db_a.due_at = datetime.fromisoformat(req.due_date)
        except Exception:
            pass
    if req.status is not None:
        db_a.status = req.status
        
    session.commit()
    session.refresh(db_a)
    
    today = datetime.now().date()
    due_date = db_a.due_at.date()
    due_offset = (due_date - today).days
    urgency = "urgent" if due_offset <= 1 else "soon" if due_offset <= 4 else "normal"
    
    res = {
        "id": db_a.id,
        "title": db_a.title,
        "subject": db_a.subject,
        "type": db_a.type,
        "due_date": db_a.due_at.date().isoformat(),
        "due_label": f"Due {db_a.due_at.strftime('%b %d')}",
        "urgency": urgency,
        "status": db_a.status,
    }
    session.close()
    return res


@app.delete("/data/assignments/{id}")
def delete_assignment(id: int, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_a = session.query(MvpAssignment).filter(MvpAssignment.id == id, MvpAssignment.user_id == user.id).first()
    if not db_a:
        session.close()
        raise HTTPException(status_code=404, detail="Assignment not found")
    session.delete(db_a)
    session.commit()
    session.close()
    return {"status": "success"}


@app.get("/data/placement")
def get_placement(authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_apps = session.query(MvpPlacementApplication).filter(MvpPlacementApplication.user_id == user.id).all()
    
    stages = ["Applied", "OA", "Technical Round", "HR Round", "Offer", "Rejected"]
    
    if not db_apps:
        synth = sd.build_placement_payload(user.id)
        for app in synth["applications"]:
            db_app = MvpPlacementApplication(
                user_id=user.id,
                company=app["company"],
                role=app["role"],
                stage=app["stage"]
            )
            session.add(db_app)
        session.commit()
        db_apps = session.query(MvpPlacementApplication).filter(MvpPlacementApplication.user_id == user.id).all()
        
    formatted = []
    for app in db_apps:
        try:
            stage_idx = stages.index(app.stage)
        except ValueError:
            stage_idx = 0
            
        formatted.append({
            "id": app.id,
            "company": app.company,
            "role": app.role,
            "stage": app.stage,
            "stage_index": stage_idx,
            "total_stages": len(stages),
            "last_updated": app.updated_at.isoformat(),
            "careers_link": f"https://careers.google.com/jobs/results/?q={app.company.lower()}",
        })
    session.close()
    return {"applications": formatted, "all_stages": stages}


@app.post("/data/placement")
def add_placement(req: AddPlacementRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_app = MvpPlacementApplication(
        user_id=user.id,
        company=req.company,
        role=req.role,
        stage=req.stage
    )
    session.add(db_app)
    session.commit()
    session.refresh(db_app)
    
    stages = ["Applied", "OA", "Technical Round", "HR Round", "Offer", "Rejected"]
    try:
        stage_idx = stages.index(db_app.stage)
    except ValueError:
        stage_idx = 0
        
    res = {
        "id": db_app.id,
        "company": db_app.company,
        "role": db_app.role,
        "stage": db_app.stage,
        "stage_index": stage_idx,
        "total_stages": len(stages),
        "last_updated": db_app.updated_at.isoformat(),
        "careers_link": f"https://careers.google.com/jobs/results/?q={db_app.company.lower()}",
    }
    session.close()
    return res


@app.get("/data/finance")
def get_finance(authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_tx = session.query(TransactionRecord).filter(TransactionRecord.user_id == user.id).all()
    
    # Read custom budget from user preferences, default to 7000.0
    budget = float(user.preferences.get("budget", 7000.0)) if user.preferences else 7000.0
    
    if not db_tx:
        synth = sd.build_finance_payload(user.id)
        for b in synth["breakdown"]:
            db_t = TransactionRecord(
                user_id=user.id,
                category=b["category"],
                amount=float(b["amount"]),
                description=f"Initial seed for {b['category']}"
            )
            session.add(db_t)
        session.commit()
        db_tx = session.query(TransactionRecord).filter(TransactionRecord.user_id == user.id).all()
        
    total_spent = sum(t.amount for t in db_tx)
    cat_totals = {}
    for t in db_tx:
        cat_totals[t.category] = cat_totals.get(t.category, 0.0) + t.amount
        
    breakdown = []
    for cat, amt in cat_totals.items():
        pct = round((amt / total_spent * 100), 1) if total_spent > 0 else 0.0
        breakdown.append({
            "category": cat,
            "amount": amt,
            "percentage": pct
        })
        
    daily_avg = round((total_spent / 30), 2)
    
    tx_list = [
        {
            "id": t.id,
            "category": t.category,
            "amount": t.amount,
            "description": t.description,
            "date": t.date.isoformat()
        }
        for t in db_tx
    ]
    tx_list.sort(key=lambda x: x["date"], reverse=True)
    
    session.close()
    
    return {
        "month": datetime.now().strftime("%B %Y"),
        "total_spent": total_spent,
        "daily_average": daily_avg,
        "budget": budget,
        "budget_remaining": max(0.0, budget - total_spent),
        "breakdown": breakdown,
        "transactions": tx_list
    }


@app.post("/data/finance/budget")
def update_budget(req: UpdateBudgetRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_user = session.query(User).filter(User.id == user.id).first()
    prefs = dict(db_user.preferences or {})
    prefs["budget"] = req.budget
    db_user.preferences = prefs
    session.commit()
    session.close()
    return {"status": "success", "budget": req.budget}


@app.post("/data/finance")
def add_transaction(req: AddTransactionRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_t = TransactionRecord(
        user_id=user.id,
        category=req.category,
        amount=req.amount,
        description=req.description
    )
    session.add(db_t)
    session.commit()
    session.refresh(db_t)
    
    res = {
        "id": db_t.id,
        "category": db_t.category,
        "amount": db_t.amount,
        "description": db_t.description,
        "date": db_t.date.isoformat()
    }
    session.close()
    return res


@app.put("/data/finance/{id}")
def update_transaction(id: int, req: UpdateTransactionRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_t = session.query(TransactionRecord).filter(TransactionRecord.id == id, TransactionRecord.user_id == user.id).first()
    if not db_t:
        session.close()
        raise HTTPException(status_code=404, detail="Transaction record not found")
        
    if req.category is not None:
        db_t.category = req.category
    if req.amount is not None:
        db_t.amount = req.amount
    if req.description is not None:
        db_t.description = req.description
        
    session.commit()
    session.refresh(db_t)
    res = {
        "id": db_t.id,
        "category": db_t.category,
        "amount": db_t.amount,
        "description": db_t.description,
        "date": db_t.date.isoformat()
    }
    session.close()
    return res


@app.delete("/data/finance/{id}")
def delete_transaction(id: int, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_t = session.query(TransactionRecord).filter(TransactionRecord.id == id, TransactionRecord.user_id == user.id).first()
    if not db_t:
        session.close()
        raise HTTPException(status_code=404, detail="Transaction record not found")
    session.delete(db_t)
    session.commit()
    session.close()
    return {"status": "success"}


@app.get("/data/jobs")
def get_jobs(authorization: str = Header(None)):
    user = current_user(authorization)
    skills = user.skills or []
    jobs = job_scraper.get_jobs(user_skills=skills)
    return {"jobs": jobs, "count": len(jobs), "updated_at": datetime.utcnow().isoformat()}


# ── AI Chat (SSE streaming) ──────────────────────────────────────────────────

@app.post("/agent/chat/stream")
def chat_stream(req: ChatRequest, authorization: str = Header(None)):
    user = current_user(authorization)

    def event_stream():
        collected = ""
        task = harness.task_for_text(req.message, req.topic)
        base_prompt = chat_agent.build_homework_prompt(user, req.message, req.topic)
        
        # Search relevant documents
        context_chunks = rag.search_context(req.message, limit=3)
        context_str = ""
        sources = []
        if context_chunks:
            context_str = "\n\n[CAMPUS CONTEXT (Facts from verified manuals/handbooks. Prioritize these)]:\n"
            for chunk in context_chunks:
                context_str += f"- {chunk['text']} (Source: {chunk['source']})\n"
                sources.append(chunk['source'])
            context_str += "\n"

        # Send list of sources as the first frame
        yield f"data: {json.dumps({'sources': list(set(sources))})}\n\n"

        # Guardrail modes
        if req.mode == "expansive":
            prompt = f"[MODE: EXPANSIVE & DETAILED. Be thorough, explanatory, write full details and multiple code/math examples.]{context_str}\n\n{base_prompt}"
            limit = 850
        else:
            prompt = f"[MODE: FAST & CONCISE. Give a very short, direct, minimal bullet-point answer. Do not use filler text.]{context_str}\n\n{base_prompt}"
            limit = 200

        try:
            for token in harness.stream(prompt, task=task, max_tokens=limit):
                if not token:
                    continue
                collected += token
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            err = f"Error: {exc}"
            yield f"data: {json.dumps({'token': err})}\n\n"
        finally:
            if collected:
                chat_agent.save_chat_message(user.id, req.topic, req.message, collected)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


import re
@app.post("/agent/rag/upload")
def upload_rag_document(file: UploadFile = File(...), authorization: str = Header(None)):
    user = current_user(authorization)
    filename = file.filename
    if not filename.endswith((".txt", ".md", ".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt, .md, and .pdf documents are supported.")
    
    try:
        if filename.endswith(".pdf"):
            import io
            from pypdf import PdfReader
            content = file.file.read()
            reader = PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            txt_filename = filename + ".txt"
            safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '', txt_filename)
            filepath = os.path.join(rag.DOCS_DIR, safe_name)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(text)
            return {"status": "success", "filename": safe_name}
        else:
            safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '', filename)
            filepath = os.path.join(rag.DOCS_DIR, safe_name)
            content = file.file.read()
            with open(filepath, "wb") as f:
                f.write(content)
            return {"status": "success", "filename": safe_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")


@app.post("/agent/rag/upload-text")
def upload_rag_text(req: UploadTextRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    filename = req.filename
    if not filename.endswith((".txt", ".md")):
        raise HTTPException(status_code=400, detail="Only .txt and .md text documents are supported.")
    
    safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '', filename)
    filepath = os.path.join(rag.DOCS_DIR, safe_name)
    
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(req.content)
        return {"status": "success", "filename": safe_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")


@app.get("/agent/rag/documents")
def list_rag_documents(authorization: str = Header(None)):
    user = current_user(authorization)
    rag.initialize_docs()
    files = []
    for filename in os.listdir(rag.DOCS_DIR):
        if filename.endswith((".txt", ".md")):
            filepath = os.path.join(rag.DOCS_DIR, filename)
            files.append({
                "name": filename,
                "size": os.path.getsize(filepath)
            })
    return {"documents": files}


@app.delete("/agent/rag/document/{filename}")
def delete_rag_document(filename: str, authorization: str = Header(None)):
    user = current_user(authorization)
    safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '', filename)
    filepath = os.path.join(rag.DOCS_DIR, safe_name)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        os.remove(filepath)
        return {"status": "success", "message": f"Document {safe_name} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@app.get("/agent/chat/history")
def chat_history(authorization: str = Header(None)):
    user = current_user(authorization)
    history = chat_agent.load_chat_history(user.id)
    return {"history": history}


# ── Voice command ─────────────────────────────────────────────────────────────

VOICE_ROUTES = {
    "dashboard":  "/",
    "home":       "/",
    "attendance": "/attendance",
    "schedule":   "/schedule",
    "assignments":"/assignments",
    "jobs":       "/jobs",
    "internship": "/jobs",
    "placement":  "/placement",
    "finance":    "/finance",
    "chat":       "/chat",
    "more":       "/more",
    "settings":   "/more",
}


@app.post("/agent/voice/command")
def voice_command(req: VoiceRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    text_lower = req.text.lower()

    # Fast path: navigation
    for keyword, route in VOICE_ROUTES.items():
        if keyword in text_lower and not any(m in text_lower for m in ["add", "create", "delete", "remove", "cancel", "update", "change", "edit", "set", "modify", "mark", "complete"]):
            return {
                "action": "navigate",
                "route": route,
                "response": f"Navigating to {keyword}.",
                "model": "fast-path",
            }

    # Inject current date and time for date-awareness
    now_dt = datetime.now()
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
    now_weekday = now_dt.strftime("%a")

    # Agentic path: ask hermes3:3b for intent
    prompt = (
        f"Current system date/time: {now_str} ({now_weekday})\n"
        f"User voice command: \"{req.text}\"\n"
        "Analyze the user's intent. You can perform actions on behalf of the user. "
        "Return a JSON object with fields:\n"
        "- action: one of 'navigate' | 'create_assignment' | 'update_assignment' | 'delete_assignment' | 'create_finance_log' | 'delete_finance_log' | 'create_schedule_event' | 'update_schedule_event' | 'delete_schedule_event' | 'search_jobs' | 'chat' | 'unknown'\n"
        "- route: if navigating, the route to navigate to (e.g. '/assignments', '/jobs', '/attendance', '/schedule', '/finance', '/placement')\n"
        "- payload:\n"
        "  - for 'create_assignment': {'title': str, 'subject': str, 'due_date': 'YYYY-MM-DD', 'type': 'coding'|'lab'|'design'|'report'}\n"
        "  - for 'update_assignment': {'search_title': str, 'title': Optional[str], 'subject': Optional[str], 'due_date': Optional['YYYY-MM-DD'], 'type': Optional['coding'|'lab'|'design'|'report'], 'status': Optional['pending'|'completed']}\n"
        "  - for 'delete_assignment': {'assignment_title': str}\n"
        "  - for 'create_finance_log': {'category': 'Food'|'Transport'|'Books & Notes'|'Entertainment'|'Miscellaneous', 'amount': float, 'description': str}\n"
        "  - for 'delete_finance_log': {'description': str}\n"
        "  - for 'create_schedule_event': {'day': 'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun', 'date': 'YYYY-MM-DD', 'subject': str, 'start_time': 'HH:MM', 'end_time': 'HH:MM', 'room': str, 'faculty': str}\n"
        "  - for 'update_schedule_event': {'search_subject': str, 'subject': Optional[str], 'day': Optional['Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun'], 'date': Optional['YYYY-MM-DD'], 'start_time': Optional['HH:MM'], 'end_time': Optional['HH:MM'], 'room': Optional[str], 'faculty': Optional[str]}\n"
        "  - for 'delete_schedule_event': {'subject': str}\n"
        "  - for 'search_jobs': {'search_query': str}\n"
        "- response: a short, spoken explanation of what you did (max 20 words).\n"
        "Format as strict JSON only, no markdown formatting or fences."
    )
    try:
        raw = harness.generate(prompt, task="agentic", max_tokens=150)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end]) if start != -1 else {}
        action = result.get("action", "chat")
        
        session = SessionLocal()
        if action == "create_assignment":
            payload = result.get("payload", {})
            title = payload.get("title", "New Task")
            subject = payload.get("subject", "General")
            type_ = payload.get("type", "task")
            try:
                due_at = datetime.fromisoformat(payload.get("due_date", ""))
            except Exception:
                due_at = datetime.utcnow() + timedelta(days=3)
            
            db_a = MvpAssignment(
                user_id=user.id,
                title=title,
                subject=subject,
                type=type_,
                priority="medium",
                status="pending",
                due_at=due_at
            )
            session.add(db_a)
            session.commit()
            result["response"] = f"Added assignment: {title}."
            
        elif action == "update_assignment":
            payload = result.get("payload", {})
            search_title = payload.get("search_title", "")
            if search_title:
                db_a = session.query(MvpAssignment).filter(
                    MvpAssignment.user_id == user.id,
                    MvpAssignment.title.like(f"%{search_title}%")
                ).first()
                if db_a:
                    updated_fields = []
                    if "title" in payload and payload["title"]:
                        db_a.title = payload["title"]
                        updated_fields.append("title")
                    if "subject" in payload and payload["subject"]:
                        db_a.subject = payload["subject"]
                        updated_fields.append("subject")
                    if "due_date" in payload and payload["due_date"]:
                        try:
                            db_a.due_at = datetime.fromisoformat(payload["due_date"])
                            updated_fields.append("due date")
                        except Exception:
                            pass
                    if "type" in payload and payload["type"]:
                        db_a.type = payload["type"]
                        updated_fields.append("type")
                    if "status" in payload and payload["status"]:
                        db_a.status = payload["status"]
                        updated_fields.append("status")
                    
                    if updated_fields:
                        session.commit()
                        result["response"] = f"Updated {', '.join(updated_fields)} for assignment: {db_a.title}."
                    else:
                        result["response"] = f"No new values provided to update assignment: {db_a.title}."
                else:
                    result["response"] = f"Could not find assignment containing '{search_title}'."
            else:
                result["response"] = "Which assignment would you like to update?"

        elif action == "delete_assignment":
            payload = result.get("payload", {})
            title_query = payload.get("assignment_title", "")
            if title_query:
                db_a = session.query(MvpAssignment).filter(
                    MvpAssignment.user_id == user.id,
                    MvpAssignment.title.like(f"%{title_query}%")
                ).first()
                if db_a:
                    title_deleted = db_a.title
                    session.delete(db_a)
                    session.commit()
                    result["response"] = f"Deleted assignment: {title_deleted}."
                else:
                    result["response"] = f"Could not find assignment containing '{title_query}'."
            else:
                result["response"] = "Which assignment would you like to delete?"
                
        elif action == "create_finance_log":
            payload = result.get("payload", {})
            cat = payload.get("category", "Miscellaneous")
            amt = float(payload.get("amount", 0.0))
            desc = payload.get("description", "Log from Agent")
            if amt > 0:
                db_t = TransactionRecord(
                    user_id=user.id,
                    category=cat,
                    amount=amt,
                    description=desc
                )
                session.add(db_t)
                session.commit()
                result["response"] = f"Logged ₹{amt} for {desc} under {cat}."
            else:
                result["response"] = "Please provide a valid amount."

        elif action == "delete_finance_log":
            payload = result.get("payload", {})
            desc_query = payload.get("description", "")
            if desc_query:
                db_t = session.query(TransactionRecord).filter(
                    TransactionRecord.user_id == user.id,
                    TransactionRecord.description.like(f"%{desc_query}%")
                ).first()
                if db_t:
                    desc_deleted = db_t.description
                    session.delete(db_t)
                    session.commit()
                    result["response"] = f"Deleted transaction: {desc_deleted}."
                else:
                    result["response"] = f"Could not find transaction matching '{desc_query}'."
            else:
                result["response"] = "Which transaction would you like to delete?"

        elif action == "create_schedule_event":
            payload = result.get("payload", {})
            subj = payload.get("subject", "New Event")
            day = payload.get("day", "Mon")
            date_str = payload.get("date", datetime.now().isoformat()[:10])
            start = payload.get("start_time", "09:00")
            end = payload.get("end_time", "10:00")
            room = payload.get("room", "SJT 301")
            fac = payload.get("faculty", "Dr. Amit")
            
            db_event = MvpScheduleEvent(
                user_id=user.id,
                day=day,
                date=date_str,
                subject=subj,
                start_time=start,
                end_time=end,
                room=room,
                faculty=fac,
                status="scheduled"
            )
            session.add(db_event)
            session.commit()
            result["response"] = f"Added schedule event: {subj} on {day}."
            
        elif action == "update_schedule_event":
            payload = result.get("payload", {})
            search_subject = payload.get("search_subject", "")
            if search_subject:
                db_event = session.query(MvpScheduleEvent).filter(
                    MvpScheduleEvent.user_id == user.id,
                    MvpScheduleEvent.subject.like(f"%{search_subject}%")
                ).first()
                if db_event:
                    updated_fields = []
                    if "subject" in payload and payload["subject"]:
                        db_event.subject = payload["subject"]
                        updated_fields.append("subject")
                    if "day" in payload and payload["day"]:
                        db_event.day = payload["day"]
                        updated_fields.append("day")
                    if "date" in payload and payload["date"]:
                        db_event.date = payload["date"]
                        updated_fields.append("date")
                    if "start_time" in payload and payload["start_time"]:
                        db_event.start_time = payload["start_time"]
                        updated_fields.append("start time")
                    if "end_time" in payload and payload["end_time"]:
                        db_event.end_time = payload["end_time"]
                        updated_fields.append("end time")
                    if "room" in payload and payload["room"]:
                        db_event.room = payload["room"]
                        updated_fields.append("room")
                    if "faculty" in payload and payload["faculty"]:
                        db_event.faculty = payload["faculty"]
                        updated_fields.append("faculty")
                    
                    if updated_fields:
                        session.commit()
                        result["response"] = f"Updated {', '.join(updated_fields)} for schedule event: {db_event.subject}."
                    else:
                        result["response"] = f"No new values provided to update event: {db_event.subject}."
                else:
                    result["response"] = f"Could not find schedule event matching '{search_subject}'."
            else:
                result["response"] = "Which schedule event would you like to update?"

        elif action == "delete_schedule_event":
            payload = result.get("payload", {})
            subj_query = payload.get("subject", "")
            if subj_query:
                db_event = session.query(MvpScheduleEvent).filter(
                    MvpScheduleEvent.user_id == user.id,
                    MvpScheduleEvent.subject.like(f"%{subj_query}%")
                ).first()
                if db_event:
                    subj_deleted = db_event.subject
                    session.delete(db_event)
                    session.commit()
                    result["response"] = f"Deleted event: {subj_deleted}."
                else:
                    result["response"] = f"Could not find event matching '{subj_query}'."
            else:
                result["response"] = "Which event would you like to delete?"

        session.close()
        
        result.setdefault("action", "chat")
        result.setdefault("response", req.text)
        result["model"] = "hermes3:3b"
        return result
    except Exception as e:
        return {
            "action": "chat",
            "response": f"Sorry, I ran into an issue: {str(e)}",
            "model": "hermes3:3b",
        }


# ── Voice transcription via local Whisper ─────────────────────────────────────
@app.post("/agent/voice/transcribe")
def transcribe_audio(file: UploadFile = File(...), authorization: str = Header(None)):
    """Transcribe an audio blob using faster-whisper (100% local, no cloud).

    Accepts any audio format that FFmpeg can decode: WebM/Opus (MediaRecorder),
    WAV, M4A, MP3, OGG, etc.
    """
    if _whisper is None:
        raise HTTPException(
            status_code=503,
            detail="Whisper model not loaded. Run: pip install faster-whisper",
        )

    user = current_user(authorization)
    _, ext = os.path.splitext(file.filename or "")
    if not ext:
        ext = ".webm"  # MediaRecorder default
    temp_upload = f"temp_voice_{user.id}{ext}"

    try:
        content = file.file.read()
        with open(temp_upload, "wb") as fh:
            fh.write(content)

        log.info("Transcribing %d bytes via Whisper base.en…", len(content))
        segments, info = _whisper.transcribe(
            temp_upload,
            beam_size=5,
            language="en",       # lock to English for speed
            vad_filter=True,     # skip silence segments
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        text = " ".join(s.text.strip() for s in segments).strip()
        log.info("Whisper transcription: %r (%.2fs audio)", text, info.duration)
        return {"text": text, "duration": info.duration}

    except Exception as e:
        log.error("Whisper transcription failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_upload):
            os.remove(temp_upload)


class OAuthRequest(BaseModel):
    token: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    major: Optional[str] = None
    gpa: Optional[float] = None
    skills: Optional[list[str]] = None


@app.post("/auth/google")
def auth_google(req: OAuthRequest):
    email = req.token.lower().strip()
    if "@" not in email:
        email = f"{email}@bmsce.ac.in"
    name = email.split("@")[0].replace(".", " ").title()
    user_info = {
        "oauth_id": f"google:{email}",
        "email": email,
        "name": name,
        "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed={email}",
    }
    return login_or_create_user(user_info)


@app.post("/auth/github")
def auth_github(req: OAuthRequest):
    username = req.token.strip()
    email = f"{username}@github.com"
    user_info = {
        "oauth_id": f"github:{username}",
        "email": email,
        "name": username.replace("-", " ").title(),
        "avatar_url": f"https://api.dicebear.com/7.x/identicon/svg?seed={username}",
    }
    return login_or_create_user(user_info)


@app.get("/user/profile")
def get_profile(authorization: str = Header(None)):
    user = current_user(authorization)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "major": user.major,
        "gpa": user.gpa,
        "skills": user.skills,
    }


@app.post("/user/profile")
def update_profile(req: UpdateProfileRequest, authorization: str = Header(None)):
    user = current_user(authorization)
    session = SessionLocal()
    db_user = session.query(User).filter(User.id == user.id).first()
    if not db_user:
        session.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    if req.name is not None:
        db_user.name = req.name.strip()
    if req.major is not None:
        db_user.major = req.major.strip()
    if req.gpa is not None:
        db_user.gpa = req.gpa
    if req.skills is not None:
        db_user.skills = req.skills
        
    session.commit()
    session.refresh(db_user)
    
    res = {
        "id": db_user.id,
        "email": db_user.email,
        "name": db_user.name,
        "avatar_url": db_user.avatar_url,
        "major": db_user.major,
        "gpa": db_user.gpa,
        "skills": db_user.skills,
    }
    session.close()
    return res


# ── Real & Mock Redirect-Based OAuth Endpoints ──────────────────────────────

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")


@app.get("/auth/login/google")
def login_google(request: Request):
    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
        redirect_uri = f"http://{request.url.netloc}/auth/google/callback"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={GOOGLE_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope=openid%20email%20profile"
        )
        return RedirectResponse(url=auth_url)
    else:
        return RedirectResponse(url=f"http://{request.url.netloc}/auth/mock-login?provider=google")


@app.get("/auth/login/github")
def login_github(request: Request):
    if GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET:
        redirect_uri = f"http://{request.url.netloc}/auth/github/callback"
        auth_url = (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={GITHUB_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"scope=user:email"
        )
        return RedirectResponse(url=auth_url)
    else:
        return RedirectResponse(url=f"http://{request.url.netloc}/auth/mock-login?provider=github")


@app.get("/auth/mock-login", response_class=HTMLResponse)
def get_mock_login_page(provider: str):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BMSCE Portal - Mock Authentication</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #09090b;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }}
            .card {{
                background-color: #18181b;
                border: 1px solid #27272a;
                border-radius: 16px;
                padding: 32px;
                width: 100%;
                max-width: 360px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }}
            h2 {{
                margin-top: 0;
                color: #3b82f6;
            }}
            p {{
                color: #a1a1aa;
                font-size: 14px;
                margin-bottom: 24px;
            }}
            .btn {{
                display: block;
                background-color: #27272a;
                color: #ffffff;
                border: 1px solid #3f3f46;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                transition: background-color 0.2s;
                text-align: center;
                cursor: pointer;
            }}
            .btn:hover {{
                background-color: #3f3f46;
                border-color: #3b82f6;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>✦ Student Catalyst</h2>
            <p>Simulating <strong>{provider.title()} OAuth</strong> for BMSCE Bengaluru...</p>
            
            {f'''
            <a class="btn" href="/auth/google/callback?email=siva.sainath@bmsce.ac.in">siva.sainath@bmsce.ac.in (Siva Sainath)</a>
            <a class="btn" href="/auth/google/callback?email=guest.student@bmsce.ac.in">guest.student@bmsce.ac.in (Guest Student)</a>
            ''' if provider == "google" else f'''
            <a class="btn" href="/auth/github/callback?username=siva-sainath">siva-sainath (GitHub Siva)</a>
            <a class="btn" href="/auth/github/callback?username=guest-student">guest-student (GitHub Guest)</a>
            '''}
        </div>
    </body>
    </html>
    """
    return html_content


@app.get("/auth/google/callback")
def google_callback(request: Request, code: Optional[str] = None, email: Optional[str] = None):
    target_email = email
    target_name = "BMSCE Student"
    target_avatar = None
    
    if code and GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
        try:
            redirect_uri = f"http://{request.url.netloc}/auth/google/callback"
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
            res = requests.post(token_url, data=data, timeout=10)
            res.raise_for_status()
            tokens = res.json()
            id_token_str = tokens.get("id_token")
            
            if id_token_str:
                from google.auth.transport import requests as google_requests
                from google.oauth2 import id_token as google_id_token
                req_transport = google_requests.Request()
                info = google_id_token.verify_oauth2_token(id_token_str, req_transport, GOOGLE_CLIENT_ID)
                target_email = info.get("email")
                target_name = info.get("name", "Google User")
                target_avatar = info.get("picture")
        except Exception as exc:
            log.warning("Real Google OAuth exchange failed, falling back to mock info: %s", exc)

    if not target_email:
        target_email = "siva.sainath@bmsce.ac.in"
        target_name = "Siva Sainath"
    elif target_name == "BMSCE Student":
        prefix = target_email.split("@")[0]
        target_name = prefix.replace(".", " ").title()

    user_info = {
        "oauth_id": f"google:{target_email}",
        "email": target_email,
        "name": target_name,
        "avatar_url": target_avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={target_email}",
    }
    auth_res = login_or_create_user(user_info)
    token = auth_res["access_token"]
    return RedirectResponse(url=f"exp://10.210.31.244:8081/--/oauth?token={token}")


@app.get("/auth/github/callback")
def github_callback(request: Request, code: Optional[str] = None, username: Optional[str] = None):
    target_username = username
    target_email = None
    target_avatar = None
    
    if code and GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET:
        try:
            token_url = "https://github.com/login/oauth/access_token"
            headers = {"Accept": "application/json"}
            data = {
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            }
            res = requests.post(token_url, headers=headers, json=data, timeout=10)
            res.raise_for_status()
            access_token = res.json().get("access_token")
            
            if access_token:
                user_res = requests.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10
                )
                user_res.raise_for_status()
                user_data = user_res.json()
                target_username = user_data.get("login")
                target_email = user_data.get("email")
                target_avatar = user_data.get("avatar_url")
        except Exception as exc:
            log.warning("Real GitHub OAuth exchange failed, falling back to mock info: %s", exc)

    if not target_username:
        target_username = "siva-sainath"
        
    if not target_email:
        target_email = f"{target_username}@bmsce.ac.in"

    user_info = {
        "oauth_id": f"github:{target_username}",
        "email": target_email,
        "name": target_username.replace("-", " ").replace(".", " ").title(),
        "avatar_url": target_avatar or f"https://api.dicebear.com/7.x/identicon/svg?seed={target_username}",
    }
    auth_res = login_or_create_user(user_info)
    token = auth_res["access_token"]
    return RedirectResponse(url=f"exp://10.210.31.244:8081/--/oauth?token={token}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=API_HOST, port=API_PORT, reload=True)
