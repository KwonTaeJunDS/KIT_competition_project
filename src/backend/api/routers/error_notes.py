from __future__ import annotations

"""Error note list/detail APIs."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.attempt import Attempt
from api.models.error_note import ErrorNote
from api.models.question import Question
from api.schemas.error_note import ErrorNoteItem, ErrorNoteListResponse

router = APIRouter()


def _build_item(note: ErrorNote, attempt: Attempt, question: Question) -> ErrorNoteItem:
    return ErrorNoteItem(
        id=note.id,
        question_id=note.question_id,
        question_stem=question.stem or "",
        my_answer=attempt.student_answer or "",
        correct_answer=question.answer or "",
        error_type=note.error_type,
        why_wrong=note.why_wrong or "",
        correct_fact=note.correct_fact or question.answer_text or question.explanation or "",
        memory_hint=note.memory_hint or question.memory_hint or "",
        review_front=note.review_front or _build_review_front(question),
        review_back=note.review_back or question.answer_text or question.explanation or "",
        era_tags=_normalize_era_tags(question.era_tags),
        created_at=_to_utc_iso(note.created_at),
    )


def _base_stmt(user_id: str):
    return (
        select(ErrorNote, Attempt, Question)
        .join(Attempt, ErrorNote.attempt_id == Attempt.id)
        .join(Question, ErrorNote.question_id == Question.id)
        .where(ErrorNote.user_id == user_id)
        .order_by(ErrorNote.created_at.desc())
    )


@router.get("/error-notes", response_model=dict)
def list_error_notes(
    user_id: str,
    era: str | None = None,
    error_type: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = _base_stmt(user_id)

    normalized_era = _clean_text(era)
    if normalized_era:
        stmt = stmt.where(func.lower(Question.era_tags.cast(str)).contains(normalized_era.lower()))

    normalized_error_type = _clean_text(error_type)
    if normalized_error_type:
        stmt = stmt.where(func.lower(ErrorNote.error_type) == normalized_error_type.lower())

    rows = db.execute(stmt).all()
    items = [_build_item(note, attempt, question) for note, attempt, question in rows]

    return {
        "success": True,
        "data": ErrorNoteListResponse(
            total_count=len(items),
            notes=items,
        ).model_dump(),
    }


@router.get("/error-notes/{note_id}", response_model=dict)
def get_error_note(note_id: str, user_id: str, db: Session = Depends(get_db)):
    stmt = _base_stmt(user_id).where(ErrorNote.id == note_id)
    row = db.execute(stmt).first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "NOTE_NOT_FOUND",
                    "message": "해당 오답 노트를 찾을 수 없습니다.",
                },
            },
        )

    note, attempt, question = row
    return {
        "success": True,
        "data": _build_item(note, attempt, question).model_dump(),
    }


def _normalize_era_tags(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(tag).strip() for tag in value if str(tag).strip()]


def _build_review_front(question: Question) -> str:
    stem = _clean_text(question.stem)
    if not stem:
        return ""
    return f"{stem[:60].strip()}..." if len(stem) > 60 else stem


def _to_utc_iso(value) -> str:
    if value is None:
        return ""
    iso = value.isoformat()
    if iso.endswith("+00:00"):
        return iso[:-6] + "Z"
    return iso + ("Z" if "T" in iso and not iso.endswith("Z") and "+" not in iso else "")


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()
