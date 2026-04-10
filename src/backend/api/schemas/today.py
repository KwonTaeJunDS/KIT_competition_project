"""
schemas/today.py — 오늘의 학습 홈 응답 스키마.
FRONTEND_BACKEND_CONTRACT Section 1 기준.
"""
from pydantic import BaseModel


class TodayResponse(BaseModel):
    today_review_count: int
    today_new_count:    int
    weak_topics:        list[str]
