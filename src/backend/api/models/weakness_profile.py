from __future__ import annotations

"""
models/weakness_profile.py — WeaknessProfile 테이블
PLAN.md Section 8-6 기준.
concept_key = "{era_tag}_{concept_tag}" 형식.
weakness_score = wrong_count / (wrong_count + correct_count).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Numeric, String
from api.database import Base


class WeaknessProfile(Base):
    __tablename__ = "weakness_profiles"

    id              = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id         = Column(String,  nullable=False)
    concept_key     = Column(String,  nullable=False)      # "조선후기_왕권강화"
    weakness_score  = Column(Numeric, nullable=False, default=0)
    wrong_count     = Column(Integer, nullable=False, default=0)
    correct_count   = Column(Integer, nullable=False, default=0)
    updated_at      = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
