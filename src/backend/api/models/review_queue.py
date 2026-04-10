from __future__ import annotations

"""
models/review_queue.py — ReviewQueue 테이블
PLAN.md Section 8-5 기준.
오답노트 1개당 복습 큐 1개 생성. due_at 도달 시 복습 대상으로 노출.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from api.database import Base


class ReviewQueue(Base):
    __tablename__ = "review_queue"

    id            = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String,  nullable=False)
    error_note_id = Column(String,  ForeignKey("error_notes.id", ondelete="CASCADE"), nullable=False)
    due_at        = Column(DateTime, nullable=False)
    # pending: 복습 대기 중 / done: 정답 처리 후 비활성
    status        = Column(String,  nullable=False, default="pending")
    review_count  = Column(Integer, nullable=False, default=0)
    created_at    = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
