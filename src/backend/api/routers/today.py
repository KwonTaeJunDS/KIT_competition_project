from __future__ import annotations

"""Today dashboard aggregates."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.attempt import Attempt
from api.models.question import Question
from api.models.review_queue import ReviewQueue
from api.models.weakness_profile import WeaknessProfile
from api.schemas.today import TodayResponse

router = APIRouter()


@router.get("/today", response_model=dict)
def get_today(user_id: str | None = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    if user_id:
        review_count = db.execute(
            select(func.count(ReviewQueue.id)).where(
                ReviewQueue.user_id == user_id,
                ReviewQueue.status == "pending",
                ReviewQueue.due_at <= now,
            )
        ).scalar_one()

        attempted_subquery = (
            select(Attempt.id)
            .where(
                Attempt.user_id == user_id,
                Attempt.question_id == Question.id,
            )
            .exists()
        )
        new_count = db.execute(
            select(func.count(Question.id)).where(~attempted_subquery)
        ).scalar_one()

        weak_rows = db.execute(
            select(WeaknessProfile.concept_key)
            .where(
                WeaknessProfile.user_id == user_id,
                (WeaknessProfile.wrong_count + WeaknessProfile.correct_count) > 0,
            )
            .order_by(
                WeaknessProfile.weakness_score.desc(),
                WeaknessProfile.wrong_count.desc(),
                WeaknessProfile.updated_at.desc(),
                WeaknessProfile.concept_key.asc(),
            )
            .limit(10)
        ).scalars().all()
        weak_topics = _top_topic_labels(weak_rows, limit=3)
    else:
        review_count = 0
        new_count = db.execute(select(func.count(Question.id))).scalar_one()
        weak_topics = []

    return {
        "success": True,
        "data": TodayResponse(
            today_review_count=review_count,
            today_new_count=new_count,
            weak_topics=weak_topics,
        ).model_dump(),
    }


def _format_topic_label(concept_key: object) -> str:
    raw = str(concept_key or "").strip()
    if not raw:
        return ""

    if "_" not in raw:
        return raw

    era, concept = raw.split("_", 1)
    era = era.strip()
    concept = concept.strip()

    if not concept or concept == era:
        return era or concept
    if not era or era == "미분류":
        return concept
    return f"{era} {concept}"


def _top_topic_labels(keys: list[str], limit: int = 3) -> list[str]:
    topics: list[str] = []
    seen: set[str] = set()

    for key in keys:
        label = _format_topic_label(key)
        if not label or label in seen:
            continue
        topics.append(label)
        seen.add(label)
        if len(topics) >= limit:
            break

    return topics
