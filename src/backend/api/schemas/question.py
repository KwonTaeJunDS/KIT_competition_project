"""
schemas/question.py — FRONTEND_BACKEND_CONTRACT 기준 Question 응답 스키마.
⚠️ answer 필드는 절대 포함하지 않는다.
"""
from typing import Any
from pydantic import BaseModel


class ChoiceItem(BaseModel):
    key: str   # "①"~"⑤"
    text: str


class QuestionListItem(BaseModel):
    id:           str
    round:        int
    q_num:        int
    stem:         str
    era_tags:     list[str]
    concept_tags: list[str]
    score:        int
    difficulty:   None = None   # Phase 2에서는 미사용


class QuestionDetail(BaseModel):
    id:           str
    round:        int
    q_num:        int
    stem:         str
    choices:      list[ChoiceItem]
    score:        int
    era_tags:     list[str]
    concept_tags: list[str]
    source:       str


class QuestionListResponse(BaseModel):
    total_count: int
    questions:   list[QuestionListItem]
