import os
import jwt
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from models import SessionLocal, User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60 * 24 * 7


def create_access_token(user_id: int) -> str:
  payload = {
    "user_id": user_id,
    "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES),
    "iat": datetime.utcnow(),
  }
  return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
  try:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
  except jwt.ExpiredSignatureError:
    raise ValueError("Token expired")
  except jwt.InvalidTokenError as exc:
    raise ValueError(f"Invalid token: {exc}")


def get_google_user_info(id_token_str: str) -> dict:
  try:
    request = google_requests.Request()
    info = id_token.verify_oauth2_token(id_token_str, request)
    return {
      "oauth_id": info.get("sub"),
      "email": info.get("email"),
      "name": info.get("name"),
      "avatar_url": info.get("picture"),
    }
  except Exception as exc:
    raise ValueError(f"Invalid Google token: {exc}")


def get_github_user_info(access_token: str) -> dict:
  url = "https://api.github.com/user"
  response = requests.get(url, headers={"Authorization": f"Bearer {access_token}"})
  if response.status_code != 200:
    raise ValueError("Invalid GitHub token")
  data = response.json()
  return {
    "oauth_id": str(data.get("id")),
    "email": data.get("email") or "",
    "name": data.get("name") or data.get("login") or "GitHub User",
    "avatar_url": data.get("avatar_url"),
  }


def login_or_create_user(user_info: dict) -> dict:
  session = SessionLocal()
  oauth_id = user_info["oauth_id"]
  user = session.query(User).filter(User.oauth_id == oauth_id).first()

  if user is None:
    user = User(
      oauth_id=oauth_id,
      email=user_info.get("email") or "",
      name=user_info.get("name") or "Student",
      avatar_url=user_info.get("avatar_url"),
      major="Undeclared",
      gpa=0.0,
      skills=[],
      experience="",
      preferences={"dark_mode": True, "notifications": True},
      is_new=True,
    )
    session.add(user)
  else:
    user.email = user_info.get("email") or user.email
    user.name = user_info.get("name") or user.name
    user.avatar_url = user_info.get("avatar_url") or user.avatar_url
    user.last_login = datetime.utcnow()

  session.commit()
  session.refresh(user)
  session.close()

  token = create_access_token(user.id)
  return {
    "access_token": token,
    "token_type": "bearer",
    "user": {
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
    },
  }
