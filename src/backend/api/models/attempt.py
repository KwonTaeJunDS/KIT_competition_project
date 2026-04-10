"""
models/attempt.py — Attempt 테이블
학생의 답안 제출 기록.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from api.database import Base


class Attempt(Base):
    __tablename__ = "attempts"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id        = Column(String, nullable=False)
    question_id    = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    student_answer = Column(String, nullable=False)   # "①"~"⑤"
    is_correct     = Column(Boolean, nullable=False)
    submitted_at   = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
