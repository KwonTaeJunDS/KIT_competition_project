"""
models/question.py — Question 테이블
seed.json 필드 구조를 그대로 따름.
"""
from sqlalchemy import JSON, Column, Integer, String, Text
from api.database import Base


class Question(Base):
    __tablename__ = "questions"

    id           = Column(String, primary_key=True)          # UUID (seed.json 기준)
    round        = Column(Integer, nullable=False)            # 회차 (71~77)
    q_num        = Column(Integer, nullable=False)            # 문항 번호
    subject      = Column(String, nullable=False, default="한국사")
    exam_type    = Column(String, nullable=False, default="심화")
    stem         = Column(Text,   nullable=False)             # 문제 본문
    choices      = Column(JSON,   nullable=False)             # {"①": "...", ...}
    score        = Column(Integer, nullable=False, default=1)
    answer       = Column(String, nullable=False)             # "①"~"⑤"
    answer_num   = Column(Integer, nullable=False)            # 1~5
    answer_text  = Column(Text,   nullable=False, default="")
    era_tags     = Column(JSON,   nullable=False, default=list)
    concept_tags = Column(JSON,   nullable=False, default=list)
    confusion_pairs = Column(JSON, nullable=True)
    explanation  = Column(Text,   nullable=False, default="")
    memory_hint  = Column(String, nullable=False, default="")
    source       = Column(String, nullable=False, default="")
