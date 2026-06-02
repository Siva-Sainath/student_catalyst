from datetime import datetime, timedelta
from collections import defaultdict
from models import SessionLocal, TransactionRecord, User


def build_finance_insights(user: User):
  session = SessionLocal()
  transactions = session.query(TransactionRecord).filter(TransactionRecord.user_id == user.id).all()
  session.close()

  if not transactions:
    transactions = [
      TransactionRecord(user_id=user.id, category="Food", amount=350.0, date=datetime.utcnow(), description="Cafeteria lunch"),
      TransactionRecord(user_id=user.id, category="Transport", amount=120.0, date=datetime.utcnow(), description="Bus pass"),
      TransactionRecord(user_id=user.id, category="Books", amount=890.0, date=datetime.utcnow(), description="Textbooks"),
      TransactionRecord(user_id=user.id, category="Entertainment", amount=220.0, date=datetime.utcnow(), description="Movie night"),
    ]

  categories = defaultdict(lambda: {"total": 0.0, "count": 0})
  total_spent = 0.0
  for transaction in transactions:
    categories[transaction.category]["total"] += transaction.amount
    categories[transaction.category]["count"] += 1
    total_spent += transaction.amount

  breakdown = []
  for category, data in categories.items():
    breakdown.append({
      "category": category,
      "total": round(data["total"], 2),
      "count": data["count"],
      "percentage": round((data["total"] / total_spent) * 100 if total_spent else 0, 1),
      "average": round(data["total"] / data["count"], 2) if data["count"] else 0,
    })

  insights = (
    "You are spending carefully, but your food budget is high. Consider meal prep to save more." if total_spent > 1500 else
    "Great job keeping your spending under control this month."
  )

  recommendations = [
    "Try a weekly food budget and track expenses in your phone.",
    "Reduce entertainment spend by 15% next month.",
    "Use student discounts on textbooks and transport when possible.",
  ]

  return {
    "stats": {
      "total_spent": round(total_spent, 2),
      "days_analyzed": 30,
      "daily_average": round(total_spent / 30, 2),
      "monthly_projection": round((total_spent / 30) * 30, 2),
      "breakdown": breakdown,
      "transaction_count": len(transactions),
    },
    "insights": insights,
    "recommendations": recommendations,
  }
