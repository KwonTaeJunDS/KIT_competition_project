from __future__ import annotations

"""
services/review_scheduler.py — 복습 간격 계산 + 큐 항목 생성

복습 간격 규칙 (PLAN.md / FRONTEND_BACKEND_CONTRACT.md):
  review_count 기준으로 다음 due_at을 계산한다.
  review_count는 complete() 호출 시 1씩 증가.

  현재 count → 다음 간격
  0 (초기 생성)    → 1일 후
  1               → 1일 후
  2               → 3일 후
  3 이상           → 7일 후
  정답             → status="done"
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from api.models.review_queue import ReviewQueue

_INTERVALS = {
    0: timedelta(days=1),
    1: timedelta(days=1),
    2: timedelta(days=3),
}
_DEFAULT_INTERVAL = timedelta(days=7)


def _interval(review_count: int) -> timedelta:
    return _INTERVALS.get(review_count, _DEFAULT_INTERVAL)


def create_review_queue(
    db:            Session,
    user_id:       str,
    error_note_id: str,
) -> ReviewQueue:
    """
    오답노트 생성 직후 호출. review_count=0으로 시작, due_at=1일 후.
    db.flush()는 호출자(nested transaction 안)에서 처리.
    """
    due_at = datetime.now(timezone.utc) + _interval(0)
    entry = ReviewQueue(
        id            = str(uuid.uuid4()),
        user_id       = user_id,
        error_note_id = error_note_id,
        due_at        = due_at,
        status        = "pending",
        review_count  = 0,
    )
    db.add(entry)
    return entry


def apply_review_result(
    queue:      ReviewQueue,
    is_correct: bool,
) -> datetime | None:
    """
    복습 완료 처리. queue 객체를 직접 변경 후 next_due_at을 반환.
    정답이면 status='done', next_due_at=None.
    오답이면 status='pending', review_count+1, next_due_at=계산값.
    """
    queue.review_count += 1

    if is_correct:
        queue.status = "done"
        return None

    next_due = datetime.now(timezone.utc) + _interval(queue.review_count)
    queue.due_at = next_due
    queue.status = "pending"
    return next_due
