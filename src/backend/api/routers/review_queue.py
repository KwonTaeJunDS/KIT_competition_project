from __future__ import annotations

"""Review queue due list and completion APIs."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.error_note import ErrorNote
from api.models.question import Question
from api.models.review_queue import ReviewQueue
from api.schemas.review_queue import (
    CompleteRequest,
    CompleteResponse,
    ReviewQueueItem,
    ReviewQueueListResponse,
)
from api.services.review_scheduler import apply_review_result
from api.services.weakness_updater import update_weakness

router = APIRouter()
_DATE_FMT = "%Y-%m-%dT%H:%M:%SZ"


def _to_utc_z(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    utc = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    return utc.strftime(_DATE_FMT)


@router.get("/review-queue", response_model=dict)
def list_review_queue(
    user_id: str,
    include_all: bool = False,
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    stmt = (
        select(ReviewQueue, ErrorNote, Question)
        .join(ErrorNote, ReviewQueue.error_note_id == ErrorNote.id)
        .join(Question, ErrorNote.question_id == Question.id)
        .where(
            ReviewQueue.user_id == user_id,
            ReviewQueue.status == "pending",
        )
    )

    if not include_all:
        stmt = stmt.where(ReviewQueue.due_at <= now)

    stmt = stmt.order_by(ReviewQueue.due_at.asc(), ReviewQueue.created_at.asc())

    rows = db.execute(stmt).all()
    items = [
        ReviewQueueItem(
            queue_id=q.id,
            note_id=q.error_note_id,
            question_id=note.question_id,
            question_stem=question.stem or "",
            error_type=note.error_type,
            memory_hint=note.memory_hint or question.memory_hint or "",
            review_count=q.review_count,
            due_at=_to_utc_z(q.due_at) or "",
        )
        for q, note, question in rows
    ]

    return {
        "success": True,
        "data": ReviewQueueListResponse(
            due_count=len(items),
            items=items,
        ).model_dump(),
    }


@router.post("/review-queue/{queue_id}/complete", response_model=dict)
def complete_review(
    queue_id: str,
    body: CompleteRequest,
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stmt = select(ReviewQueue).where(
        ReviewQueue.id == queue_id,
        ReviewQueue.user_id == body.user_id,
    )
    queue = db.execute(stmt).scalar_one_or_none()

    if not queue:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "QUEUE_ITEM_NOT_FOUND",
                    "message": "복습 큐 항목을 찾을 수 없습니다.",
                },
            },
        )

    if queue.status == "done":
        raise HTTPException(
            status_code=409,
            detail={
                "success": False,
                "error": {
                    "code": "ALREADY_COMPLETED",
                    "message": "이미 완료 처리된 항목입니다.",
                },
            },
        )

    next_due = apply_review_result(queue, body.is_correct)

    note_stmt = (
        select(ErrorNote, Question)
        .join(Question, ErrorNote.question_id == Question.id)
        .where(ErrorNote.id == queue.error_note_id)
    )
    note_row = db.execute(note_stmt).first()
    if note_row:
        note, question = note_row
        update_weakness(
            db=db,
            user_id=body.user_id,
            era_tags=question.era_tags or [],
            concept_tags=question.concept_tags or [],
            is_correct=body.is_correct,
        )

    db.commit()

    return {
        "success": True,
        "data": CompleteResponse(
            queue_id=queue.id,
            next_due_at=_to_utc_z(next_due),
            review_count=queue.review_count,
            status=queue.status,
        ).model_dump(),
    }
