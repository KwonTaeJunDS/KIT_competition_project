from __future__ import annotations

"""
schemas/review_queue.py
FRONTEND_BACKEND_CONTRACT.md Section 6, 7 기준.
"""

from pydantic import BaseModel


class ReviewQueueItem(BaseModel):
    queue_id:      str
    note_id:       str
    question_id:   str
    question_stem: str
    error_type:    str
    memory_hint:   str
    review_count:  int
    due_at:        str          # ISO 8601 (UTC, Z suffix)


class ReviewQueueListResponse(BaseModel):
    due_count: int
    items:     list[ReviewQueueItem]


class CompleteRequest(BaseModel):
    user_id:    str
    is_correct: bool


class CompleteResponse(BaseModel):
    queue_id:     str
    next_due_at:  str | None    # 정답 시 None (status=done)
    review_count: int
    status:       str           # "pending" | "done"
