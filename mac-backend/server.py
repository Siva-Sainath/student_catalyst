import os
import json
from datetime import datetime
from typing import Optional, List, Any
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from auth import get_google_user_info, get_github_user_info, login_or_create_user, verify_token
from models import (
  init_db,
  SessionLocal,
  User,
  MvpScheduleEvent,
  MvpAssignment,
  MvpPlacementApplication,
  MvpTravelRoute,
)
import agents.chat as chat_agent
import agents.jobs as jobs_agent
import agents.voice as voice_agent
import agents.enhanced_voice as enhanced_voice_agent
import agents.attendance as attendance_agent
import agents.finance as finance_agent
import agents.ai_agent as ai_agent_module
import synthetic_data

load_dotenv()
init_db()

API_BASE = os.getenv("MAC_SERVER_HOST", "0.0.0.0")
API_PORT = int(os.getenv("MAC_SERVER_PORT", "8000"))
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]

app = FastAPI(title="College Portal Agent Server")

app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS or ["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
  expose_headers=["*"],
)


def get_current_user(authorization: str = Header(None)) -> User:
  if not authorization:
    raise HTTPException(status_code=401, detail="Authorization header missing")
  token = authorization.replace("Bearer ", "").strip()
  try:
    payload = verify_token(token)
  except ValueError as exc:
    raise HTTPException(status_code=401, detail=str(exc))

  session = SessionLocal()
  user = session.query(User).filter(User.id == payload.get("user_id")).first()
  session.close()

  if not user:
    raise HTTPException(status_code=401, detail="User not found")
  return user


class GoogleAuthRequest(BaseModel):
  id_token: str


class GitHubAuthRequest(BaseModel):
  access_token: str


class DemoAuthRequest(BaseModel):
  email: str
  name: str = "Student Demo"


class ProfileUpdateRequest(BaseModel):
  major: Optional[str] = None
  gpa: Optional[float] = None
  skills: Optional[List[str]] = None
  experience: Optional[str] = None
  preferences: Optional[dict] = None


class HomeworkRequest(BaseModel):
  message: str
  topic: str = "General"


class VoiceRequest(BaseModel):
  text: str


class ScheduleEventCreateRequest(BaseModel):
  day: str
  date: str
  subject: str
  start_time: str
  end_time: str
  room: str = ""
  faculty: str = ""


class AssignmentCreateRequest(BaseModel):
  title: str
  subject: str = "General"
  type: str = "task"
  priority: str = "medium"
  due_at: str


class AssignmentUpdateRequest(BaseModel):
  status: Optional[str] = None
  priority: Optional[str] = None


class PlacementCreateRequest(BaseModel):
  company: str
  role: str
  stage: str = "Applied"


class PlacementStageUpdateRequest(BaseModel):
  stage: str


class TravelRouteCreateRequest(BaseModel):
  mode: str
  source: str
  destination: str
  eta_min: int = 20
  notes: str = ""


def _seed_mvp_schedule_if_missing(user_id: int, user_name: str) -> None:
  session = SessionLocal()
  try:
    existing = session.query(MvpScheduleEvent).filter(MvpScheduleEvent.user_id == user_id).count()
    if existing > 0:
      return
    generated = synthetic_data.build_schedule_payload(user_id).get("week", [])
    for day_item in generated:
      for row in day_item.get("classes", []):
        session.add(
          MvpScheduleEvent(
            user_id=user_id,
            day=day_item.get("day", "Mon"),
            date=day_item.get("date", datetime.utcnow().date().isoformat()),
            subject=row.get("subject", "Class"),
            start_time=row.get("start_time", "09:00"),
            end_time=row.get("end_time", "10:00"),
            room=row.get("room", ""),
            faculty=row.get("faculty", user_name),
            status=row.get("status", "scheduled"),
          )
        )
    session.commit()
  finally:
    session.close()


def _seed_mvp_assignments_if_missing(user_id: int) -> None:
  session = SessionLocal()
  try:
    existing = session.query(MvpAssignment).filter(MvpAssignment.user_id == user_id).count()
    if existing > 0:
      return
    generated = synthetic_data.build_assignments_payload(user_id).get("assignments", [])
    for row in generated:
      session.add(
        MvpAssignment(
          user_id=user_id,
          title=row.get("title", "Assignment"),
          subject=row.get("subject", "General"),
          type=row.get("type", "task"),
          priority=row.get("priority", "medium"),
          status=row.get("status", "pending"),
          due_at=datetime.fromisoformat(row.get("due_at")),
        )
      )
    session.commit()
  finally:
    session.close()


def _seed_mvp_placement_if_missing(user_id: int) -> None:
  session = SessionLocal()
  try:
    existing = session.query(MvpPlacementApplication).filter(MvpPlacementApplication.user_id == user_id).count()
    if existing > 0:
      return
    generated = synthetic_data.build_placement_payload(user_id).get("applications", [])
    for row in generated:
      updated_at = datetime.fromisoformat(row.get("updated_at"))
      session.add(
        MvpPlacementApplication(
          user_id=user_id,
          company=row.get("company", "Company"),
          role=row.get("role", "Role"),
          stage=row.get("stage", "Applied"),
          updated_at=updated_at,
        )
      )
    session.commit()
  finally:
    session.close()


def _seed_mvp_travel_if_missing(user_id: int) -> None:
  session = SessionLocal()
  try:
    existing = session.query(MvpTravelRoute).filter(MvpTravelRoute.user_id == user_id).count()
    if existing > 0:
      return
    generated = synthetic_data.build_travel_payload(user_id).get("routes", [])
    for row in generated:
      session.add(
        MvpTravelRoute(
          user_id=user_id,
          mode=row.get("mode", "Bus"),
          source=row.get("from", "Source"),
          destination=row.get("to", "Destination"),
          eta_min=row.get("eta_min", 20),
          notes="Seeded route",
        )
      )
    session.commit()
  finally:
    session.close()
@app.get("/health")
def health_check():
  # Check LLM model availability
  llm_available = False
  llm_error = None
  try:
    import requests
    model_endpoint = os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434")
    response = requests.get(f"{model_endpoint}/api/tags", timeout=5)
    llm_available = response.status_code == 200
  except Exception as e:
    llm_error = str(e)
  
  harness = {}
  try:
    from agents.hermes_harness import get_harness_status
    harness = get_harness_status()
  except Exception:
    pass

  return {
    "status": "ok" if llm_available else "degraded",
    "model_endpoint": os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434"),
    "model_available": llm_available,
    "model_error": llm_error,
    "hermes_harness": harness,
    "timestamp": datetime.utcnow().isoformat(),
  }


@app.post("/auth/google")
def auth_google(request: GoogleAuthRequest):
  user_info = get_google_user_info(request.id_token)
  result = login_or_create_user(user_info)
  return result


@app.post("/auth/github")
def auth_github(request: GitHubAuthRequest):
  user_info = get_github_user_info(request.access_token)
  result = login_or_create_user(user_info)
  return result


@app.post("/auth/demo")
def auth_demo(request: DemoAuthRequest):
  # Local/dev auth path to unblock mobile MVP without external OAuth flow.
  oauth_id = f"demo:{request.email.lower().strip()}"
  user_info = {
    "oauth_id": oauth_id,
    "email": request.email.strip(),
    "name": request.name.strip() or "Student Demo",
    "avatar_url": None,
  }
  return login_or_create_user(user_info)


@app.get("/auth/verify")
def auth_verify(authorization: str = Header(None)):
  if not authorization:
    raise HTTPException(status_code=401, detail="Missing authorization")
  token = authorization.replace("Bearer ", "").strip()
  try:
    payload = verify_token(token)
    return {"valid": True, "user_id": payload.get("user_id")}
  except ValueError as exc:
    raise HTTPException(status_code=401, detail=str(exc))


@app.get("/user/profile")
def get_profile(authorization: str = Header(None)):
  user = get_current_user(authorization)
  return {
    "id": user.id,
    "email": user.email,
    "name": user.name,
    "avatar_url": user.avatar_url,
    "major": user.major,
    "gpa": user.gpa,
    "skills": user.skills,
    "experience": user.experience,
    "preferences": user.preferences,
    "is_new": user.is_new,
  }


@app.put("/user/profile")
def update_profile(request: ProfileUpdateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  user_obj = session.query(User).filter(User.id == user.id).first()

  if request.major is not None:
    user_obj.major = request.major
  if request.gpa is not None:
    user_obj.gpa = request.gpa
  if request.skills is not None:
    user_obj.skills = request.skills
  if request.experience is not None:
    user_obj.experience = request.experience
  if request.preferences is not None:
    user_obj.preferences = request.preferences

  user_obj.is_new = False
  session.commit()
  session.refresh(user_obj)
  result = {
    "id": user_obj.id,
    "email": user_obj.email,
    "name": user_obj.name,
    "avatar_url": user_obj.avatar_url,
    "major": user_obj.major,
    "gpa": user_obj.gpa,
    "skills": user_obj.skills,
    "experience": user_obj.experience,
    "preferences": user_obj.preferences,
    "is_new": user_obj.is_new,
  }
  session.close()
  return result


@app.get("/agent/chat/history")
def chat_history(authorization: str = Header(None)):
  user = get_current_user(authorization)
  history = chat_agent.load_chat_history(user.id)
  return {"history": history}


@app.post("/agent/chat/homework")
def chat_homework(request: HomeworkRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)

  def event_stream():
    collected = ""
    for token in chat_agent.stream_homework_response(user, request.message, request.topic):
      collected += token
      yield f"data: {json.dumps({'token': token})}\n\n"
    chat_agent.save_chat_message(user.id, request.topic, request.message, collected)

  return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/agent/jobs/recommend")
def jobs_recommend(authorization: str = Header(None)):
  user = get_current_user(authorization)
  recommendations = jobs_agent.get_job_recommendations(user)
  return {"recommendations": recommendations}


@app.post("/agent/voice/command")
def voice_command(request: VoiceRequest, authorization: str = Header(None), 
                 use_enhanced: bool = True):
    """
    Process voice command.
    
    Args:
        request: VoiceRequest with text
        authorization: JWT token
        use_enhanced: Whether to use enhanced AI voice processing
    
    Returns:
        Command result with action, params, and response
    """
    try:
        _ = get_current_user(authorization)
        
        # Use enhanced voice processing if enabled and available
        if use_enhanced:
            try:
                result = enhanced_voice_agent.parse_enhanced_voice_command(request.text)
                # Add agent info if AI was used
                if result.get("ai_response"):
                    result["response"] = result.get("ai_response", result.get("response", ""))
                return result
            except Exception as e:
                print(f"Enhanced voice processing error: {e}")
                # Fallback to simple parsing
                result = voice_agent.parse_voice_command(request.text)
                return result
        else:
            result = voice_agent.parse_voice_command(request.text)
            return result
            
    except Exception as e:
        # Return a default response even if there's an error
        return {
            "action": "unknown",
            "params": {},
            "response": f"I encountered an error processing your command. Please try again. Error: {str(e)}"
        }


@app.post("/agent/voice/command/enhanced")
def enhanced_voice_command(request: VoiceRequest, authorization: str = Header(None)):
    """
    Process voice command with enhanced AI understanding.
    This endpoint always uses the enhanced voice processor.
    """
    try:
        _ = get_current_user(authorization)
        result = enhanced_voice_agent.parse_enhanced_voice_command(request.text)
        return result
    except Exception as e:
        return {
            "action": "unknown",
            "params": {},
            "response": f"Error: {str(e)}"
        }


@app.get("/agent/ai/agents")
def list_ai_agents(authorization: str = Header(None)):
    """List available AI agents."""
    try:
        _ = get_current_user(authorization)
        agent_system = ai_agent_module.get_agent_system()
        agents = agent_system.get_available_agents()
        return {"agents": agents}
    except Exception:
        return {"agents": []}


@app.post("/agent/ai/query")
def ai_query(request: HomeworkRequest, authorization: str = Header(None), 
             agent_name: Optional[str] = None):
    """
    Query a specific AI agent directly.
    
    Args:
        request: HomeworkRequest with message and topic
        authorization: JWT token
        agent_name: Specific agent to use (None for auto-select)
    
    Returns:
        AI agent response
    """
    try:
        user = get_current_user(authorization)
        agent_system = ai_agent_module.get_agent_system()
        
        # Build context-aware prompt
        prompt = f"""User: {user.name} (ID: {user.id})
Major: {user.major or 'Not specified'}
GPA: {user.gpa or 0.0}
Skills: {', '.join(user.skills or [])}

Topic: {request.topic}

Question: {request.message}

Please provide a helpful, detailed response."""
        
        response = agent_system.generate(
            prompt,
            agent_name=agent_name,
            temperature=0.7,
            max_tokens=2048,
            stream=False
        )
        
        return {"response": response, "agent": agent_name or "auto-selected"}
    except Exception as e:
        return {"response": f"Error: {str(e)}", "agent": None}


@app.get("/agent/attendance/stats")
def attendance_stats(authorization: str = Header(None)):
  user = get_current_user(authorization)
  data = attendance_agent.build_attendance_statistics(user)
  return data


@app.get("/agent/finance/insights")
def finance_insights(authorization: str = Header(None)):
  user = get_current_user(authorization)
  return finance_agent.build_finance_insights(user)


@app.get("/status")
def status():
  return {"status": "ok", "service": "college-portal-agent"}


@app.get("/control")
def control_panel():
  return {
    "status": "healthy",
    "model_endpoint": os.getenv("LOCAL_MODEL_ENDPOINT", "http://localhost:11434"),
    "server_host": API_BASE,
    "server_port": API_PORT,
    "endpoints": [
      "auth/google",
      "auth/github",
      "agent/chat/homework",
      "agent/jobs/recommend",
      "agent/attendance",
      "agent/finance",
      "agent/voice/command",
    ],
  }


@app.get("/mvp/dashboard")
def mvp_dashboard(authorization: str = Header(None)):
  user = get_current_user(authorization)
  _seed_mvp_assignments_if_missing(user.id)
  _seed_mvp_schedule_if_missing(user.id, user.name)
  payload = synthetic_data.build_dashboard_payload(user.id, user.name)
  session = SessionLocal()
  try:
    due_today = (
      session.query(MvpAssignment)
      .filter(MvpAssignment.user_id == user.id)
      .filter(MvpAssignment.status == "pending")
      .all()
    )
    today = datetime.utcnow().date()
    payload["stats"]["assignments_due_today"] = sum(1 for item in due_today if item.due_at.date() <= today)
  finally:
    session.close()
  return payload


@app.get("/mvp/schedule")
def mvp_schedule(authorization: str = Header(None)):
  user = get_current_user(authorization)
  _seed_mvp_schedule_if_missing(user.id, user.name)
  session = SessionLocal()
  try:
    rows = (
      session.query(MvpScheduleEvent)
      .filter(MvpScheduleEvent.user_id == user.id)
      .order_by(MvpScheduleEvent.date.asc(), MvpScheduleEvent.start_time.asc())
      .all()
    )
    grouped = {}
    for row in rows:
      key = (row.day, row.date)
      grouped.setdefault(key, [])
      grouped[key].append(
        {
          "id": row.id,
          "subject": row.subject,
          "start_time": row.start_time,
          "end_time": row.end_time,
          "room": row.room,
          "faculty": row.faculty,
          "status": row.status,
        }
      )
    week = [{"day": day, "date": date, "classes": classes} for (day, date), classes in grouped.items()]
    return {"week": week}
  finally:
    session.close()


@app.get("/mvp/assignments")
def mvp_assignments(authorization: str = Header(None)):
  user = get_current_user(authorization)
  _seed_mvp_assignments_if_missing(user.id)
  session = SessionLocal()
  try:
    rows = (
      session.query(MvpAssignment)
      .filter(MvpAssignment.user_id == user.id)
      .order_by(MvpAssignment.due_at.asc())
      .all()
    )
    return {
      "assignments": [
        {
          "id": row.id,
          "title": row.title,
          "subject": row.subject,
          "type": row.type,
          "priority": row.priority,
          "status": row.status,
          "due_at": row.due_at.isoformat(),
        }
        for row in rows
      ]
    }
  finally:
    session.close()


@app.post("/mvp/assignments")
def mvp_create_assignment(request: AssignmentCreateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  try:
    row = MvpAssignment(
      user_id=user.id,
      title=request.title,
      subject=request.subject,
      type=request.type,
      priority=request.priority,
      status="pending",
      due_at=datetime.fromisoformat(request.due_at),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": row.id}
  finally:
    session.close()


@app.patch("/mvp/assignments/{assignment_id}")
def mvp_update_assignment(assignment_id: int, request: AssignmentUpdateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  try:
    row = (
      session.query(MvpAssignment)
      .filter(MvpAssignment.user_id == user.id, MvpAssignment.id == assignment_id)
      .first()
    )
    if not row:
      raise HTTPException(status_code=404, detail="Assignment not found")
    if request.status is not None:
      row.status = request.status
    if request.priority is not None:
      row.priority = request.priority
    session.commit()
    return {"ok": True}
  finally:
    session.close()


@app.get("/mvp/placement")
def mvp_placement(authorization: str = Header(None)):
  user = get_current_user(authorization)
  _seed_mvp_placement_if_missing(user.id)
  session = SessionLocal()
  try:
    rows = (
      session.query(MvpPlacementApplication)
      .filter(MvpPlacementApplication.user_id == user.id)
      .order_by(MvpPlacementApplication.updated_at.desc())
      .all()
    )
    return {
      "applications": [
        {
          "id": row.id,
          "company": row.company,
          "role": row.role,
          "stage": row.stage,
          "updated_at": row.updated_at.isoformat(),
        }
        for row in rows
      ]
    }
  finally:
    session.close()


@app.post("/mvp/placement")
def mvp_create_placement(request: PlacementCreateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  try:
    row = MvpPlacementApplication(
      user_id=user.id,
      company=request.company,
      role=request.role,
      stage=request.stage,
      updated_at=datetime.utcnow(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": row.id}
  finally:
    session.close()


@app.patch("/mvp/placement/{application_id}")
def mvp_update_placement_stage(application_id: int, request: PlacementStageUpdateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  try:
    row = (
      session.query(MvpPlacementApplication)
      .filter(MvpPlacementApplication.user_id == user.id, MvpPlacementApplication.id == application_id)
      .first()
    )
    if not row:
      raise HTTPException(status_code=404, detail="Application not found")
    row.stage = request.stage
    row.updated_at = datetime.utcnow()
    session.commit()
    return {"ok": True}
  finally:
    session.close()


@app.get("/mvp/travel")
def mvp_travel(authorization: str = Header(None)):
  user = get_current_user(authorization)
  _seed_mvp_travel_if_missing(user.id)
  session = SessionLocal()
  try:
    rows = (
      session.query(MvpTravelRoute)
      .filter(MvpTravelRoute.user_id == user.id)
      .order_by(MvpTravelRoute.created_at.desc())
      .all()
    )
    return {
      "routes": [
        {
          "id": row.id,
          "mode": row.mode,
          "from": row.source,
          "to": row.destination,
          "eta_min": row.eta_min,
          "notes": row.notes,
        }
        for row in rows
      ]
    }
  finally:
    session.close()


@app.post("/mvp/travel")
def mvp_create_travel_route(request: TravelRouteCreateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  try:
    row = MvpTravelRoute(
      user_id=user.id,
      mode=request.mode,
      source=request.source,
      destination=request.destination,
      eta_min=request.eta_min,
      notes=request.notes,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": row.id}
  finally:
    session.close()


@app.post("/mvp/schedule")
def mvp_create_schedule_event(request: ScheduleEventCreateRequest, authorization: str = Header(None)):
  user = get_current_user(authorization)
  session = SessionLocal()
  try:
    row = MvpScheduleEvent(
      user_id=user.id,
      day=request.day,
      date=request.date,
      subject=request.subject,
      start_time=request.start_time,
      end_time=request.end_time,
      room=request.room,
      faculty=request.faculty,
      status="scheduled",
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": row.id}
  finally:
    session.close()
