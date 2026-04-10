"""
schemas/attempt.py — 답안 제출 요청/응답 스키마.
FRONTEND_BACKEND_CONTRACT Section 4 기준.
"""
from pydantic import BaseModel


class AttemptRequest(BaseModel):
    user_id:        str
    question_id:    str
    student_answer: str   # "①"~"⑤"


class AttemptResponse(BaseModel):
    is_correct:          bool
    correct_answer:      str           # "①"~"⑤"
    answer_text:         str
    explanation_summary: str
    error_type:          str | None
    wrong_units:         list[str]
    why_wrong:           str | None
    correct_fact:        str
    memory_hint:         str
    note_saved:          bool
    note_id:             str | None
