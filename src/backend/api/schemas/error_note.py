from __future__ import annotations

"""
schemas/error_note.py — 오답노트 응답 스키마
FRONTEND_BACKEND_CONTRACT.md Section 5 기준.
"""

from pydantic import BaseModel


class ErrorNoteItem(BaseModel):
    """GET /error-notes 목록 아이템 + GET /error-notes/{id} 상세 공용."""

    id:            str
    question_id:   str
    question_stem: str
    my_answer:     str            # 학생 오답 ("①"~"⑤")
    correct_answer: str           # 정답 ("①"~"⑤")
    error_type:    str
    # Contract Section 5: 항상 string (빈 문자열 허용, null 미허용)
    # _build_item fallback 체인이 항상 str을 보장한다
    why_wrong:     str
    correct_fact:  str
    memory_hint:   str
    review_front:  str
    review_back:   str
    era_tags:      list[str]
    created_at:    str            # ISO 8601 (UTC, Z suffix)


class ErrorNoteListResponse(BaseModel):
    total_count: int
    notes:       list[ErrorNoteItem]
