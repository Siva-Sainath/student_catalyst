from models import SessionLocal, ChatMessage, User
from agents.hermes_harness import stream as harness_stream, task_for_text


def build_homework_prompt(user: User, message: str, topic: str) -> str:
  return (
    f"You are a college homework tutor for a student majoring in {user.major or 'Computer Science'}. "
    f"The user has a GPA of {user.gpa or 0.0} and skills: {', '.join(user.skills or [])}. "
    f"Answer the following question in a step-by-step teaching style, help the student understand. "
    f"Do not simply give the answer; explain the reasoning clearly. "
    f"Question topic: {topic}. "
    f"Question: {message}\n"
  )


def stream_homework_response(user: User, message: str, topic: str):
  prompt = build_homework_prompt(user, message, topic)
  task = task_for_text(message, topic)
  for token in harness_stream(prompt, task=task, text_hint=f"{topic} {message}", temperature=0.35, max_tokens=600):
    yield token


def save_chat_message(user_id: int, topic: str, user_message: str, ai_response: str) -> None:
  session = SessionLocal()
  chat = ChatMessage(
    user_id=user_id,
    topic=topic,
    user_message=user_message,
    ai_response=ai_response,
  )
  session.add(chat)
  session.commit()
  session.close()


def load_chat_history(user_id: int, limit: int = 20):
  session = SessionLocal()
  rows = (
    session.query(ChatMessage)
    .filter(ChatMessage.user_id == user_id)
    .order_by(ChatMessage.created_at.desc())
    .limit(limit)
    .all()
  )
  history = [
    {
      "id": row.id,
      "topic": row.topic,
      "user_message": row.user_message,
      "ai_response": row.ai_response,
      "created_at": row.created_at.isoformat(),
    }
    for row in rows
  ]
  session.close()
  return history
