"""
models/error_note.py — ErrorNote 테이블
오답 발생 시 자동 생성되는 오답노트.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from api.database import Base


class ErrorNote(Base):
    __tablename__ = "error_notes"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id   = Column(String, ForeignKey("attempts.id",  ondelete="CASCADE"), nullable=False)
    user_id      = Column(String, nullable=False)
    question_id  = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    error_type   = Column(String, nullable=False)
    wrong_units  = Column(JSON,   nullable=True)   # list[str]
    why_wrong    = Column(Text,   nullable=True)
    correct_fact = Column(Text,   nullable=True)
    review_front = Column(Text,   nullable=True)
    review_back  = Column(Text,   nullable=True)
    memory_hint  = Column(String, nullable=True)
    created_at   = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
