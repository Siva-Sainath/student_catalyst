import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import (
  create_engine,
  Column,
  Integer,
  String,
  Float,
  JSON,
  DateTime,
  Text,
  Boolean,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from sqlalchemy import event

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./college_portal.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30})

# Enable WAL mode and normal synchronous mode for concurrent read/write support
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  oauth_id = Column(String, unique=True, index=True, nullable=False)
  email = Column(String, unique=True, index=True, nullable=False)
  name = Column(String, nullable=False)
  avatar_url = Column(String, nullable=True)
  major = Column(String, nullable=True)
  gpa = Column(Float, nullable=True, default=0.0)
  skills = Column(JSON, nullable=True, default=list)
  experience = Column(Text, nullable=True, default="")
  preferences = Column(JSON, nullable=True, default=dict)
  is_new = Column(Boolean, default=True)
  created_at = Column(DateTime, default=datetime.utcnow)
  last_login = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
  __tablename__ = "chat_messages"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False)
  topic = Column(String, nullable=True)
  user_message = Column(Text, nullable=False)
  ai_response = Column(Text, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow)


class JobApplication(Base):
  __tablename__ = "job_applications"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False)
  job_id = Column(String, nullable=False)
  status = Column(String, default="interested")
  created_at = Column(DateTime, default=datetime.utcnow)


class AttendanceRecord(Base):
  __tablename__ = "attendance_records"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False)
  course = Column(String, nullable=False)
  date = Column(DateTime, nullable=False)
  status = Column(String, nullable=False)


class TransactionRecord(Base):
  __tablename__ = "transactions"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False)
  category = Column(String, nullable=False)
  amount = Column(Float, nullable=False)
  date = Column(DateTime, default=datetime.utcnow)
  description = Column(String, nullable=True)


class MvpScheduleEvent(Base):
  __tablename__ = "mvp_schedule_events"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False, index=True)
  day = Column(String, nullable=False)
  date = Column(String, nullable=False)
  subject = Column(String, nullable=False)
  start_time = Column(String, nullable=False)
  end_time = Column(String, nullable=False)
  room = Column(String, nullable=True, default="")
  faculty = Column(String, nullable=True, default="")
  status = Column(String, nullable=False, default="scheduled")


class MvpAssignment(Base):
  __tablename__ = "mvp_assignments"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False, index=True)
  title = Column(String, nullable=False)
  subject = Column(String, nullable=False, default="General")
  type = Column(String, nullable=False, default="task")
  priority = Column(String, nullable=False, default="medium")
  status = Column(String, nullable=False, default="pending")
  due_at = Column(DateTime, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow)


class MvpPlacementApplication(Base):
  __tablename__ = "mvp_placement_applications"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False, index=True)
  company = Column(String, nullable=False)
  role = Column(String, nullable=False)
  stage = Column(String, nullable=False, default="Applied")
  updated_at = Column(DateTime, default=datetime.utcnow)


class MvpTravelRoute(Base):
  __tablename__ = "mvp_travel_routes"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False, index=True)
  mode = Column(String, nullable=False)
  source = Column(String, nullable=False)
  destination = Column(String, nullable=False)
  eta_min = Column(Integer, nullable=False, default=20)
  notes = Column(String, nullable=True, default="")
  created_at = Column(DateTime, default=datetime.utcnow)


class MvpCourseAttendance(Base):
  __tablename__ = "mvp_course_attendance"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, nullable=False, index=True)
  subject = Column(String, nullable=False)
  code = Column(String, nullable=False)
  professor = Column(String, nullable=False)
  attended = Column(Integer, nullable=False)
  total = Column(Integer, nullable=False)


def init_db() -> None:
  Base.metadata.create_all(bind=engine)
